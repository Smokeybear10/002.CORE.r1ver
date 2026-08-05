use super::edge::Edge;
use super::game::Game;
use super::solver::RPS;
use super::turn::Turn;
use std::collections::BTreeMap;

/// For the Rock Paper Scissors game, Blueprint implements both Trainer and Profile traits.
/// As a Profile, it tracks regrets and policies over time. As a Trainer, it uses those
/// values to train an optimal strategy through counterfactual regret minimization.
impl crate::mccfr::traits::blueprint::Blueprint for RPS {
    type T = Turn;
    type E = Edge;
    type G = Game;
    type I = Turn;
    type P = Self;
    type S = Self;

    fn train() {
        log::info!("{}", Self::default().solve());
    }

    fn tree_count() -> usize {
        crate::CFR_TREE_COUNT_RPS
    }
    fn batch_size() -> usize {
        crate::CFR_BATCH_SIZE_RPS
    }

    fn encoder(&self) -> &Self::S {
        &self
    }

    fn profile(&self) -> &Self::P {
        &self
    }

    fn mut_policy(&mut self, info: &Self::I, edge: &Self::E) -> &mut f32 {
        &mut self
            .encounters
            .entry(info.clone())
            .or_insert_with(BTreeMap::default)
            .entry(edge.clone())
            .or_insert((0., 0.))
            .0
    }

    fn mut_regret(&mut self, info: &Self::I, edge: &Self::E) -> &mut f32 {
        &mut self
            .encounters
            .entry(info.clone())
            .or_insert_with(BTreeMap::default)
            .entry(edge.clone())
            .or_insert((0., 0.))
            .1
    }

    fn advance(&mut self) {
        crate::mccfr::traits::profile::Profile::increment(self)
    }
}

#[cfg(test)]
mod tests {
    use super::RPS;
    use crate::mccfr::traits::blueprint::Blueprint as _;
    use crate::mccfr::traits::game::Game as _;
    use crate::mccfr::traits::info::Info as _;
    use crate::mccfr::traits::profile::Profile as _;

    /// Counterfactual regret is a deviation from the policy-weighted mean value, so at any
    /// decision node sum_a policy(a) * node_gain(a) is identically zero. That identity is what
    /// forces the regrets in an infoset to straddle zero; a baseline that breaks it drags every
    /// regret the same direction and collapses the strategy toward uniform.
    #[test]
    fn regrets_are_centered() {
        let mut rps = RPS::default();
        for _ in 0..64 {
            let tree = rps.tree();
            for infoset in tree.partition().into_values() {
                let node = infoset.head();
                if rps.profile().walker() != node.game().turn() {
                    continue;
                }
                let gains = node
                    .info()
                    .choices()
                    .iter()
                    .map(|e| (rps.profile().policy(node.info(), e), rps.profile().node_gain(&node, e)))
                    .collect::<Vec<_>>();
                let scale = gains.iter().map(|(_, g)| g.abs()).fold(0f32, f32::max);
                if scale == 0. {
                    continue;
                }
                let residual = gains.iter().map(|(p, g)| p * g).sum::<f32>().abs() / scale;
                assert!(residual < 1e-4, "uncentered regrets: residual {}", residual);
            }
            for ref update in rps.batch() {
                rps.update_regret(update);
                rps.update_weight(update);
            }
            rps.advance();
        }
    }
}
