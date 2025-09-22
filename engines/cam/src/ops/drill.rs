use crate::error::{CamError, CamResult};
use crate::geometry::{Point2, Point3};
use crate::linking::rapid_to_safe;
use crate::toolpath::{ToolMotion, Toolpath};

use super::types::OperationSettings;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DrillCycle {
    Simple,
    Peck { peck_depth: f64 },
}

#[derive(Debug, Clone)]
pub struct DrillOperation {
    pub name: String,
    pub points: Vec<Point2>,
    pub top_z: f64,
    pub target_z: f64,
    pub retract_z: f64,
    pub dwell: Option<f64>,
    pub cycle: DrillCycle,
    pub settings: OperationSettings,
}

impl DrillOperation {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        name: impl Into<String>,
        points: Vec<Point2>,
        top_z: f64,
        target_z: f64,
        retract_z: f64,
        dwell: Option<f64>,
        cycle: DrillCycle,
        settings: OperationSettings,
    ) -> CamResult<Self> {
        if points.is_empty() {
            return Err(CamError::InvalidArgument(
                "drill operation needs at least one point".into(),
            ));
        }
        if target_z >= top_z {
            return Err(CamError::InvalidArgument(
                "target Z must be below the surface".into(),
            ));
        }
        if retract_z < top_z {
            return Err(CamError::InvalidArgument(
                "retract height must be above surface".into(),
            ));
        }
        if matches!(cycle, DrillCycle::Peck { peck_depth } if peck_depth <= 0.0) {
            return Err(CamError::InvalidArgument(
                "peck depth must be positive".into(),
            ));
        }

        Ok(Self {
            name: name.into(),
            points,
            top_z,
            target_z,
            retract_z,
            dwell,
            cycle,
            settings,
        })
    }

    pub fn plan(&self) -> CamResult<Toolpath> {
        let tool = &self.settings.tool;
        let linking = self.settings.linking;
        let mut path = Toolpath::new(self.name.clone(), linking.safe_z);

        for point in &self.points {
            rapid_to_safe(&mut path, *point, &linking);

            match self.cycle {
                DrillCycle::Simple => {
                    path.push(ToolMotion::Feed {
                        to: Point3::new(point.x, point.y, self.target_z),
                        feed: tool.plunge_rate,
                    });
                    if let Some(dwell) = self.dwell {
                        path.push(ToolMotion::Dwell { seconds: dwell });
                    }
                    path.push(ToolMotion::Feed {
                        to: Point3::new(point.x, point.y, self.retract_z),
                        feed: tool.plunge_rate,
                    });
                }
                DrillCycle::Peck { peck_depth } => {
                    let mut current = self.top_z;
                    while current > self.target_z + 1e-9 {
                        let next = (current - peck_depth).max(self.target_z);
                        path.push(ToolMotion::Feed {
                            to: Point3::new(point.x, point.y, next),
                            feed: tool.plunge_rate,
                        });
                        if let Some(dwell) = self.dwell {
                            path.push(ToolMotion::Dwell { seconds: dwell });
                        }
                        current = next;
                        if current > self.target_z + 1e-9 {
                            path.push(ToolMotion::Feed {
                                to: Point3::new(point.x, point.y, self.retract_z),
                                feed: tool.plunge_rate,
                            });
                        }
                    }
                    path.push(ToolMotion::Feed {
                        to: Point3::new(point.x, point.y, self.retract_z),
                        feed: tool.plunge_rate,
                    });
                }
            }
        }

        Ok(path)
    }
}
