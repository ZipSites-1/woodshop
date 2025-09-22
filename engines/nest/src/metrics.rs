#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MetricKind {
    Linear,
    Area,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct UtilizationBreakdown {
    pub kind: MetricKind,
    pub utilized: f64,
    pub kerf_loss: f64,
    pub trim_loss: f64,
    pub offcut_loss: f64,
    pub stock_total: f64,
}

impl UtilizationBreakdown {
    pub fn new(kind: MetricKind) -> Self {
        Self {
            kind,
            utilized: 0.0,
            kerf_loss: 0.0,
            trim_loss: 0.0,
            offcut_loss: 0.0,
            stock_total: 0.0,
        }
    }

    pub fn efficiency(&self) -> f64 {
        if self.stock_total <= f64::EPSILON {
            1.0
        } else {
            (self.utilized / self.stock_total).clamp(0.0, 1.0)
        }
    }
}
