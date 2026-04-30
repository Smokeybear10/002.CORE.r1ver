# R1VER — Complete Technical Reference

R1VER is a No-Limit Texas Hold'em (NLHE) poker solver built from scratch in Rust, inspired by Pluribus — CMU/Facebook's superhuman multiplayer poker AI. It trains a near-Nash-equilibrium strategy by combining hand abstraction, k-means clustering, and Monte Carlo Counterfactual Regret Minimization (MCCFR), stores the result in PostgreSQL, and serves queries via a REST API backed by a Next.js frontend.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [System Architecture](#2-system-architecture)
3. [Type System](#3-type-system)
4. [Cards Module](#4-cards-module)
5. [Clustering Module](#5-clustering-module)
6. [Transport Module](#6-transport-module)
7. [Gameplay Module](#7-gameplay-module)
8. [MCCFR Module](#8-mccfr-module)
9. [Save Module](#9-save-module)
10. [Analysis Module](#10-analysis-module)
11. [WASM Module](#11-wasm-module)
12. [Frontend](#12-frontend)
13. [Configuration & Constants](#13-configuration--constants)
14. [Feature Flags & Build System](#14-feature-flags--build-system)
15. [Graceful Interrupt System](#15-graceful-interrupt-system)
16. [CI/CD & Deployment](#16-cicd--deployment)
17. [Tech Stack](#17-tech-stack)
18. [Data Flow End-to-End](#18-data-flow-end-to-end)
19. [Performance & Optimizations](#19-performance--optimizations)
20. [Key Numbers](#20-key-numbers)
21. [Common Interview Questions](#21-common-interview-questions)

---

## 1. Problem Statement

Poker has roughly **10^161 game states** — far beyond what any computer can enumerate or store. Even after reducing by symmetry, the river alone has ~600 million unique information sets. Running CFR on the raw game tree is computationally intractable.

R1VER solves this via **abstraction + approximation**:

1. **Hand abstraction**: Reduce 3.1 trillion raw observations to manageable equivalence classes using suit symmetry
2. **Clustering**: Group similar hands into K discrete buckets per street using k-means over Earth Mover's Distance
3. **MCCFR**: Run Monte Carlo CFR on the abstracted tree — sampling, not full traversal
4. **Blueprint**: The result is a lookup table — (hand_cluster, game_history) → action_probabilities

This blueprint can be queried in real time via REST API.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     OFFLINE TRAINING PIPELINE                     │
│                                                                   │
│   Phase 1           Phase 2           Phase 3         Phase 4    │
│  Abstraction   →   Clustering    →    MCCFR      →  PostgreSQL   │
│  (isomorphism)    (k-means++)     (268M trees)     (pgcopy)       │
│  3.1T → ~600M     ~600M → 128-     268M game       binary stream │
│  per street       144 clusters     trees sampled   into tables    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                       RUNTIME SYSTEM                              │
│                                                                   │
│  Actix-web API (port 3002)  →  PostgreSQL  ←  Next.js frontend   │
│  12 REST endpoints             indexed tables  React 19, GSAP     │
└──────────────────────────────────────────────────────────────────┘
```

### Module Map

| Module | Purpose | Feature gate |
|--------|---------|--------------|
| `cards/` | Hand types, evaluation, isomorphism, equity | always |
| `gameplay/` | Game state machine, actions, settlements | always |
| `transport/` | Optimal transport (Sinkhorn, greedy) | always |
| `wasm/` | WebAssembly bindings for browser | always |
| `clustering/` | K-means abstraction learning | `native` |
| `mccfr/` | CFR solver (NLHE + RPS validation) | `native` |
| `save/` | pgcopy persistence to PostgreSQL | `native` |
| `analysis/` | Actix-web REST API server | `native` |
| `search/` | Depth-limited subgame solving (stub) | `native` |
| `players/` | Human player interface | `native` |

---

## 3. Type System

### Dimensional Analysis Types (lib.rs)

```rust
type Chips = i16;        // poker chip counts
type Equity = f32;       // hand win probability [0, 1]
type Energy = f32;       // transport cost / distance
type Entropy = f32;      // sinkhorn temperature / KL divergence
type Utility = f32;      // CFR regret / payoff values
type Probability = f32;  // action probabilities [0, 1]
```

These are type aliases, not newtypes — chosen for clarity of intent at call sites rather than compile-time safety. Using `f32` throughout (not `f64`) is a deliberate performance choice — 4 bytes vs 8, better SIMD utilization.

### Abstraction Enum (gameplay/abstraction.rs)

The central identifier type — represents a cluster or bucket for any street:

```rust
pub enum Abstraction {
    Percent(u64),  // River: equity percentile bucket (0–100)
    Learned(u64),  // Flop/Turn: k-means cluster ID
    Preflop(u64),  // Preflop: one of 169 canonical hand pairs
}
```

**Bit layout of the u64:**
```
bits 63–56: street tag (0=Pref, 1=Flop, 2=Turn, 3=Rive)  [mask: H = 0xFF00000000000000]
bits 55–12: hash signature of (street, index)              [mask: M = 0x00FFFFFFFFFFF000]
bits 11–0:  raw index (cluster number or equity bucket)    [mask: L = 0x0000000000000FFF]
```

The hash in the middle bits creates a **bijective mapping** from (street, index) pairs to u64 values that can be stored as `BIGINT` in PostgreSQL. The encoding ensures:
- Street is recoverable from any u64
- Index is recoverable from any u64
- XOR of two abstractions on the same street uniquely identifies the pair (used as metric table key)

**River abstractions** are equity buckets: `Abstraction::from(0.75)` maps to the 75th percentile bucket. The mapping is: `quantize(p) = round(p × N)` and `floatize(q) = q / N` where N = 100.

**Flop/Turn abstractions** are k-means cluster IDs — the u64 encodes which cluster (0–127 for flop, 0–143 for turn) a hand belongs to.

**Preflop abstractions** are one of 169 strategically unique hand pairs (e.g., AKs, AKo, 72o).

---

## 4. Cards Module

### Card (cards/card.rs)

A single playing card encoded as a `u8`:
- Upper 4 bits: rank (0=2, 1=3, ..., 12=Ace)
- Lower 2 bits: suit (0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades)
- Values 0–51 cover the full 52-card deck

### Hand (cards/hand.rs)

A bitmask over the 52-card deck stored as a `u64`:
- Bit `i` is set if card `i` is in the hand
- Supports set operations: `Hand::add`, `Hand::or`, `Hand::complement`
- Used for both hole cards and board cards

### Evaluator (cards/evaluator.rs) — Hot Path

Evaluates the rank of a 5-7 card hand in nanoseconds using lazy bitwise operations.

**Evaluation order** (early exit on first match):
1. Straight Flush
2. Four of a Kind
3. Full House
4. Flush
5. Straight
6. Three of a Kind
7. Two Pair
8. Pair
9. High Card

**Why no lookup table?** Bitwise AND/OR/XOR on a u64 bitmask is more cache-friendly than a large lookup table — no memory reads, everything fits in registers. This matters because the evaluator is called billions of times during clustering.

**Key operations:**
- Flush detection: group cards by suit bits, count
- Straight detection: bitwise AND with sliding 5-bit mask over rank bits
- Pair/trips/quads: count occurrences of each rank using bitmasking

### Observation (cards/observation.rs)

Represents a player's view at a given point: pocket (2 cards) + board (0/3/4/5 cards).

```rust
pub struct Observation {
    pocket: Hand,
    public: Hand,
}
```

Key methods:
- `street()` — infers current street from board card count
- `equity()` — exhaustive calculation of win probability (expensive, used in clustering)
- `simulate(n)` — Monte Carlo equity approximation
- `children()` — iterator over all possible next cards (used to build Turn→River histograms)
- `equivalent()` — canonical string representation

### Isomorphism (cards/isomorphism.rs)

**The core space reduction technique.**

Suits in poker are interchangeable before cards are dealt — KhQh and KsQs are strategically identical. There are 4! = 24 suit permutations, so each unique strategic situation appears 24 times in the raw observation space.

**Canonicalization**: Apply the lexicographically smallest suit permutation such that suits appear in first-seen order (e.g., suit of first card = 0, suit of second new suit = 1, etc.).

```rust
pub fn is_canonical(observation: &Observation) -> bool {
    Permutation::from(observation) == Permutation::identity()
}
```

**Effect**: Reduces observation count by ~4–5x per street.

**Trade-off chosen**: Board cards are lumped together (lossy imperfect recall) rather than tracked per-street. This means a flop observation doesn't "remember" which suit each board card was dealt on. Faster and smaller, with marginal accuracy loss.

### Street (cards/street.rs)

```rust
pub enum Street { Pref, Flop, Turn, Rive }
```

Each street has:
- `k()` — number of clusters (4096 preflop, 128 flop, 144 turn, 101 river)
- `t()` — number of k-means iterations (20 flop, 24 turn)
- `n_revealed()` — cards dealt on this street (0/3/1/1)
- `n_observed()` — total board cards seen (0/3/4/5)
- `next()`, `prev()` — navigation

### IsomorphismIterator / ObservationIterator

Lazy iterators that enumerate all canonical observations for a given street — used in clustering to avoid loading all 3.1T situations into memory at once.

---

## 5. Clustering Module

### Overview

Converts the continuous hand space into a finite set of discrete buckets that MCCFR can train over. Uses a hierarchical approach — river equity → turn clusters → flop clusters → preflop (no clustering, 169 hand pairs).

### Histogram (clustering/histogram.rs)

A probability distribution over abstractions:

```rust
pub struct Histogram {
    mass: usize,
    counts: BTreeMap<Abstraction, usize>,
}
```

- `density(x)` → `counts[x] / mass` (probability of abstraction x)
- `support()` → iterator over abstractions with nonzero count
- `absorb(other)` → merge two histograms (add counts, add mass)
- `peek()` → first key in counts (used to determine which street's abstractions are stored)

**Construction for a flop observation**: enumerate all 47 possible turn cards, look up each one's cluster, increment the count for that cluster. Result: a distribution over 144 turn clusters.

**Construction for a turn observation**: enumerate all 44 possible river cards, compute equity for each, bucket into one of 101 river equity percentiles. Result: a distribution over equity buckets.

### Layer (clustering/layer.rs) — Main Algorithm

```rust
pub struct Layer {
    street: Street,
    metric: Metric,          // precomputed distances between lower-level abstractions
    points: Vec<Histogram>,  // all observations for this street (N points)
    kmeans: Vec<Histogram>,  // current K centroids
}
```

**Entry point**: `Layer::learn()` runs all streets in reverse order (River → Turn → Flop → Preflop), skipping streets already done.

**K-means++ initialization** (`init()`):
1. Pick first centroid uniformly at random
2. For each subsequent centroid: compute squared distance from each point to its nearest existing centroid, sample next centroid proportional to squared distances
3. Guarantees O(log K) approximation to optimal initial placement
4. Uses `Rayon::par_iter()` for parallel distance computation

**K-means iteration** (`next()`):
1. For each of N points: find nearest centroid via `neighborhood()` (parallel with Rayon)
2. Accumulate points into new centroids via `absorb()`
3. Reinitialize any empty centroids (cluster with no assigned points) with a random point
4. Log RMS error: `sqrt(total_loss / N)`

**Checkpoint system**: saves centroid state after every iteration to `pgcopy/checkpoint.{street}`. On restart, loads from last checkpoint and resumes. Format: iter number + Vec<Histogram> serialized in pgcopy binary.

**Final outputs** (saved to disk after all iterations):
- `isomorphism.{street}` — maps each canonical observation → cluster ID
- `metric.{street}` — pairwise distances between all K centroids
- `transitions.{street}` — centroid histograms (distribution over lower-level abstractions)

### Metric (clustering/metric.rs)

```rust
pub struct Metric(BTreeMap<Pair, Energy>);
```

Stores pairwise distances between abstractions. Two distance methods:

**`emd(source, target)`** — full Sinkhorn optimal transport (expensive, used for final centroid-to-centroid metric):
```rust
Sinkhorn::from((source, target, self)).minimize().cost()
```

**`expected(source, target)`** — fast expected distance (used for k-means assignment):
```rust
source.support()
    .flat_map(|x| target.support().map(|y| (x, y)))
    .map(|(x, y)| source.density(x) * target.density(y) * self.distance(x, y))
    .sum()
```
This is E[d(X,Y)] where X ~ source, Y ~ target — uses the precomputed ground metric but without iterative Sinkhorn. O(Sp × Sc) vs O(T × Sp × Sc). ~128x faster.

**`distance(x, y)`** — atomic ground metric lookup:
- For `Learned` abstractions: BTreeMap lookup by XOR key
- For `Percent` abstractions: 1D total variation via `Equity::variation()`

**Street detection from metric size**: `len() == K choose 2` — used to infer which street a metric file belongs to without storing metadata.

**Normalization on construction**: divides all distances by max distance — ensures metric is on [0, 1].

### Sinkhorn (clustering/sinkhorn.rs)

Solves the regularized optimal transport problem between two histograms.

**Problem**: Given source distribution μ and target distribution ν over abstractions, with ground metric d(x,y), find minimum cost transport plan γ:
```
min <C, γ>  s.t. γ1 = μ, γᵀ1 = ν, γ ≥ 0
```

**Regularization** (Sinkhorn's trick): Add entropy term ε·H(γ):
```
min <C, γ> - ε·H(γ)
```

Solution via dual potentials (Kontorovich-Rubinstein formulation):
```
log(γ_ij) = u_i + v_j - C_ij / ε
```

**Iterative scaling** (`sinkhorn()`):
- Alternate between updating LHS potentials (u) and RHS potentials (v)
- Each update: `u_i = log(μ_i) - log(Σ_j exp(v_j - C_ij/ε))`
- Convergence check: `Σ|exp(u_new) - exp(u_old)| + Σ|exp(v_new) - exp(v_old)| < tolerance`
- Parameters: ε=0.025, max iterations=128, tolerance=0.001

**Cost computation**: `Σ_ij γ_ij · d(x_i, y_j)`

**Numerical stability**: `e.max(Energy::MIN_POSITIVE)` inside sum prevents log(0). `assert!(dx.is_finite())` guards against NaN propagation.

### EMD (clustering/emd.rs)

Wraps observations and provides `.metric()` and `.sinkhorn()` factory methods for constructing the metric and sinkhorn objects during the River and Turn phases.

### Equity (clustering/equity.rs)

Fast 1D distance for distributions over equity percentiles (River):
```
variation(p, q) = 0.5 × Σ |p(x) - q(x)|
```
Total variation distance — used when abstractions are `Percent` variants. No ground metric needed since equity percentiles are already 1D ordered.

---

## 6. Transport Module

Generic optimal transport interfaces used by the clustering module.

### Coupling Trait (transport/coupling.rs)

```rust
pub trait Coupling {
    type X; type Y; type P; type Q; type M;
    fn minimize(self) -> Self;
    fn flow(&self, x: &Self::X, y: &Self::Y) -> Energy;
    fn cost(&self) -> Energy;
}
```

Implemented by `Sinkhorn` (regularized OT), `Greedy` (greedy approximation), and `Greenkhorn` (faster variant).

### Density Trait (transport/density.rs)

Abstraction over probability distributions:
```rust
pub trait Density {
    type Support;
    fn density(&self, x: &Self::Support) -> f32;
    fn support(&self) -> impl Iterator<Item = &Self::Support>;
}
```

Implemented by `Histogram` and `Potential`.

### Measure Trait (transport/measure.rs)

Ground metric abstraction:
```rust
pub trait Measure {
    type X; type Y;
    fn distance(&self, x: &Self::X, y: &Self::Y) -> Energy;
}
```

Implemented by `Metric` (lookup table) and `Equity` (1D variation).

---

## 7. Gameplay Module

### Game (gameplay/game.rs) — Hot Path

The complete NLHE game state machine. Fully immutable — every mutation returns a new `Game`:

```rust
pub struct Game {
    seats: [Seat; N],    // N=2 players
    pot: Chips,          // current pot size
    board: Board,        // community cards
    dealer: Position,    // button position
    ticker: Position,    // rotation counter (NOT current player index)
}
```

**Actor calculation**: `actor_idx = (dealer + ticker) % N` — the ticker wraps around the dealer, advancing one position per action.

**Key public methods**:
- `root()` — creates a fresh game: `Self::base().deal().post()`
- `apply(action)` — pure function: clones self, applies action, returns new state
- `legal()` — returns all currently legal actions
- `turn()` — returns `Terminal`, `Chance` (deal cards), or `Choice(player_idx)`
- `sweat()` — returns the current actor's `Observation` (pocket + board)
- `settlements()` — computes payouts at terminal nodes

**Terminal detection** (`must_stop()`):
- River: `is_everyone_alright()` (all matched or shoving)
- Other streets: `is_everyone_folding()` (only one player left)

**Deal detection** (`must_deal()`): `is_everyone_alright()` on non-river streets — everyone has acted, pot is right, reveal next card.

**Blind posting**: `must_post()` returns true if preflop pot < small_blind + big_blind.

**Raise size**: `to_raise()` computes minimum legal raise based on NLHE rules:
```
required_raise = max(last_raise_size, big_blind)
to_raise = to_call + required_raise
```

**Edge ↔ Action conversion**:
- `edgify(action)` — converts concrete Action to abstract Edge (e.g., `Raise(47)` → `Raise(Odds::nearest((47, pot)))`)
- `actionize(edge)` — converts abstract Edge back to concrete Action given current game state

**Game tree implementation** (`impl mccfr::traits::game::Game for Game`):
- `root()` — fresh game state
- `turn()` — terminal/chance/choice
- `apply(edge)` — convert edge to action and apply
- `payoff(turn)` — P&L for the player at terminal nodes

### Action (gameplay/action.rs)

```rust
pub enum Action {
    Fold,
    Check,
    Call(Chips),
    Raise(Chips),
    Shove(Chips),
    Blind(Chips),
    Draw(Hand),
}
```

**Bijective u32 encoding** for compact game tree storage:
```
Fold   = 0
Check  = 1
Call   = 2 | (chips << 8)
Raise  = 3 | (chips << 8)
Shove  = 4 | (chips << 8)
Blind  = 5 | (chips << 8)
Draw   = encoded hand bits
```

Fully reversible — game history as `Vec<u32>` reconstructs the exact game tree path.

### Edge (gameplay/edge.rs)

Abstract representation of actions for the CFR tree — decoupled from concrete chip amounts:

```rust
pub enum Edge {
    Fold, Check, Call, Shove, Draw,
    Raise(Odds),  // expressed as pot fraction, not chip amount
}
```

`Odds` is a rational fraction (e.g., 0.5x pot, 1x pot, 2x pot) — the CFR tree uses relative bet sizes so strategies generalize across different stack/pot configurations.

**Raise abstraction**: `Odds::nearest((amount, pot))` finds the nearest predefined odds to a concrete raise. This reduces the action branching factor.

### Turn (gameplay/turn.rs)

```rust
pub enum Turn {
    Terminal,
    Chance,
    Choice(Position),  // player index (0 or 1)
}
```

Used by CFR to determine what happens at each tree node.

### Seat (gameplay/seat.rs)

```rust
pub struct Seat {
    cards: Hole,    // pocket cards
    stack: Chips,   // remaining chips
    stake: Chips,   // current street commitment
    spent: Chips,   // total committed across all streets
    state: State,   // Betting | Folding | Shoving
}
```

### Settlement (gameplay/settlement.rs)

```rust
pub struct Settlement {
    reward: Chips,  // chips won (output)
    risked: Chips,  // chips committed (input)
    status: State,  // folded/active/shoving
    strength: Strength,  // hand ranking
}
```

`pnl()` = `reward - risked` — used as CFR payoff.

### Showdown (gameplay/showdown.rs)

Handles multi-way pot splitting at terminal nodes. Sorts players by hand strength, handles side pots for all-in situations, distributes chips accordingly.

### Abstraction (gameplay/abstraction.rs)

See [Type System](#3-type-system) section. Key additional point: the `Abstraction` type is used as the key in `Histogram::counts` — it determines which "bucket" a turn/river card maps into.

### Path (gameplay/path.rs)

Encodes the history of actions taken from root to current node as a `u64`. Used as part of the CFR information set key (past, present, future). Bijective — the full action sequence is recoverable from a `u64`.

---

## 8. MCCFR Module

### Overview

Counterfactual Regret Minimization is a self-play algorithm for imperfect-information games. It converges to Nash equilibrium in two-player zero-sum games.

**Core idea**: At each information set (player's view of the game), track how much "regret" you'd have for not having played each action. Over time, update your strategy to minimize regret. The average strategy across all iterations is the Nash approximation.

### Blueprint Trait (mccfr/traits/blueprint.rs) — Core Algorithm

```rust
pub trait Blueprint: Send + Sync {
    type T: Turn;     // turn type
    type E: Edge;     // edge type
    type G: Game;     // game type
    type I: Info;     // information set type
    type P: Profile;  // strategy profile type
    type S: Encoder;  // tree encoder type
    
    fn train();
    fn batch_size() -> usize;
    fn tree_count() -> usize;
}
```

**Training loop** (`solve()`):
```rust
for _ in 0..iterations() {         // tree_count / batch_size
    for update in self.batch() {    // parallel batch of trees
        self.update_regret(update);
        self.update_weight(update);
    }
    if self.interrupted() { break; }
}
```

**Batch generation** (`batch()`):
1. Spawn `batch_size` trees in parallel (Rayon)
2. Partition each tree into InfoSets
3. Filter to only the current walker's InfoSets (alternating player 0/1)
4. Compute counterfactual vectors in parallel

**Tree generation** (`tree()`):
- DFS from root: seed → encode info → sample branches via profile → expand
- `Encoder::branches()` returns legal edges
- `Profile::explore()` samples which branches to actually follow (external sampling)
- Continues until no more leaves

**Counterfactual vectors** (`counterfactual()`):
- Regret vector: how much regret for each action at this infoset
- Policy vector: accumulated action weights for strategy averaging

**Regret update** (`update_regret()`):
```rust
let accumulated = profile.sum_regret(info, edge) * discount(Some(current_regret));
let accumulated = accumulated + new_regret;
let accumulated = accumulated.max(REGRET_MIN);  // clamp at -300k
```

**Weight update** (`update_weight()`):
```rust
let accumulated = profile.sum_policy(info, edge) * discount(None);
let accumulated = accumulated + new_policy;
let accumulated = accumulated.max(POLICY_MIN);
```

**Discount scheduling**: Uses DCFR (Discounted CFR) parameters:
- α = 1.5 (positive regret decay)
- ω = 0.5 (negative regret decay)
- γ = 1.5 (policy weight decay)
- Applied periodically to weight recent iterations more heavily

### Profile (mccfr/nlhe/profile.rs)

```rust
pub struct Profile {
    iterations: usize,
    encounters: BTreeMap<Info, BTreeMap<Edge, (Probability, Utility)>>,
    //                                                  ↑          ↑
    //                                               policy     regret
}
```

- `walker()` — alternates between `Choice(0)` and `Choice(1)` each iteration (external sampling)
- `sum_policy(info, edge)` — accumulated strategy weight
- `sum_regret(info, edge)` — accumulated counterfactual regret

**Strategy extraction**: `policy / sum(policy)` — normalize accumulated weights to get action probabilities.

**Database schema**:
```sql
CREATE TABLE blueprint (
    edge       BIGINT,   -- encoded action
    past       BIGINT,   -- encoded action history
    present    BIGINT,   -- current abstraction (cluster ID)
    future     BIGINT,   -- encoded future action set
    policy     REAL,     -- accumulated strategy weight
    regret     REAL      -- accumulated counterfactual regret
);
```

### Info / InfoSet

`Info` is the information set identifier — a triple of (past, present, future) encoded as u64s:
- `past`: Path encoding of actions before current street
- `present`: Abstraction of current hand observation
- `future`: Path encoding of actions after current abstraction

`InfoSet` groups all nodes in the game tree that share the same Info — these are where regret is computed.

### Encoder (mccfr/nlhe/encoder.rs)

Converts game states to abstract information sets for CFR:
- `seed(game)` → initial Info for root
- `info(tree, leaf)` → Info for a leaf node
- `branches(node)` → legal abstract edges

### RPS Validation (mccfr/rps/)

Rock-Paper-Scissors implementation with asymmetric utility (rock beats scissors by 2x). Used to validate the CFR algorithm before running NLHE:
- Known Nash equilibrium: (1/3, 1/3, 1/3) under symmetric, shifts under asymmetric
- CFR converges to this exactly in ~8,192 trees
- If RPS works, NLHE CFR is trusted to be correct

---

## 9. Save Module

### Writer (save/writer.rs)

Orchestrates the full persistence pipeline:
1. `upload()` — streams each table's pgcopy file into PostgreSQL
2. `derive()` — runs SQL to create derived tables and indexes
3. `VACUUM ANALYZE` — updates query planner statistics

### pgcopy Binary Format

PostgreSQL's native binary copy format — zero parsing overhead:

```
[11-byte signature]
[4-byte flags]
[4-byte header extension]
[row data...]
[0xFFFF trailer]
```

Each row: `[u16 field_count] [u32 field_len] [field_bytes] ...`

The project reads/writes this format directly using `byteorder` crate (big-endian reads/writes). `BinaryCopyInWriter` streams directly to PostgreSQL without intermediate buffers.

### Tables Uploaded

| Table | Columns | Purpose |
|-------|---------|---------|
| `metric` | `(xor BIGINT, dx REAL)` | pairwise abstraction distances |
| `blueprint` | `(edge, past, present, future, policy, regret)` | strategy profiles |

### Derived Tables (SQL)

Run after upload via the `Derive` trait:

```sql
-- abstraction: maps observations to clusters
-- street: street-specific lookup indexes
CREATE INDEX idx_metric_xor ON metric (xor);
CREATE INDEX idx_blueprint_bucket ON blueprint (present, past, future);
CREATE INDEX idx_blueprint_edge ON blueprint (edge);
```

---

## 10. Analysis Module

### Server (analysis/server.rs)

Actix-web HTTP server:
- Binds to `127.0.0.1:3002`
- 6 worker threads
- CORS: allow all origins, all methods, all headers
- Apache combined format logging
- Shares Arc<PostgreSQL client> across workers

### API Endpoints (analysis/api.rs)

All endpoints: `POST` with JSON body, returns JSON.

| Endpoint | Input | Output | Description |
|----------|-------|--------|-------------|
| `/replace-obs` | observation string | canonical observation | Canonicalize via isomorphism |
| `/blueprint` | hand + history | `Decision[]` | Query strategy for situation |
| `/hst-wrt-obs` | observation | histogram | Equity distribution for hand |
| `/hst-wrt-abs` | abstraction ID | histogram | Equity distribution for cluster |
| `/nbr-knn-abs` | abstraction + k | `Sample[]` | K nearest neighbor clusters |
| `/nbr-kfn-abs` | abstraction + k | `Sample[]` | K farthest neighbor clusters |
| `/nbr-kgn-abs` | abstraction + k + set | `Sample[]` | K nearest among given set |
| `/nbr-any-abs` | abstraction | `Sample` | Random neighbor |
| `/nbr-obs-abs` | observation | `Sample` | Neighbor using obs as reference |
| `/nbr-abs-abs` | abstraction | `Sample` | Neighbor using abs as reference |
| `/exp-wrt-str` | street | `Sample[]` | All clusters for a street |
| `/exp-wrt-abs` | abstraction | `Sample[]` | Nearby clusters |
| `/exp-wrt-obs` | observation | `Sample[]` | Clusters near this observation |

**Request types** (analysis/request.rs):
```rust
pub struct BlueprintRequest {
    pub history: Vec<String>,  // action history ["BLIND 1", "CALL 1", ...]
    pub obs: String,           // observation "AsKd:JhTc2s"
    pub turn: String,          // "P0" or "P1"
}
```

**Response types** (analysis/response.rs):
```rust
pub struct Decision {
    pub edge: String,   // "Fold" | "Check" | "Call" | "Raise" | "Shove"
    pub mass: f32,      // probability [0, 1]
}
pub struct Sample {
    pub obs: String,
    pub abs: String,
    pub equity: f32,
    pub density: f32,
    pub distance: f32,
}
```

**Blueprint query flow**:
1. Parse observation string → `Observation`
2. Apply isomorphism → canonical observation
3. Query `isomorphism` table → `Abstraction`
4. Parse action history → `Path`
5. Query `blueprint` table: `SELECT edge, policy, regret WHERE present=$1 AND past=$2 AND future=$3`
6. Normalize policies → `Decision[]`

---

## 11. WASM Module

`wasm.rs` exposes the entire card + game type system to JavaScript via `wasm-bindgen`.

**Exported types**: `WasmCard`, `WasmHand`, `WasmHole`, `WasmDeck`, `WasmBoard`, `WasmStreet`, `WasmAction`, `WasmRank`, `WasmSuit`, `WasmKickers`, `WasmRanking`, `WasmStrength`, `WasmEvaluator`, `WasmObservation`, `WasmAbstraction`, `WasmGame`.

Each is a newtype wrapper around the Rust type with `#[wasm_bindgen]` methods bridging to JavaScript:

**Key exposed capabilities from browser**:
- Full game state machine (`WasmGame::root()`, `.apply()`, `.legal()`, `.pot()`)
- Hand evaluation (`WasmEvaluator::find_ranking()`, `.find_kickers()`)
- Equity calculation (`WasmObservation::equity()`, `.simulate(n)`)
- Card parsing (`WasmCard::from_string("As")`, `.into_string()`)
- Action encoding (`WasmAction::fold()`, `.raise(amount)`, `.into_string()`)

`console_error_panic_hook` is registered at WASM init — panics show readable errors in browser console rather than cryptic Wasm traps.

**Compilation target**: `wasm32-unknown-unknown` with `wasm-bindgen` post-processor.

---

## 12. Frontend

Built with Next.js 16 App Router. Located in `web/`.

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Landing page with scroll animations |
| `/explorer` | `app/explorer/page.tsx` | Hand equity and cluster explorer |
| `/strategy` | `app/strategy/page.tsx` | Blueprint query interface |
| `/demo/*` | Various | Theme variants (bloomberg, poker-pro, clean) |

### Key Components

| Component | Purpose |
|-----------|---------|
| `hero-section.tsx` | Animated hero with GSAP scroll triggers |
| `explorer-section.tsx` | Wraps the equity explorer UI |
| `strategy-section.tsx` | Wraps the blueprint query UI |
| `cluster-canvas.tsx` | 2D visualization of cluster neighborhood |
| `histogram.tsx` | Equity distribution bar chart |
| `hero-canvas.tsx` | Background WebGL canvas (particle system) |
| `bg-canvas.tsx` | Animated gradient background |
| `scroll-manager.tsx` | Lenis smooth scroll + GSAP ScrollTrigger integration |
| `split-text.tsx` | Per-character text animation |
| `card.tsx` | Playing card display component |
| `chip.tsx` | Chip stack visualization |

### API Client (web/app/lib/api.ts)

Typed fetch client for all REST endpoints:
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export async function blueprint(req: BlueprintRequest): Promise<Decision[]>
export async function histogram(obs: string): Promise<Sample[]>
export async function neighbors(abs: string, k: number): Promise<Sample[]>
// ...
```

### Styling

- Tailwind CSS 4 (PostCSS plugin, not Tailwind CLI)
- `globals.css` (1,266 lines) — custom CSS variables, animation keyframes, card styling, theme tokens
- `cn()` / `clsx()` for conditional classNames

### Animations

- **GSAP 3** + `@gsap/react` — ScrollTrigger, timeline-based entrance animations
- **Lenis** — smooth inertia scrolling, integrates with GSAP's ticker
- **scroll-store.ts** — Zustand-style store that exposes scroll position to components

---

## 13. Configuration & Constants

All in `src/lib.rs`:

```rust
// Game rules
const N: usize = 2;                   // heads-up (2 players)
const STACK: Chips = 100;             // starting stack
const B_BLIND: Chips = 2;            // big blind
const S_BLIND: Chips = 1;            // small blind
const MAX_RAISE_REPEATS: usize = 3;  // max re-raises per street
const MAX_DEPTH_SUBGAME: usize = 16; // depth-limited subgame solving (future)

// Sinkhorn optimal transport
const SINKHORN_TEMPERATURE: Entropy = 0.025;  // regularization strength
const SINKHORN_ITERATIONS: usize = 128;       // max iterations per call
const SINKHORN_TOLERANCE: Energy = 0.001;     // convergence threshold

// K-means clustering (production)
const KMEANS_FLOP_TRAINING_ITERATIONS: usize = 20;
const KMEANS_TURN_TRAINING_ITERATIONS: usize = 24;
const KMEANS_FLOP_CLUSTER_COUNT: usize = 128;
const KMEANS_TURN_CLUSTER_COUNT: usize = 144;
const KMEANS_EQTY_CLUSTER_COUNT: usize = 101;  // river equity percentiles

// MCCFR training (production)
const CFR_BATCH_SIZE_NLHE: usize = 128;
const CFR_TREE_COUNT_NLHE: usize = 0x10000000;  // 268,435,456 trees

// CFR sampling parameters (DCFR)
const SAMPLING_THRESHOLD: Entropy = 1.0;
const SAMPLING_ACTIVATION: Energy = 0.0;
const SAMPLING_EXPLORATION: Probability = 0.01;

// Regret matching
const POLICY_MIN: Probability = Probability::MIN_POSITIVE;
const REGRET_MIN: Utility = -3e5;  // -300,000 regret clamp

// RPS validation
const ASYMMETRIC_UTILITY: f32 = 2.0;
const CFR_BATCH_SIZE_RPS: usize = 1;
const CFR_TREE_COUNT_RPS: usize = 8192;
```

**Demo mode** (feature flag `demo`) overrides all production sizes with small values for fast testing:
- Flop: 8 clusters, 3 iterations
- Turn: 8 clusters, 3 iterations
- MCCFR: 65,536 trees

---

## 14. Feature Flags & Build System

```toml
[features]
core    = []                  # minimal (no deps)
native  = [...]               # full solver deps
wasm    = ["wasm-bindgen"]    # browser target
cluster = ["native"]          # run abstraction learning
trainer = ["native"]          # run MCCFR
publish = ["native"]          # upload to PostgreSQL
analyze = ["native"]          # run REST API server
demo    = []                  # small parameters for testing
```

**`main.rs` dispatch** (compile-time, no runtime cost):
```rust
#[tokio::main]
async fn main() {
    #[cfg(feature = "cluster")]
    crate::clustering::Layer::learn();

    #[cfg(feature = "trainer")]
    crate::mccfr::NLHE::solve();

    #[cfg(feature = "publish")]
    crate::save::Writer::publish().await;

    #[cfg(feature = "analyze")]
    crate::analysis::Server::run().await;
}
```

**Build commands**:
```bash
cargo build --release --features cluster   # run abstraction + clustering
cargo build --release --features trainer   # run MCCFR training
cargo build --release --features publish   # upload to PostgreSQL
cargo build --release --features analyze   # start API server
cargo build --release --features demo      # fast test run
cargo build --target wasm32-unknown-unknown --features wasm  # browser
```

---

## 15. Graceful Interrupt System

Two interrupt mechanisms for long-running training processes:

**`kys()`** — Ctrl+C handler:
```rust
tokio::signal::ctrl_c().await;  // first press
INTERRUPTED.store(true);        // sets global flag
// training loop checks flag, finishes current batch, saves checkpoint
ctrl_c().await;                 // second press
std::process::exit(0);          // immediate exit
```

**`brb()`** — stdin 'Q' handler:
```rust
// reads stdin in a separate thread
// "Q\n" → sets INTERRUPTED flag
// graceful finish of current batch
```

**`INTERRUPTED` flag**:
```rust
static INTERRUPTED: AtomicBool = AtomicBool::new(false);
```

Both the clustering loop and the MCCFR training loop check this flag between iterations. On interrupt, the current checkpoint is preserved — the process can be resumed from the last saved state.

---

## 16. CI/CD & Deployment

### GitHub Actions (.github/workflows/rust.yml)

```yaml
- cargo build                        # verify compilation
- cargo test --lib                   # unit tests
- cargo test --lib --features demo   # demo mode tests
- cargo bench                        # Criterion benchmarks
```

### Benchmarks (benches/benchmarks.rs)

12 Criterion benchmark targets covering:
- Hand evaluation speed
- Isomorphism canonicalization
- Histogram operations
- Sinkhorn convergence
- K-means distance calculations
- Game state transitions

### Docker

Multi-stage build:
```dockerfile
FROM rust:1.80 AS builder
  COPY . .
  RUN cargo build --release --features analyze

FROM debian:bookworm-slim
  COPY --from=builder /app/target/release/r1ver .
  COPY --from=builder /app/pgcopy ./pgcopy
  CMD ["./r1ver"]
```

Runtime environment variables:
```bash
DB_URL="postgres://user:pass@host/r1ver"
NEXT_PUBLIC_API_URL="http://localhost:3002"
```

---

## 17. Tech Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Solver language | Rust | 2021 | Nanosecond perf, fearless parallelism, zero GC |
| Async runtime | Tokio | 1.0 | Async I/O for API server |
| HTTP server | Actix-web | 4.4 | High-perf Rust web framework |
| Parallelism | Rayon | 1.10 | Data parallelism for k-means |
| Database client | tokio-postgres | 0.7 | Async PostgreSQL, pgcopy streaming |
| Graph | Petgraph | 0.6.5 | Game tree representation |
| Serialization | serde_json | 1.0 | JSON API bodies |
| CLI | clap | 4.0 | Argument parsing |
| Progress | indicatif | 0.17.8 | Progress bars during training |
| Byte order | byteorder | 1.5 | Big-endian pgcopy format |
| Logging | log + simplelog | — | File + terminal combined logging |
| CORS | actix-cors | 0.6 | Cross-origin for frontend |
| WASM | wasm-bindgen | 0.2 | Browser bindings |
| Framework | Next.js | 16 | React SSR, App Router |
| UI | React | 19 | Functional components, server components |
| Styling | Tailwind CSS | 4 | Utility-first CSS |
| Animations | GSAP | 3.14 | ScrollTrigger, timelines |
| Scroll | Lenis | 1.3 | Smooth inertia scrolling |
| Types | TypeScript | 5 | Strict mode |
| Database | PostgreSQL | — | Binary copy, indexed lookups |
| CI | GitHub Actions | — | Build + test + bench |
| Container | Docker | — | Multi-stage Rust → Debian |

---

## 18. Data Flow End-to-End

### Training Pipeline

```
Raw poker situations
    ↓
[cards/] IsomorphismIterator
    generates all canonical (pocket, board) pairs per street
    ~600M unique observations per street after suit reduction
    ↓
[cards/] Observation::equity() / children()
    exhaustive equity calculation for River
    fanout to turn children for Turn/Flop histograms
    ↓
[clustering/] Histogram construction
    River observation → distribution over 101 equity buckets
    Turn observation → distribution over 101 equity buckets (via river equity)
    Flop observation → distribution over 144 turn clusters
    ↓
[transport/] Metric construction
    Sinkhorn OT between all K centroid pairs → pairwise distance matrix
    Saved as metric.{street}
    ↓
[clustering/] K-means++ initialization
    Probabilistic centroid seeding using expected distance
    Rayon parallel distance computation
    ↓
[clustering/] K-means iteration loop (20/24 times)
    Parallel assignment: each point → nearest centroid (expected distance)
    Sequential accumulation: centroids absorb assigned points
    Empty centroid repair: reinitialize with random point
    Checkpoint save after each iteration
    ↓
[clustering/] Final outputs
    isomorphism.{street}: observation → cluster ID lookup
    metric.{street}: pairwise centroid distances
    transitions.{street}: centroid histogram distributions
    ↓
[mccfr/] MCCFR training (268M trees)
    Alternating player traversal (external sampling)
    Counterfactual regret computation at each InfoSet
    DCFR discount scheduling (α=1.5, ω=0.5, γ=1.5)
    Periodic interrupt checks + graceful checkpoint
    ↓
[save/] pgcopy upload to PostgreSQL
    Binary stream: metric → metric table
    Binary stream: blueprint → blueprint table
    SQL: CREATE INDEX, VACUUM ANALYZE
    ↓
[analysis/] Actix-web API ready for queries
```

### Query Flow

```
Frontend: POST /blueprint { obs: "AsKd:JhTc2s", history: [...], turn: "P0" }
    ↓
[analysis/api.rs]
    Parse observation string → Observation
    Apply isomorphism → canonical form
    ↓
[PostgreSQL]
    SELECT abs FROM isomorphism WHERE obs = $1
    → Abstraction (cluster ID)
    ↓
[analysis/api.rs]
    Parse action history → Path (past), Path (future)
    ↓
[PostgreSQL]
    SELECT edge, policy, regret FROM blueprint
    WHERE present = $1 AND past = $2 AND future = $3
    → Vec<(Edge, policy, regret)>
    ↓
[analysis/api.rs]
    Normalize policies: policy / sum(policy)
    ↓
Frontend: [{ edge: "Raise", mass: 0.65 }, { edge: "Fold", mass: 0.35 }]
```

---

## 19. Performance & Optimizations

### Hand Evaluation
- u64 bitmask, bitwise operations only
- No heap allocation, no memory reads
- Evaluates in ~5–10 nanoseconds
- Early exit on most common hand types

### Isomorphism
- 4–5x observation space reduction
- Deterministic canonicalization — no lookup table needed
- Enables compact binary files (isomorphism.flop = 32MB vs ~150MB raw)

### K-means Assignment Distance
- Original: full Sinkhorn O(T × Sp × Sc) per call — caused 4x slowdown when centroids saturated
- Fixed: expected distance O(Sp × Sc) per call — 128x fewer operations on assignment hot path
- Sinkhorn kept only for final centroid metric computation (8,128 calls, negligible)

### Rayon Parallelism
- K-means assignment: `par_iter()` over N=1.3M observations
- K-means++ initialization: parallel squared distance computation
- MCCFR batch: `into_par_iter()` over batch of 128 trees
- Counterfactual computation: parallel over InfoSets

### PostgreSQL pgcopy
- Binary format: no text parsing, no type conversion overhead
- Streaming ingest: `BinaryCopyInWriter` — no intermediate buffers
- B-tree indexes on all query columns for O(log n) lookups

### Memory Layout
- `f32` throughout (not f64) — half the memory, better SIMD
- `BTreeMap` for ordered iteration in CFR (vs HashMap) — consistent traversal order
- `[Seat; N]` stack-allocated array (not Vec) for game state

### Checkpoint System
- Saves after every k-means iteration — can resume from last good state
- Saves after every MCCFR batch — interrupt-safe training
- No wasted work on crashes or manual interrupts

---

## 20. Key Numbers

| Metric | Value |
|--------|-------|
| Raw poker situations per street | ~3.1 trillion |
| After isomorphism | ~600 million |
| Flop clusters | 128 |
| Turn clusters | 144 |
| River equity buckets | 101 |
| Preflop hand pairs | 169 |
| K-means flop iterations | 20 |
| K-means turn iterations | 24 |
| MCCFR tree samples | 268,435,456 (2²⁸) |
| MCCFR batch size | 128 |
| Sinkhorn max iterations | 128 |
| Sinkhorn temperature | 0.025 |
| Regret minimum clamp | -300,000 |
| Stack size | 100 chips |
| Max raise repeats | 3 |
| API workers | 6 |
| API port | 3002 |
| isomorphism.flop file size | 32 MB |
| isomorphism.turn file size | 346 MB |
| isomorphism.river file size | 3.0 GB |
| metric.flop file size | 175 KB |
| metric.turn file size | 221 KB |

---

## 21. Common Interview Questions

**Q: What is R1VER at a high level?**

A Rust-based NLHE poker solver. It trains a game-theoretic strategy from scratch using three phases: (1) hand abstraction — exploit suit symmetry to reduce 3.1T observations to ~600M canonical forms; (2) clustering — k-means with Earth Mover's Distance to group similar hands into 128–144 discrete buckets per street; (3) MCCFR — sample-based CFR over the abstracted game tree to learn near-Nash strategies. The result is stored in PostgreSQL and queried via a REST API.

**Q: What is CFR and why does it work?**

CFR is a self-play algorithm for imperfect information games. Each iteration, you play both sides and compute "counterfactual regret" at each decision point — how much better you'd have done if you'd always played action A instead of your current strategy. You accumulate these regrets over iterations and update your strategy proportionally to positive regrets. The average strategy across all iterations provably converges to Nash equilibrium in two-player zero-sum games (Zinkevich et al., 2007).

**Q: Why is abstraction necessary?**

Poker's game tree has ~10^161 nodes — even after isomorphism, the river alone has ~600M information sets. CFR needs to visit each information set thousands of times to converge. Without abstraction, training would take decades. Clustering lets the solver treat similar hands identically, shrinking the effective game tree by several orders of magnitude.

**Q: What is Earth Mover's Distance and why use it over Euclidean?**

EMD measures the minimum "work" to transform one probability distribution into another, where work = mass moved × distance moved. Two hands might have similar mean equity but different shapes — one might be a strong draw (bimodal), another a marginal made hand (unimodal). Euclidean distance on histogram bins would treat adjacent-bin mismatches the same as far-bin mismatches, which is wrong for ordered distributions. EMD respects the ordering of equity values.

**Q: What is Sinkhorn and why use it over solving the LP directly?**

The exact EMD is a linear program — O(n³ log n) for n-support distributions. Too slow for millions of calls. Sinkhorn adds an entropy regularization term that turns the problem into an iterative scaling problem — O(T × n²) where T converges quickly (~10–50 iterations in practice). Faster, differentiable, and simple to implement.

**Q: What was the performance bug you found and fixed?**

After the first k-means iteration, each centroid absorbs ~10,000 points from diverse hands. This causes centroid histograms to grow from ~47 bins (single-point initialization) to ~144 bins (full support over all turn clusters). Since Sinkhorn cost is O(T × Sp × Sc) and Sc grew from 47 → 144, each assignment call became ~3–5x slower, plus convergence got harder (more Sinkhorn iterations). Combined ~5–10x slowdown per iter — what should have been 7-hour iterations became 40-hour iterations (extrapolating to 30+ days for full clustering). Fixed by replacing Sinkhorn in the assignment step with expected distance E[d(X,Y)] = Σ p(x)q(y)d(x,y) — O(Sp×Sc) with no iterations, 128x fewer operations. Sinkhorn still used for final centroid-to-centroid metric (only 8,128 calls total).

**Q: What is external sampling MCCFR?**

Standard MCCFR traverses the full game tree each iteration — O(|A|^depth). External sampling only follows one sampled action path for the opponent, weighting by sampling probability. This reduces per-iteration work by O(|A|) at the cost of higher variance. For NLHE with branching factor ~4–5, this is a significant speedup. The algorithm still converges to Nash — the sampling is unbiased.

**Q: How does the bijective u64 Abstraction encoding work?**

The u64 has three regions: upper 8 bits = street tag (0–3), middle 44 bits = hash of (street, index), lower 12 bits = raw cluster index. The hash in the middle ensures XOR of two same-street abstractions is unique (used as metric table key). The street tag allows recovering which street any abstraction belongs to from just the u64 — useful for deserializing from PostgreSQL.

**Q: Why PostgreSQL binary copy format instead of ORM/SQL inserts?**

Inserting millions of rows via SQL INSERT is orders of magnitude slower — each row requires a round-trip, type conversion, and WAL write. pgcopy binary format sends the entire dataset as a single stream in PostgreSQL's native binary representation — no text parsing, no type conversion. For the metric table alone (~8,128 rows) it's negligible, but for the blueprint table (potentially hundreds of millions of infoset-action pairs after full MCCFR training) it's the only practical approach.

**Q: What's incomplete / what would you build next?**

The `search/` module is a stub for depth-limited subgame solving — re-solving small subtrees in real time for higher accuracy, as used in Libratus/Pluribus. The river has no clustering (3GB file is currently too large for k-means at production scale). The turn and flop abstractions use expected distance for k-means (a performance optimization) rather than exact EMD — using EMD would give better clustering quality at the cost of much longer training time. A subgame solver would significantly close the gap to Pluribus-level play.

**Q: Why Rust?**

Performance is the primary constraint. The clustering phase evaluates billions of hand-histogram distances. MCCFR samples hundreds of millions of game trees. Rust gives: nanosecond-level hand evaluation with zero GC pauses, Rayon for fearless multi-core parallelism, f32 SIMD without unsafe code, and compile-time feature flags that produce zero dead code. A Python or Java implementation would be 10–100x slower for the same algorithms.

**Q: How do you know the solver is working?**

Three validation approaches: (1) RPS reference implementation — known Nash is (1/3, 1/3, 1/3), CFR converges to it exactly in ~8,192 trees; (2) RMS error logging during k-means — error should decrease monotonically; (3) the explorer UI lets you visually inspect equity distributions and cluster neighborhoods to sanity-check that similar hands end up in the same cluster.

---

Built by Thomas Ou
