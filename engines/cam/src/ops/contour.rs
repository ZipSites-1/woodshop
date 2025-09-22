use crate::error::{CamError, CamResult};
use crate::geometry::{Point2, Point3, polyline_length};
use crate::linking::{apply_linear_leads, entry_moves, exit_moves};
use crate::offsets::{OffsetSide, offset_polygon};
use crate::tabs::{Tab, depth_with_tabs};
use crate::toolpath::{ToolMotion, Toolpath};

use super::types::OperationSettings;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ContourSide {
    Inside,
    Outside,
}

#[derive(Debug, Clone)]
pub struct ContourOperation {
    pub name: String,
    pub boundary: Vec<Point2>,
    pub side: ContourSide,
    pub top_z: f64,
    pub target_z: f64,
    pub stepdown: f64,
    pub settings: OperationSettings,
    pub tabs: Vec<Tab>,
}

impl ContourOperation {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        name: impl Into<String>,
        boundary: Vec<Point2>,
        side: ContourSide,
        top_z: f64,
        target_z: f64,
        stepdown: f64,
        settings: OperationSettings,
        tabs: Vec<Tab>,
    ) -> CamResult<Self> {
        if boundary.len() < 3 {
            return Err(CamError::InvalidArgument(
                "contour boundary requires at least 3 points".into(),
            ));
        }
        if stepdown <= 0.0 {
            return Err(CamError::InvalidArgument(
                "stepdown must be positive".into(),
            ));
        }
        if target_z >= top_z {
            return Err(CamError::InvalidArgument(
                "target Z must be below top Z".into(),
            ));
        }
        Ok(Self {
            name: name.into(),
            boundary,
            side,
            top_z,
            target_z,
            stepdown,
            settings,
            tabs,
        })
    }

    pub fn plan(&self) -> CamResult<Toolpath> {
        let tool = &self.settings.tool;
        let linking = self.settings.linking;
        let side = match self.side {
            ContourSide::Inside => OffsetSide::Inside,
            ContourSide::Outside => OffsetSide::Outside,
        };

        let offset = offset_polygon(&self.boundary, tool.radius(), side)?;

        let mut loop_points = apply_linear_leads(&offset, linking.lead_in, linking.lead_out);

        if loop_points.len() < 2 {
            return Err(CamError::InvalidInput(
                "contour toolpath requires at least two vertices".into(),
            ));
        }

        if loop_points.first() != loop_points.last() {
            let first = *loop_points.first().unwrap();
            loop_points.push(first);
        }

        let total_length = polyline_length(&loop_points, false);

        let mut toolpath = Toolpath::new(self.name.clone(), linking.safe_z);

        let total_depth = (self.top_z - self.target_z).abs();
        let passes = (total_depth / self.stepdown).ceil() as usize;
        let mut depths = Vec::with_capacity(passes);
        for i in 1..=passes {
            let depth = self.top_z - self.stepdown * i as f64;
            depths.push(depth.max(self.target_z));
        }

        for (pass_index, depth) in depths.iter().enumerate() {
            let next_xy = loop_points.get(1).copied();
            let start_idx = entry_moves(
                &mut toolpath,
                loop_points[0],
                next_xy,
                *depth,
                tool.feed_rate,
                &linking,
            );

            let apply_tabs = pass_index == depths.len() - 1 && !self.tabs.is_empty();
            let mut distance = 0.0;
            let mut prev = loop_points[start_idx];

            for point in loop_points.iter().skip(start_idx + 1) {
                distance += prev.distance(point);
                let final_depth = if apply_tabs {
                    depth_with_tabs(distance, total_length, *depth, &self.tabs)
                } else {
                    *depth
                };

                toolpath.push(ToolMotion::Feed {
                    to: Point3::new(point.x, point.y, final_depth),
                    feed: tool.feed_rate,
                });
                prev = *point;
            }

            exit_moves(
                &mut toolpath,
                loop_points.last().copied().unwrap(),
                &linking,
            );
        }

        Ok(toolpath)
    }
}
