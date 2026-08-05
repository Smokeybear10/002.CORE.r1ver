use crate::Arbitrary;
use crate::Chips;
use crate::Probability;
use crate::Utility;

/// pot-normalized odds for a given raise size
#[derive(Debug, Clone, Copy, Eq, Hash, PartialEq, Ord, PartialOrd)]
pub struct Odds(pub Chips, pub Chips);

impl From<Odds> for Probability {
    fn from(odds: Odds) -> Self {
        odds.0 as Probability / odds.1 as Probability
    }
}

impl From<(Chips, Chips)> for Odds {
    fn from((a, b): (Chips, Chips)) -> Self {
        let (a, b) = Self::gcd(a, b);
        Self(a, b)
    }
}

impl Odds {
    fn gcd(a: Chips, b: Chips) -> (Chips, Chips) {
        let (mut a, mut b) = (a, b);
        while b != 0 {
            (a, b) = (b, a % b);
        }
        (a, b)
    }
    pub fn nearest((a, b): (Chips, Chips)) -> Self {
        Self::nearest_of((a, b), &Self::GRID)
    }

    /// snap a bet to the closest sizing the given grid offers.
    ///
    /// which grid matters: only the preflop grid has all ten entries, so snapping a flop
    /// bet against GRID can land on a sizing the tree never branches to (a quarter-pot
    /// flop bet, say), and the resulting Edge appears in no infoset the trainer wrote.
    /// `nearest` keeps the preflop default for callers that are preflop by construction.
    pub fn nearest_of((a, b): (Chips, Chips), grid: &[Self]) -> Self {
        let odds = a as Utility / b as Utility;
        grid.iter()
            .min_by(|x, y| {
                let dx = (Probability::from(**x) - odds).abs();
                let dy = (Probability::from(**y) - odds).abs();
                dx.partial_cmp(&dy).expect("not NaN")
            })
            .copied()
            .unwrap_or(Self(1, 1))
    }
    pub const GRID: [Self; 10] = Self::PREF_RAISES;
    pub const PREF_RAISES: [Self; 10] = [
        Self(1, 4), // 0.25
        Self(1, 3), // 0.33
        Self(1, 2), // 0.50
        Self(2, 3), // 0.66
        Self(3, 4), // 0.75
        Self(1, 1), // 1.00
        Self(3, 2), // 1.50
        Self(2, 1), // 2.00
        Self(3, 1), // 3.00
        Self(4, 1), // 4.00
    ];
    pub const FLOP_RAISES: [Self; 5] = [
        Self(1, 2), // 0.50
        Self(3, 4), // 0.75
        Self(1, 1), // 1.00
        Self(3, 2), // 1.50
        Self(2, 1), // 2.00
    ];
    pub const LATE_RAISES: [Self; 2] = [
        Self(1, 2), // 0.50
        Self(1, 1), // 1.00
    ];
    pub const LAST_RAISES: [Self; 1] = [
        Self(1, 1), // 1.00
    ];
}

/// the sizing as a pot fraction, e.g. `2/3` or `3/2`.
///
/// the previous format rounded the ratio to an integer, which is not injective over the
/// grid: 1/2 and 2/3 both came out `+2`, 3/4 and 1/1 both `+1`, 3/2 and 2/1 both `-2`. a
/// strategy therefore listed the same label two or three times with different weights, and
/// the reader had no way to tell which sizing each row meant. the pair is already reduced
/// by gcd in the constructor, so printing it distinguishes every entry in every grid.
impl std::fmt::Display for Odds {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}/{}", self.0, self.1)
    }
}

impl Arbitrary for Odds {
    fn random() -> Self {
        use rand::prelude::IndexedRandom;
        let ref mut rng = rand::rng();
        Self::GRID
            .choose(rng)
            .copied()
            .expect("GRID is empty")
    }
}
