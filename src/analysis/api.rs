use super::response::Decision;
use super::response::Sample;
use crate::cards::isomorphism::Isomorphism;
use crate::cards::observation::Observation;
use crate::cards::street::Street;
use crate::clustering::equity::Equity;
use crate::clustering::histogram::Histogram;
use crate::clustering::metric::Metric;
use crate::clustering::pair::Pair;
use crate::clustering::sinkhorn::Sinkhorn;
use crate::gameplay::abstraction::Abstraction;
use crate::gameplay::path::Path;
use crate::gameplay::recall::Recall;
use crate::transport::coupling::Coupling;
use crate::transport::measure::Measure;
use crate::Energy;
use crate::Probability;
use std::collections::BTreeMap;
use std::collections::HashSet;
use std::sync::Arc;
use tokio_postgres::Client;
use tokio_postgres::Error as E;

pub struct API(Arc<Client>);

impl From<Arc<Client>> for API {
    fn from(client: Arc<Client>) -> Self {
        Self(client)
    }
}

// constructor
impl API {
    pub async fn new() -> Self {
        Self(crate::db().await)
    }
}

// global lookups
impl API {
    /// a river observation's bucket, without touching the database.
    ///
    /// the isomorphism table holds no river rows: all 7.7M of them are an equity bucketing
    /// that Lookup::grow computes from obs.equity(), so uploading them would only cache a
    /// pure function — and at 200MB against a 500MB tier there is no room to. every river
    /// query therefore has to derive what the other streets look up, exactly as the trainer
    /// did, or it reads zero rows and query_one turns an absence into a 500.
    fn river_abs(obs: Observation) -> Abstraction {
        Abstraction::from(Isomorphism::from(obs).0.equity())
    }

    /// an arbitrary river observation in a given bucket.
    ///
    /// the table-backed streets pick a sample by `position`; on the river we have to search
    /// for one. rejection sampling is viable only because the bucketing is coarse (16 demo
    /// buckets, the rarest still ~3% of the space) and equity() is ~17us — a few hundred
    /// draws in the tail. the cap keeps a bucket that is somehow unreachable from hanging a
    /// worker forever, at the cost of returning a near-miss instead.
    fn river_obs(abs: Abstraction) -> Observation {
        const ATTEMPTS: usize = 20_000;
        let mut nearest = Observation::from(Street::Rive);
        let mut best = Energy::INFINITY;
        for _ in 0..ATTEMPTS {
            let obs = Observation::from(Street::Rive);
            let candidate = Self::river_abs(obs);
            if candidate == abs {
                return obs;
            }
            // fall back on whichever bucket sits closest in equity, so a caller still gets a
            // representative hand rather than an error
            let dx = (Probability::from(candidate) - Probability::from(abs)).abs();
            if dx < best {
                best = dx;
                nearest = obs;
            }
        }
        nearest
    }

    /// a Sample for a river bucket, given a representative hand and a distance.
    ///
    /// every river route needs this same rescue: the obs and the distance can't come from a
    /// join, but the bucket's own stats still live in `abstraction`, which stays the source
    /// of truth for population rather than recomputing a count we already know.
    async fn river_sample(
        &self,
        abs: Abstraction,
        obs: Observation,
        distance: Energy,
    ) -> Result<Sample, E> {
        const SQL: &'static str = r#"
            SELECT equity, population, centrality
            FROM abstraction
            WHERE abs = $1;
        "#;
        let key = i64::from(abs);
        let row = self.0.query_one(SQL, &[&key]).await?;
        let population = row.get::<_, i32>(1) as f32;
        Ok(Sample {
            obs: obs.equivalent(),
            abs: abs.to_string(),
            equity: row.get::<_, f32>(0),
            density: population / Street::Rive.n_isomorphisms() as f32,
            distance,
        })
    }

    pub async fn obs_to_abs(&self, obs: Observation) -> Result<Abstraction, E> {
        if obs.street() == Street::Rive {
            return Ok(Self::river_abs(obs));
        }
        let iso = i64::from(Isomorphism::from(obs));
        const SQL: &'static str = r#"
            SELECT abs
            FROM isomorphism
            WHERE obs = $1
        "#;
        Ok(self
            .0
            .query_one(SQL, &[&iso])
            .await?
            .get::<_, i64>(0)
            .into())
    }
    pub async fn metric(&self, street: Street) -> Result<Metric, E> {
        // river pairs are absent from the table by design (Metric::distance measures them with
        // Equity instead of a lookup), so a river Metric has to be built rather than read. an
        // empty one would make Sinkhorn treat every bucket as equidistant.
        if street == Street::Rive {
            let all = Abstraction::all(Street::Rive);
            return Ok(all
                .iter()
                .flat_map(|x| all.iter().map(move |y| (x, y)))
                .filter(|(x, y)| x != y)
                .map(|(x, y)| (Pair::from((x, y)), Equity.distance(x, y)))
                .collect::<BTreeMap<Pair, Energy>>()
                .into());
        }
        let street = street as i16;
        const SQL: &'static str = r#"
            SELECT
                a1.abs # a2.abs AS xor,
                m.dx            AS dx
            FROM abstraction a1
            JOIN abstraction a2
                ON a1.street = a2.street
            JOIN metric m
                ON (a1.abs # a2.abs) = m.xor
            WHERE
                a1.street   = $1 AND
                a1.abs     != a2.abs;
        "#;
        Ok(self
            .0
            .query(SQL, &[&street])
            .await?
            .iter()
            .map(|row| (row.get::<_, i64>(0), row.get::<_, Energy>(1)))
            .map(|(xor, distance)| (Pair::from(xor), distance))
            .collect::<BTreeMap<Pair, Energy>>()
            .into())
    }
    pub async fn basis(&self, street: Street) -> Result<Vec<Abstraction>, E> {
        let street = street as i16;
        const SQL: &'static str = r#"
            SELECT a2.abs
            FROM abstraction a2
            JOIN abstraction a1 ON a2.street = a1.street
            WHERE a1.abs = $1;
        "#;
        Ok(self
            .0
            .query(SQL, &[&street])
            .await?
            .iter()
            .map(|row| row.get::<_, i64>(0))
            .map(Abstraction::from)
            .collect())
    }
}

// equity calculations
impl API {
    pub async fn abs_equity(&self, abs: Abstraction) -> Result<Probability, E> {
        let iso = i64::from(abs);
        const SQL: &'static str = r#"
            SELECT equity
            FROM abstraction
            WHERE abs = $1
        "#;
        Ok(self
            .0
            .query_one(SQL, &[&iso])
            .await?
            .get::<_, f32>(0)
            .into())
    }
    pub async fn obs_equity(&self, obs: Observation) -> Result<Probability, E> {
        // a river hand's equity is exactly what defines its bucket, and `isomorphism` has
        // neither the row nor an equity column to read it from.
        if obs.street() == Street::Rive {
            return Ok(Isomorphism::from(obs).0.equity());
        }
        let iso = i64::from(Isomorphism::from(obs));
        const SQL: &'static str = r#"
            SELECT SUM(t.dx * a.equity)
            FROM transitions t
            JOIN isomorphism     e ON e.abs = t.prev
            JOIN abstraction a ON a.abs = t.next
            WHERE e.obs = $1
        "#;
        Ok(self
            .0
            .query_one(SQL, &[&iso])
            .await?
            .get::<_, f32>(0)
            .into())
    }
}

// distance calculations
impl API {
    pub async fn abs_distance(&self, abs1: Abstraction, abs2: Abstraction) -> Result<Energy, E> {
        if abs1.street() != abs2.street() {
            return Err(E::__private_api_timeout());
        }
        if abs1 == abs2 {
            return Ok(0 as Energy);
        }
        // Metric::distance switches on the variant: river buckets use the Equity measure,
        // so no river pair was ever written to the table. computing it matches what the
        // trainer would have measured.
        if abs1.street() == Street::Rive {
            return Ok(Equity.distance(&abs1, &abs2));
        }
        let xor = i64::from(Pair::from((&abs1, &abs2)));
        const SQL: &'static str = r#"
            SELECT m.dx
            FROM metric m
            WHERE $1 = m.xor;
        "#;
        Ok(self.0.query_one(SQL, &[&xor]).await?.get::<_, Energy>(0))
    }
    pub async fn obs_distance(&self, obs1: Observation, obs2: Observation) -> Result<Energy, E> {
        if obs1.street() != obs2.street() {
            return Err(E::__private_api_timeout());
        }
        let (ref hx, ref hy, ref metric) = tokio::try_join!(
            self.obs_histogram(obs1),
            self.obs_histogram(obs2),
            self.metric(obs1.street().next())
        )?;
        Ok(Sinkhorn::from((hx, hy, metric)).minimize().cost())
    }
}

// population lookups
impl API {
    pub async fn abs_population(&self, abs: Abstraction) -> Result<usize, E> {
        let abs = i64::from(abs);
        const SQL: &'static str = r#"
            SELECT population
            FROM abstraction
            WHERE abs = $1
        "#;
        Ok(self.0.query_one(SQL, &[&abs]).await?.get::<_, i32>(0) as usize)
    }
    pub async fn obs_population(&self, obs: Observation) -> Result<usize, E> {
        if obs.street() == Street::Rive {
            return self.abs_population(Self::river_abs(obs)).await;
        }
        let iso = i64::from(Isomorphism::from(obs));
        const SQL: &'static str = r#"
            SELECT population
            FROM abstraction
            JOIN isomorphism ON isomorphism.abs = abstraction.abs
            WHERE obs = $1
        "#;
        Ok(self.0.query_one(SQL, &[&iso]).await?.get::<_, i32>(0) as usize)
    }
}

// centrality (mean distance) lookups
impl API {
    pub async fn abs_centrality(&self, abs: Abstraction) -> Result<Probability, E> {
        let abs = i64::from(abs);
        const SQL: &'static str = r#"
            SELECT centrality
            FROM abstraction
            WHERE abs = $1
        "#;
        Ok(self
            .0
            .query_one(SQL, &[&abs])
            .await?
            .get::<_, f32>(0)
            .into())
    }
    pub async fn obs_centrality(&self, obs: Observation) -> Result<Probability, E> {
        if obs.street() == Street::Rive {
            return self.abs_centrality(Self::river_abs(obs)).await;
        }
        let iso = i64::from(Isomorphism::from(obs));
        const SQL: &'static str = r#"
            SELECT centrality
            FROM abstraction
            JOIN isomorphism ON isomorphism.abs = abstraction.abs
            WHERE obs = $1
        "#;
        Ok(self
            .0
            .query_one(SQL, &[&iso])
            .await?
            .get::<_, f32>(0)
            .into())
    }
}

// histogram aggregation via join
impl API {
    pub async fn abs_histogram(&self, abs: Abstraction) -> Result<Histogram, E> {
        let idx = i64::from(abs);
        let mass = abs.street().n_children() as f32;
        const SQL: &'static str = r#"
            SELECT next, dx
            FROM transitions
            WHERE prev = $1
        "#;
        Ok(self
            .0
            .query(SQL, &[&idx])
            .await?
            .iter()
            .map(|row| (row.get::<_, i64>(0), row.get::<_, Energy>(1)))
            .map(|(next, dx)| (next, (dx * mass).round() as usize))
            .map(|(next, dx)| (Abstraction::from(next), dx))
            .fold(Histogram::default(), |mut h, (next, dx)| {
                h.set(next, dx);
                h
            }))
    }
    pub async fn obs_histogram(&self, obs: Observation) -> Result<Histogram, E> {
        // a river observation has no successor street to distribute over — n_children()
        // panics on it. no HTTP route reaches this; the CLI is the only caller.
        assert!(obs.street() != Street::Rive, "river has no successor street");
        // Kd8s~6dJsAc
        let idx = i64::from(Isomorphism::from(obs));
        let mass = obs.street().n_children() as f32;
        const SQL: &'static str = r#"
            SELECT next, dx
            FROM transitions
            JOIN isomorphism ON isomorphism.abs = transitions.prev
            WHERE isomorphism.obs = $1
        "#;
        Ok(self
            .0
            .query(SQL, &[&idx])
            .await?
            .iter()
            .map(|row| (row.get::<_, i64>(0), row.get::<_, Energy>(1)))
            .map(|(next, dx)| (next, (dx * mass).round() as usize))
            .map(|(next, dx)| (Abstraction::from(next), dx))
            .fold(Histogram::default(), |mut h, (next, dx)| {
                h.set(next, dx);
                h
            }))
    }
}

// observation similarity lookups
impl API {
    pub async fn obs_similar(&self, obs: Observation) -> Result<Vec<Observation>, E> {
        if obs.street() == Street::Rive {
            return self.abs_similar(Self::river_abs(obs)).await;
        }
        let iso = i64::from(Isomorphism::from(obs));
        const SQL: &'static str = r#"
            WITH target AS (
                SELECT abs, population
                FROM isomorphism e
                JOIN abstraction a ON e.abs = a.abs
                WHERE obs = $1
            )
            SELECT e.obs
            FROM isomorphism e
            JOIN target t ON e.abs = t.abs
            WHERE e.obs != $1
                AND e.position < LEAST(5, t.population)  -- Sample from available positions
                AND e.position >= FLOOR(RANDOM() * GREATEST(t.population - 5, 1))  -- Random starting point
            LIMIT 5;
        "#;
        Ok(self
            .0
            .query(SQL, &[&iso])
            .await?
            .iter()
            .map(|row| row.get::<_, i64>(0))
            .map(Observation::from)
            .collect())
    }
    pub async fn abs_similar(&self, abs: Abstraction) -> Result<Vec<Observation>, E> {
        if abs.street() == Street::Rive {
            return Ok((0..5).map(|_| Self::river_obs(abs)).collect());
        }
        let abs = i64::from(abs);
        const SQL: &'static str = r#"
            WITH target AS (
                SELECT population FROM abstraction WHERE abs = $1
            )
            SELECT obs
            FROM isomorphism e, target t
            WHERE abs = $1
                AND position < LEAST(5, t.population)  -- Sample from available positions
                AND position >= FLOOR(RANDOM() * GREATEST(t.population - 5, 1))  -- Random starting point
            LIMIT 5;
        "#;
        Ok(self
            .0
            .query(SQL, &[&abs])
            .await?
            .iter()
            .map(|row| row.get::<_, i64>(0))
            .map(Observation::from)
            .collect())
    }
    pub async fn replace_obs(&self, obs: Observation) -> Result<Observation, E> {
        // "another hand from the same bucket" — on the river we have to search for one
        // instead of picking it by position.
        if obs.street() == Street::Rive {
            return Ok(Self::river_obs(Self::river_abs(obs)));
        }
        const SQL: &'static str = r#"
            -- OBS SWAP
            WITH sample AS (
                SELECT
                    e.abs,
                    a.population,
                    FLOOR(RANDOM() * a.population)::INTEGER as i
                FROM isomorphism    e
                JOIN abstraction    a ON e.abs = a.abs
                WHERE               e.obs = $1
            )
            SELECT          e.obs
            FROM sample     t
            JOIN isomorphism e ON e.abs = t.abs
            AND             e.position = t.i
            LIMIT 1;
        "#;
        //
        let iso = i64::from(Isomorphism::from(obs));
        //
        let row = self.0.query_one(SQL, &[&iso]).await?;
        Ok(Observation::from(row.get::<_, i64>(0)))
    }
}

// proximity lookups
impl API {
    pub async fn abs_nearby(&self, abs: Abstraction) -> Result<Vec<(Abstraction, Energy)>, E> {
        if abs.street() == Street::Rive {
            let mut ranked = Abstraction::all(Street::Rive)
                .into_iter()
                .filter(|&x| x != abs)
                .map(|x| (x, Equity.distance(&abs, &x)))
                .collect::<Vec<_>>();
            ranked.sort_by(|(_, a), (_, b)| a.partial_cmp(b).expect("not NaN"));
            ranked.truncate(5);
            return Ok(ranked);
        }
        let abs = i64::from(abs);
        const SQL: &'static str = r#"
            SELECT a1.abs, m.dx
            FROM abstraction    a1
            JOIN abstraction    a2 ON a1.street = a2.street
            JOIN metric         m  ON (a1.abs # $1) = m.xor
            WHERE
                a2.abs  = $1 AND
                a1.abs != $1
            ORDER BY m.dx ASC
            LIMIT 5;
        "#;
        Ok(self
            .0
            .query(SQL, &[&abs])
            .await?
            .iter()
            .map(|row| (row.get::<_, i64>(0), row.get::<_, Energy>(1)))
            .map(|(abs, distance)| (Abstraction::from(abs), distance))
            .collect())
    }
    pub async fn obs_nearby(&self, obs: Observation) -> Result<Vec<(Abstraction, Energy)>, E> {
        if obs.street() == Street::Rive {
            return self.abs_nearby(Self::river_abs(obs)).await;
        }
        let iso = i64::from(Isomorphism::from(obs));
        const SQL: &'static str = r#"
            -- OBS NEARBY
            SELECT a.abs, m.dx
            FROM isomorphism        e
            JOIN abstraction    a ON e.abs = a.abs
            JOIN metric         m  ON (a.abs # e.abs) = m.xor
            WHERE
                e.obs   = $1 AND
                a.abs != e.abs
            ORDER BY m.dx ASC
            LIMIT 5;
        "#;
        Ok(self
            .0
            .query(SQL, &[&iso])
            .await?
            .iter()
            .map(|row| (row.get::<_, i64>(0), row.get::<_, Energy>(1)))
            .map(|(abs, distance)| (Abstraction::from(abs), distance))
            .collect())
    }
}

// exploration panel
impl API {
    pub async fn exp_wrt_str(&self, str: Street) -> Result<Sample, E> {
        self.exp_wrt_obs(Observation::from(str)).await
    }
    pub async fn exp_wrt_obs(&self, obs: Observation) -> Result<Sample, E> {
        // no river rows to join against, so take the abs from river_abs and read the
        // bucket's stats straight out of `abstraction`.
        const RIVER: &'static str = r#"
            -- EXP WRT OBS (river)
            SELECT
                $1::BIGINT              as obs,
                a.abs,
                a.equity::REAL          as equity,
                a.population::REAL / $3 as density,
                a.centrality::REAL      as centrality
            FROM abstraction a
            WHERE a.abs = $2;
        "#;
        const SQL: &'static str = r#"
            -- EXP WRT OBS
            SELECT
                e.obs,
                a.abs,
                a.equity::REAL          as equity,
                a.population::REAL / $2 as density,
                a.centrality::REAL      as centrality
            FROM isomorphism e
            JOIN abstraction a ON e.abs = a.abs
            WHERE e.obs = $1;
        "#;
        //
        // `population` counts isomorphism rows, so the denominator has to be the number of
        // isomorphisms. dividing by n_observations here made this route report a density
        // ~7.8x smaller than every other route reports for the very same cluster — the
        // explorer showed 0.16% in its header and 1.23% in the neighbor rows below it.
        let n = obs.street().n_isomorphisms() as f32;
        let iso = i64::from(Isomorphism::from(obs));
        //
        let row = if obs.street() == Street::Rive {
            let abs = i64::from(self.obs_to_abs(obs).await?);
            self.0.query_one(RIVER, &[&iso, &abs, &n]).await?
        } else {
            self.0.query_one(SQL, &[&iso, &n]).await?
        };
        Ok(Sample::from(row))
    }
    pub async fn exp_wrt_abs(&self, abs: Abstraction) -> Result<Sample, E> {
        // an empty learned cluster has no isomorphism rows either — kmeans can leave one with
        // population 0 — so the join returns nothing and query_one would 500 on a bucket
        // that legitimately exists. fall back to a synthesized representative.
        const BARE: &'static str = r#"
            -- EXP WRT ABS (no isomorphism rows)
            SELECT
                $3::BIGINT              as obs,
                a.abs,
                a.equity::REAL          as equity,
                a.population::REAL / $2 as density,
                a.centrality::REAL      as centrality
            FROM abstraction a
            WHERE a.abs = $1;
        "#;
        const SQL: &'static str = r#"
            -- EXP WRT ABS
            WITH sample AS (
                SELECT
                    a.abs,
                    a.population,
                    a.equity,
                    a.centrality,
                    FLOOR(RANDOM() * a.population)::INTEGER as i
                FROM abstraction a
                WHERE a.abs = $1
                AND   a.population > 0
            )
            SELECT
                e.obs,
                s.abs,
                s.equity::REAL          as equity,
                s.population::REAL / $2 as density,
                s.centrality::REAL      as centrality
            FROM sample     s
            JOIN isomorphism    e ON e.abs = s.abs
            AND             e.position = s.i
            LIMIT 1;
        "#;
        //
        let n = abs.street().n_isomorphisms() as f32;
        let street = abs.street();
        let key = i64::from(abs);
        //
        if street == Street::Rive {
            return self
                .river_sample(abs, Self::river_obs(abs), 0 as Energy)
                .await;
        }
        match self.0.query_opt(SQL, &[&key, &n]).await? {
            Some(row) => Ok(Sample::from(row)),
            None => {
                let obs = i64::from(Observation::from(street));
                let row = self.0.query_one(BARE, &[&key, &n, &obs]).await?;
                Ok(Sample::from(row))
            }
        }
    }
}

// neighborhood lookups
impl API {
    pub async fn nbr_any_wrt_abs(&self, wrt: Abstraction) -> Result<Sample, E> {
        // uniform over abstraction space
        use rand::prelude::IndexedRandom;
        let ref mut rng = rand::rng();
        let abs = Abstraction::all(wrt.street())
            .into_iter()
            .filter(|&x| x != wrt)
            .collect::<Vec<_>>()
            .choose(rng)
            .copied()
            .expect("more than one abstraction option");
        self.nbr_abs_wrt_abs(wrt, abs).await
    }
    pub async fn nbr_abs_wrt_abs(&self, wrt: Abstraction, abs: Abstraction) -> Result<Sample, E> {
        const SQL: &'static str = r#"
            -- NBR ABS WRT ABS
            WITH sample AS (
                SELECT
                    r.abs                                   as abs,
                    r.population                            as population,
                    r.equity                                as equity,
                    FLOOR(RANDOM() * r.population)::INTEGER as i,
                    COALESCE(m.dx, 0)                       as distance
                FROM abstraction    r
                LEFT JOIN metric    m ON m.xor = ($1::BIGINT # $3::BIGINT)
                WHERE               r.abs = $1
            ),
            random_isomorphism AS (
                SELECT e.obs, e.abs, s.equity, s.population, s.distance
                FROM sample s
                JOIN isomorphism e ON e.abs = s.abs AND e.position = s.i
                WHERE e.abs = $1
                LIMIT 1
            )
            SELECT
                obs,
                abs,
                equity::REAL                      as equity,
                population::REAL / $2             as density,
                distance::REAL                    as distance
            FROM random_isomorphism;
        "#;
        //
        let n = wrt.street().n_isomorphisms() as f32;
        if wrt.street() == Street::Rive {
            let distance = Equity.distance(&wrt, &abs);
            return self.river_sample(abs, Self::river_obs(abs), distance).await;
        }
        // an empty learned cluster has no isomorphism row to sample, so the join yields
        // nothing — same absence exp_wrt_abs handles, reached here whenever nbr_any_wrt_abs
        // happens to draw one at random.
        const BARE: &'static str = r#"
            -- NBR ABS WRT ABS (no isomorphism rows)
            SELECT
                $4::BIGINT              as obs,
                r.abs                   as abs,
                r.equity::REAL          as equity,
                r.population::REAL / $2 as density,
                COALESCE(m.dx, 0)::REAL as distance
            FROM abstraction    r
            LEFT JOIN metric    m ON m.xor = ($1::BIGINT # $3::BIGINT)
            WHERE               r.abs = $1;
        "#;
        let street = wrt.street();
        let abs = i64::from(abs);
        let wrt = i64::from(wrt);
        //
        match self.0.query_opt(SQL, &[&abs, &n, &wrt]).await? {
            Some(row) => Ok(Sample::from(row)),
            None => {
                let obs = i64::from(Observation::from(street));
                let row = self.0.query_one(BARE, &[&abs, &n, &wrt, &obs]).await?;
                Ok(Sample::from(row))
            }
        }
    }
    pub async fn nbr_obs_wrt_abs(&self, wrt: Abstraction, obs: Observation) -> Result<Sample, E> {
        const SQL: &'static str = r#"
            -- NBR OBS WRT ABS
            WITH given AS (
                SELECT
                    (obs),
                    (abs),
                    (abs # $3) as xor
                FROM    isomorphism
                WHERE   obs = $1
            )
            SELECT
                g.obs,
                g.abs,
                a.equity::REAL                      as equity,
                a.population::REAL / $2             as density,
                COALESCE(m.dx, 0)::REAL             as distance
            FROM given          g
            JOIN metric         m ON m.xor = g.xor
            JOIN abstraction    a ON a.abs = g.abs
            LIMIT 1;
        "#;
        //
        let n = wrt.street().n_isomorphisms() as f32;
        // on the river the given observation already determines its own bucket, so there is
        // nothing to look up — and the metric join would find no row for the pair either.
        if wrt.street() == Street::Rive {
            let abs = Self::river_abs(obs);
            return self.river_sample(abs, obs, Equity.distance(&wrt, &abs)).await;
        }
        let iso = i64::from(Isomorphism::from(obs));
        let wrt = i64::from(wrt);
        //
        let row = self.0.query_one(SQL, &[&iso, &n, &wrt]).await?;
        Ok(Sample::from(row))
    }
}

// k-nearest neighbors lookups
impl API {
    /// the k river buckets closest to (or furthest from) `wrt`.
    ///
    /// the SQL versions rank by a metric join and then pull a representative by position;
    /// on the river neither table has rows, so both would return an empty list and the
    /// panel would look like it had no neighbors rather than no data. rank by the Equity
    /// measure instead, which is what Metric::distance uses for these buckets anyway.
    async fn river_neighbors(&self, wrt: Abstraction, far: bool) -> Result<Vec<Sample>, E> {
        let mut ranked = Abstraction::all(Street::Rive)
            .into_iter()
            .filter(|&abs| abs != wrt)
            .map(|abs| (abs, Equity.distance(&wrt, &abs)))
            .collect::<Vec<_>>();
        ranked.sort_by(|(_, a), (_, b)| a.partial_cmp(b).expect("not NaN"));
        if far {
            ranked.reverse();
        }
        let mut samples = Vec::with_capacity(5);
        for (abs, distance) in ranked.into_iter().take(5) {
            samples.push(
                self.river_sample(abs, Self::river_obs(abs), distance)
                    .await?,
            );
        }
        Ok(samples)
    }
    pub async fn kfn_wrt_abs(&self, wrt: Abstraction) -> Result<Vec<Sample>, E> {
        if wrt.street() == Street::Rive {
            return self.river_neighbors(wrt, true).await;
        }
        const SQL: &'static str = r#"
                -- KNN WRT ABS
                WITH nearest AS (
                    SELECT
                        a.abs                                       as abs,
                        a.population                                as population,
                        m.dx                                        as distance,
                        FLOOR(RANDOM() * population)::INTEGER       as sample
                    FROM abstraction    a
                    JOIN metric         m ON m.xor = (a.abs # $1)
                    WHERE               a.street = $2
                    AND                 a.abs   != $1
                    ORDER BY            m.dx DESC
                    LIMIT 5
                )
                SELECT
                    e.obs,
                    n.abs,
                    a.equity::REAL          as equity,
                    a.population::REAL / $3 as density,
                    n.distance::REAL        as distance
                FROM nearest n
                JOIN abstraction    a ON a.abs = n.abs
                JOIN isomorphism        e ON e.abs = n.abs
                AND                 e.position = n.sample
                ORDER BY            n.distance DESC;
            "#;
        //
        let n = wrt.street().n_isomorphisms() as f32;
        let s = wrt.street() as i16;
        let wrt = i64::from(wrt);
        //
        let rows = self.0.query(SQL, &[&wrt, &s, &n]).await?;
        Ok(rows.into_iter().map(Sample::from).collect())
    }
    pub async fn knn_wrt_abs(&self, wrt: Abstraction) -> Result<Vec<Sample>, E> {
        if wrt.street() == Street::Rive {
            return self.river_neighbors(wrt, false).await;
        }
        const SQL: &'static str = r#"
            -- KNN WRT ABS
            WITH nearest AS (
                SELECT
                    a.abs                                       as abs,
                    a.population                                as population,
                    m.dx                                        as distance,
                    FLOOR(RANDOM() * population)::INTEGER       as sample
                FROM abstraction    a
                JOIN metric         m ON m.xor = (a.abs # $1)
                WHERE               a.street = $2
                AND                 a.abs   != $1
                ORDER BY            m.dx ASC
                LIMIT 5
            )
            SELECT
                e.obs,
                n.abs,
                a.equity::REAL          as equity,
                a.population::REAL / $3 as density,
                n.distance::REAL        as distance
            FROM nearest n
            JOIN abstraction    a ON a.abs = n.abs
            JOIN isomorphism        e ON e.abs = n.abs
            AND                 e.position = n.sample
            ORDER BY            n.distance ASC;
        "#;
        //
        let n = wrt.street().n_isomorphisms() as f32;
        let s = wrt.street() as i16;
        let wrt = i64::from(wrt);
        //
        let rows = self.0.query(SQL, &[&wrt, &s, &n]).await?;
        Ok(rows.into_iter().map(Sample::from).collect())
    }
    pub async fn kgn_wrt_abs(
        &self,
        wrt: Abstraction,
        nbr: Vec<Observation>,
    ) -> Result<Vec<Sample>, E> {
        const SQL: &'static str = r#"
            -- KGN WRT ABS
            WITH input(obs, ord) AS (
              SELECT unnest($3::BIGINT[])                   AS obs,
                     generate_series(1, array_length($3,1)) AS ord
            )
            SELECT
              e.obs AS obs,
              e.abs AS abs,
              a.equity::REAL AS equity,
              a.population::REAL / $1 AS density,
              m.dx::REAL AS distance
            FROM input i
            JOIN isomorphism     e ON e.obs = i.obs
            JOIN abstraction a ON e.abs = a.abs
            JOIN metric      m ON m.xor = (a.abs # $2)
            ORDER BY i.ord
            LIMIT 5;
        "#;
        // the given observations already carry their own buckets on the river, so keep them
        // in the order asked for rather than dropping them at a join that can't match.
        if wrt.street() == Street::Rive {
            let mut samples = Vec::with_capacity(nbr.len());
            for obs in nbr.into_iter().take(5) {
                let abs = Self::river_abs(obs);
                samples.push(self.river_sample(abs, obs, Equity.distance(&wrt, &abs)).await?);
            }
            return Ok(samples);
        }
        let isos = nbr
            .into_iter()
            .map(Isomorphism::from)
            .map(i64::from)
            .collect::<Vec<_>>();
        let n = wrt.street().n_isomorphisms() as f32;
        let wrt = i64::from(wrt);
        //
        let rows = self.0.query(SQL, &[&n, &wrt, &&isos]).await?;
        Ok(rows.into_iter().map(Sample::from).collect())
    }
}

// histogram lookups
impl API {
    pub async fn hst_wrt_obs(&self, obs: Observation) -> Result<Vec<Sample>, E> {
        if obs.street() == Street::Rive {
            self.hst_wrt_obs_on_river(obs).await
        } else {
            self.hst_wrt_obs_on_other(obs).await
        }
    }
    pub async fn hst_wrt_abs(&self, abs: Abstraction) -> Result<Vec<Sample>, E> {
        if abs.street() == Street::Rive {
            self.hst_wrt_abs_on_river(abs).await
        } else {
            self.hst_wrt_abs_on_other(abs).await
        }
    }
    /// up to five hands drawn from a river bucket, which is what both river variants of this
    /// panel showed before: on the river there is no next street to distribute over, so the
    /// listing is of peers within the bucket rather than a histogram.
    async fn river_members(&self, abs: Abstraction) -> Result<Vec<Sample>, E> {
        let mut samples = Vec::with_capacity(5);
        for _ in 0..5 {
            samples.push(
                self.river_sample(abs, Self::river_obs(abs), 0 as Energy)
                    .await?,
            );
        }
        Ok(samples)
    }
    async fn hst_wrt_obs_on_river(&self, obs: Observation) -> Result<Vec<Sample>, E> {
        self.river_members(Self::river_abs(obs)).await
    }
    async fn hst_wrt_obs_on_other(&self, obs: Observation) -> Result<Vec<Sample>, E> {
        const SQL: &'static str = r#"
        -- OTHER OBS DISTRIBUTION
            SELECT
                e.obs, e.abs, a.equity
            FROM isomorphism    e
            JOIN abstraction    a ON e.abs = a.abs
            WHERE               e.obs = ANY($1);
        "#;
        let n = obs.street().n_children();
        let children = obs
            .children()
            .map(Isomorphism::from)
            .map(Observation::from)
            .collect::<Vec<_>>();
        // a turn observation's children are river hands, which have no rows to select — the
        // query would come back short and the lookup below would panic the worker rather
        // than return an error. bucket them directly, as the trainer's lookup did.
        let rows = if obs.street().next() == Street::Rive {
            children
                .iter()
                .map(|&child| {
                    let abs = Self::river_abs(child);
                    (child, (abs, Probability::from(abs)))
                })
                .collect::<BTreeMap<_, _>>()
        } else {
            let distinct = children
                .iter()
                .copied()
                .map(i64::from)
                .fold(HashSet::<i64>::new(), |mut set, x| {
                    set.insert(x);
                    set
                })
                .into_iter()
                .collect::<Vec<_>>();
            self.0
                .query(SQL, &[&distinct])
                .await?
                .into_iter()
                .map(|row| {
                    (
                        Observation::from(row.get::<_, i64>(0)),
                        Abstraction::from(row.get::<_, i64>(1)),
                        Probability::from(row.get::<_, f32>(2)),
                    )
                })
                .map(|(obs, abs, equity)| (obs, (abs, equity)))
                .collect::<BTreeMap<_, _>>()
        };
        let hist = children
            .iter()
            .filter_map(|child| rows.get(child).map(|entry| (child, entry)))
            .fold(BTreeMap::<_, _>::new(), |mut btree, (obs, (abs, eqy))| {
                btree.entry(abs).or_insert((obs, eqy, 0)).2 += 1;
                btree
            })
            .into_iter()
            .map(|(abs, (obs, eqy, pop))| Sample {
                obs: obs.equivalent(),
                abs: abs.to_string(),
                equity: eqy.clone(),
                density: pop as Probability / n as Probability,
                distance: 0.,
            })
            .collect::<Vec<_>>();
        Ok(hist)
    }
    async fn hst_wrt_abs_on_river(&self, abs: Abstraction) -> Result<Vec<Sample>, E> {
        self.river_members(abs).await
    }
    async fn hst_wrt_abs_on_other(&self, abs: Abstraction) -> Result<Vec<Sample>, E> {
        // a turn abstraction transitions into river buckets, which have no isomorphism rows
        // for the join at the bottom to sample — every row would be dropped and the panel
        // would show an empty distribution even though `transitions` has all 16 weights.
        const RIVER: &'static str = r#"
            -- OTHER ABS DISTRIBUTION (river targets)
            SELECT
                p.abs              as abs,
                p.equity::REAL     as equity,
                g.dx               as density,
                p.centrality::REAL as distance
            FROM transitions g
            JOIN abstraction p ON p.abs = g.next
            WHERE            g.prev = $1
            ORDER BY         g.dx DESC;
        "#;
        const SQL: &'static str = r#"
            -- OTHER ABS DISTRIBUTION
            WITH histogram AS (
                SELECT
                    p.abs                                   as abs,
                    g.dx                                    as probability,
                    p.population                            as population,
                    p.equity                                as equity,
                    p.centrality                            as centrality,
                    FLOOR(RANDOM() * p.population)::INTEGER as i
                FROM transitions g
                JOIN abstraction p ON p.abs = g.next
                WHERE            g.prev = $1
                LIMIT 64
            )
            SELECT
                e.obs              as obs,
                t.abs              as abs,
                t.equity::REAL     as equity,
                t.probability      as density,
                t.centrality::REAL as distance
            FROM histogram      t
            JOIN isomorphism    e ON e.abs = t.abs
            AND                 e.position = t.i
            ORDER BY            t.probability DESC;
        "#;
        //
        let street = abs.street();
        let ref key = i64::from(abs);
        //
        if street.next() == Street::Rive {
            let rows = self.0.query(RIVER, &[key]).await?;
            let mut samples = Vec::with_capacity(rows.len());
            for row in rows {
                let next = Abstraction::from(row.get::<_, i64>(0));
                samples.push(Sample {
                    obs: Self::river_obs(next).equivalent(),
                    abs: next.to_string(),
                    equity: row.get::<_, f32>(1),
                    density: row.get::<_, f32>(2),
                    distance: row.get::<_, f32>(3),
                });
            }
            return Ok(samples);
        }
        let rows = self.0.query(SQL, &[key]).await?;
        Ok(rows.into_iter().map(Sample::from).collect())
    }
}

// blueprint lookups
impl API {
    pub async fn policy(&self, recall: Recall) -> Result<Vec<Decision>, E> {
        if !recall.consistent() {
            return Err(E::__private_api_timeout());
        }
        use crate::mccfr::nlhe::encoder::Encoder;
        const SQL: &'static str = r#"
        -- policy is indexed by present, past, future
        -- and it returns a vector of decision probabilities
        -- over the set of "choices" we can continue toward
            SELECT edge, policy
            FROM blueprint
            WHERE past    = $1
            AND   present = $2
            AND   future  = $3
        "#;
        let ref game = recall.head();
        let history = recall.path();
        let present = self.obs_to_abs(game.sweat()).await?;
        let futures = Path::from(Encoder::choices(game, recall.raises()));
        let ref history = i64::from(history);
        let ref present = i64::from(present);
        let ref futures = i64::from(futures);
        let rows = self.0.query(SQL, &[history, present, futures]).await?;
        let decisions = rows.into_iter().map(Decision::from).collect::<Vec<_>>();
        let denominator = decisions.iter().map(|d| d.mass).sum::<Probability>();
        if denominator == 0. {
            // the blueprint has nothing for this bucket — an absence, not a failure.
            // callers distinguish it from an error by the empty vector.
            Ok(Vec::new())
        } else {
            Ok(decisions
                .into_iter()
                .map(|d| d.normalize(denominator))
                .collect::<Vec<_>>())
        }
    }
}

/// The river is the one street with no rows in `isomorphism` and no pairs in `metric` — its
/// abstractions are an equity bucketing derived on demand, not learned clusters that were
/// uploaded. Any route that reaches for a river row instead of deriving it reads zero rows,
/// which query_one reports as a 500 and a join silently reports as "no neighbors". These pin
/// the derivation itself, which is what every river branch in this file is built on.
#[cfg(all(test, feature = "native"))]
mod tests {
    use super::*;

    /// river_obs is rejection sampling, so the contract it has to keep is that the hand it
    /// returns really is in the requested bucket — otherwise every river panel quietly
    /// displays a hand from a neighboring bucket.
    #[test]
    fn river_obs_lands_in_the_requested_bucket() {
        for abs in Abstraction::all(Street::Rive) {
            let obs = API::river_obs(abs);
            assert_eq!(
                API::river_abs(obs),
                abs,
                "{} sampled {} which buckets as {}",
                abs,
                obs,
                API::river_abs(obs)
            );
        }
    }

    /// river_abs has to agree with what Lookup::grow wrote for the river, since the blueprint
    /// and the abstraction table were both keyed on that bucketing.
    #[test]
    fn river_abs_matches_the_trainer_bucketing() {
        for _ in 0..64 {
            let obs = Observation::from(Street::Rive);
            let iso = Isomorphism::from(obs);
            assert_eq!(API::river_abs(obs), Abstraction::from(iso.0.equity()));
            // the bucket is a property of the canonical form, so suit permutations agree
            assert_eq!(API::river_abs(obs), API::river_abs(iso.0));
        }
    }
}
