use std::hash::{Hash, Hasher};

pub fn hash_with_seed<T: Hash>(value: &T, seed: u64) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    seed.hash(&mut hasher);
    value.hash(&mut hasher);
    hasher.finish()
}

pub fn cmp_f64_desc(lhs: f64, rhs: f64) -> std::cmp::Ordering {
    rhs.partial_cmp(&lhs).unwrap_or(std::cmp::Ordering::Equal)
}
