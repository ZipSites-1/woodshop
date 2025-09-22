use crate::error::{CamError, CamResult};
use crate::geometry::Point3;
use crate::toolpath::{ToolMotion, Toolpath};

const TOLERANCE: f64 = 1e-6;

#[derive(Debug, Clone, Copy)]
pub struct SimulationSettings {
    pub safe_z: f64,
    pub min_z: f64,
}

impl SimulationSettings {
    pub fn new(safe_z: f64, min_z: f64) -> Self {
        Self { safe_z, min_z }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum CollisionReason {
    RapidBelowSafe,
    BelowMinimumZ,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Collision {
    pub motion_index: usize,
    pub position: Point3,
    pub reason: CollisionReason,
}

#[derive(Debug, Clone, Default)]
pub struct SimulationReport {
    pub collisions: Vec<Collision>,
}

impl SimulationReport {
    pub fn is_ok(&self) -> bool {
        self.collisions.is_empty()
    }
}

pub fn simulate(toolpath: &Toolpath, settings: SimulationSettings) -> CamResult<SimulationReport> {
    if toolpath.is_empty() {
        return Err(CamError::InvalidInput(
            "toolpath must contain at least one motion".into(),
        ));
    }

    let mut report = SimulationReport::default();
    let mut position = Point3::new(0.0, 0.0, settings.safe_z);

    for (index, motion) in toolpath.iter().enumerate() {
        match motion {
            ToolMotion::Rapid { to } => {
                if to.z + TOLERANCE < settings.safe_z {
                    report.collisions.push(Collision {
                        motion_index: index,
                        position: *to,
                        reason: CollisionReason::RapidBelowSafe,
                    });
                }
                position = *to;
            }
            ToolMotion::Feed { to, .. } => {
                if to.z + TOLERANCE < settings.min_z {
                    report.collisions.push(Collision {
                        motion_index: index,
                        position: *to,
                        reason: CollisionReason::BelowMinimumZ,
                    });
                }
                if position.z + TOLERANCE < settings.min_z {
                    report.collisions.push(Collision {
                        motion_index: index.saturating_sub(1),
                        position,
                        reason: CollisionReason::BelowMinimumZ,
                    });
                }
                position = *to;
            }
            ToolMotion::Dwell { .. } => {}
        }
    }

    Ok(report)
}
