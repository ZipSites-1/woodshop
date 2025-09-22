use crate::error::{CamError, CamResult};
use crate::geometry::{Point2, Point3, polygon_area};
use crate::linking::{apply_linear_leads, entry_moves, exit_moves};
use crate::offsets::{OffsetSide, offset_polygon};
use crate::toolpath::{ToolMotion, Toolpath};

use super::types::OperationSettings;

#[derive(Debug, Clone)]
pub struct PocketOperation {
    pub name: String,
    pub boundary: Vec<Point2>,
    pub top_z: f64,
    pub target_z: f64,
    pub stepdown: f64,
    pub stepover: f64,
    pub settings: OperationSettings,
}

impl PocketOperation {
    pub fn new(
        name: impl Into<String>,
        boundary: Vec<Point2>,
        top_z: f64,
        target_z: f64,
        stepdown: f64,
        stepover: f64,
        settings: OperationSettings,
    ) -> CamResult<Self> {
        if boundary.len() < 3 {
            return Err(CamError::InvalidArgument(
                "pocket boundary requires at least three points".into(),
            ));
        }
        if target_z >= top_z {
            return Err(CamError::InvalidArgument(
                "target Z must be below top Z".into(),
            ));
        }
        if stepdown <= 0.0 {
            return Err(CamError::InvalidArgument(
                "stepdown must be positive".into(),
            ));
        }
        if stepover <= 0.0 {
            return Err(CamError::InvalidArgument(
                "stepover must be positive".into(),
            ));
        }
        if stepover > settings.tool.diameter {
            return Err(CamError::InvalidArgument(
                "stepover must be <= tool diameter".into(),
            ));
        }

        Ok(Self {
            name: name.into(),
            boundary,
            top_z,
            target_z,
            stepdown,
            stepover,
            settings,
        })
    }

    pub fn plan(&self) -> CamResult<Toolpath> {
        let tool = &self.settings.tool;
        let linking = self.settings.linking;
        let loops = generate_loops(&self.boundary, tool.radius(), self.stepover)?;

        if loops.is_empty() {
            return Err(CamError::InvalidInput(
                "failed to produce pocket offsets".into(),
            ));
        }

        let mut toolpath = Toolpath::new(self.name.clone(), linking.safe_z);

        let total_depth = (self.top_z - self.target_z).abs();
        let passes = (total_depth / self.stepdown).ceil() as usize;
        let mut depths = Vec::with_capacity(passes);
        for i in 1..=passes {
            let depth = self.top_z - self.stepdown * i as f64;
            depths.push(depth.max(self.target_z));
        }

        for depth in depths {
            for loop_points in &loops {
                let mut loop_points =
                    apply_linear_leads(loop_points, linking.lead_in, linking.lead_out);
                if loop_points.first() != loop_points.last() {
                    let first = *loop_points.first().unwrap();
                    loop_points.push(first);
                }
                let next_xy = loop_points.get(1).copied();
                let start_idx = entry_moves(
                    &mut toolpath,
                    loop_points[0],
                    next_xy,
                    depth,
                    tool.feed_rate,
                    &linking,
                );

                for point in loop_points.iter().skip(start_idx + 1) {
                    toolpath.push(ToolMotion::Feed {
                        to: Point3::new(point.x, point.y, depth),
                        feed: tool.feed_rate,
                    });
                }

                exit_moves(
                    &mut toolpath,
                    loop_points.last().copied().unwrap(),
                    &linking,
                );

                // pocket loops run from outside to inside; ensure consistent ordering
            }
        }

        Ok(toolpath)
    }
}

fn generate_loops(boundary: &[Point2], radius: f64, stepover: f64) -> CamResult<Vec<Vec<Point2>>> {
    let mut loops = Vec::new();
    let mut current = offset_polygon(boundary, radius, OffsetSide::Inside)?;
    let mut last_area = polygon_area(&current).abs();
    if current.len() < 3 || last_area < 1e-6 {
        return Err(CamError::InvalidInput("pocket too small for tool".into()));
    }
    loops.push(current.clone());

    const MAX_LOOPS: usize = 256;
    let mut iterations = 0;
    loop {
        if iterations >= MAX_LOOPS {
            return Err(CamError::InvalidInput(
                "pocket offsets failed to converge".into(),
            ));
        }
        iterations += 1;
        match offset_polygon(&current, stepover, OffsetSide::Inside) {
            Ok(next) => {
                if next.len() < 3 {
                    break;
                }
                let area = polygon_area(&next).abs();
                if area < 1e-4 {
                    break;
                }
                if (last_area - area).abs() < 1e-6 {
                    break;
                }
                loops.push(next.clone());
                current = next;
                last_area = area;
            }
            Err(_) => break,
        }
    }

    Ok(loops)
}
