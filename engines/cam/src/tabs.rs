#[derive(Debug, Clone, PartialEq)]
pub struct Tab {
    pub position: f64, // normalized 0..1
    pub width: f64,
    pub height: f64,
}

impl Tab {
    pub fn new(position: f64, width: f64, height: f64) -> Self {
        Self {
            position,
            width,
            height,
        }
    }
}

pub fn depth_with_tabs(distance: f64, loop_length: f64, target_depth: f64, tabs: &[Tab]) -> f64 {
    if loop_length <= 1e-6 || tabs.is_empty() {
        return target_depth;
    }

    let wrapped = distance.rem_euclid(loop_length);

    for tab in tabs {
        let center = tab.position.rem_euclid(1.0) * loop_length;
        let half = tab.width * 0.5;
        let start = (center - half).rem_euclid(loop_length);
        let end = (center + half).rem_euclid(loop_length);
        if interval_contains(wrapped, start, end, loop_length) {
            return (target_depth + tab.height).min(0.0);
        }
    }

    target_depth
}

fn interval_contains(value: f64, start: f64, end: f64, _wrap: f64) -> bool {
    if start <= end {
        value >= start - 1e-6 && value <= end + 1e-6
    } else {
        value >= start - 1e-6 || value <= end + 1e-6
    }
}
