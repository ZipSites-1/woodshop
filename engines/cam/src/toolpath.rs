use std::fmt;

use crate::geometry::Point3;

#[derive(Debug, Clone, PartialEq)]
pub enum ToolMotion {
    Rapid { to: Point3 },
    Feed { to: Point3, feed: f64 },
    Dwell { seconds: f64 },
}

impl ToolMotion {
    pub fn end_position(&self) -> Point3 {
        match self {
            ToolMotion::Rapid { to } | ToolMotion::Feed { to, .. } => *to,
            ToolMotion::Dwell { .. } => Point3::new(0.0, 0.0, 0.0),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Toolpath {
    pub name: String,
    pub motions: Vec<ToolMotion>,
    pub safe_z: f64,
}

impl Toolpath {
    pub fn new(name: impl Into<String>, safe_z: f64) -> Self {
        Self {
            name: name.into(),
            motions: Vec::new(),
            safe_z,
        }
    }

    pub fn last_position(&self) -> Option<Point3> {
        self.motions.last().map(|m| match m {
            ToolMotion::Rapid { to } | ToolMotion::Feed { to, .. } => *to,
            ToolMotion::Dwell { .. } => Point3::new(0.0, 0.0, self.safe_z),
        })
    }

    pub fn push(&mut self, motion: ToolMotion) {
        self.motions.push(motion);
    }

    pub fn is_empty(&self) -> bool {
        self.motions.is_empty()
    }

    pub fn iter(&self) -> impl Iterator<Item = &ToolMotion> {
        self.motions.iter()
    }

    pub fn total_length(&self) -> f64 {
        let mut length = 0.0;
        let mut last: Option<Point3> = None;
        for motion in &self.motions {
            match motion {
                ToolMotion::Rapid { to } | ToolMotion::Feed { to, .. } => {
                    if let Some(prev) = last {
                        length += ((to.x - prev.x).powi(2)
                            + (to.y - prev.y).powi(2)
                            + (to.z - prev.z).powi(2))
                        .sqrt();
                    }
                    last = Some(*to);
                }
                ToolMotion::Dwell { .. } => {}
            }
        }
        length
    }
}

impl fmt::Display for Toolpath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Toolpath: {} (safe Z = {:.3})", self.name, self.safe_z)?;
        for motion in &self.motions {
            match motion {
                ToolMotion::Rapid { to } => {
                    writeln!(f, "  RAPID -> X{:.3} Y{:.3} Z{:.3}", to.x, to.y, to.z)?;
                }
                ToolMotion::Feed { to, feed } => {
                    writeln!(
                        f,
                        "  FEED  -> X{:.3} Y{:.3} Z{:.3} F{:.1}",
                        to.x, to.y, to.z, feed
                    )?;
                }
                ToolMotion::Dwell { seconds } => {
                    writeln!(f, "  DWELL {:.3}s", seconds)?;
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ToolState {
    pub feed: f64,
    pub spindle_rpm: f64,
}

impl ToolState {
    pub fn new(feed: f64, spindle_rpm: f64) -> Self {
        Self { feed, spindle_rpm }
    }
}
