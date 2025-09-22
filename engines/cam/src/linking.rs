use crate::geometry::{Point2, Point3, Vec2};
use crate::toolpath::{ToolMotion, Toolpath};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LeadStrategy {
    None,
    Linear { length: f64 },
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum RampStrategy {
    Plunge,
    Linear { length: f64 },
    Helical { radius: f64, revolutions: usize },
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LinkingSettings {
    pub safe_z: f64,
    pub clearance_z: f64,
    pub lead_in: LeadStrategy,
    pub lead_out: LeadStrategy,
    pub ramp: RampStrategy,
    pub plunge_feed: f64,
}

impl LinkingSettings {
    pub fn new(safe_z: f64, clearance_z: f64, plunge_feed: f64) -> Self {
        Self {
            safe_z,
            clearance_z,
            lead_in: LeadStrategy::None,
            lead_out: LeadStrategy::None,
            ramp: RampStrategy::Plunge,
            plunge_feed,
        }
    }
}

pub fn apply_linear_leads(
    points: &[Point2],
    lead_in: LeadStrategy,
    lead_out: LeadStrategy,
) -> Vec<Point2> {
    if points.len() < 2 {
        return points.to_vec();
    }

    let mut result = Vec::with_capacity(points.len() + 2);

    match lead_in {
        LeadStrategy::Linear { length } if length > 1e-6 => {
            let dir = (points[1] - points[0]).normalize();
            let start = Point2::new(points[0].x - dir.x * length, points[0].y - dir.y * length);
            result.push(start);
        }
        _ => {}
    }

    result.extend(points.iter().copied());

    match lead_out {
        LeadStrategy::Linear { length } if length > 1e-6 => {
            let last = *points.last().unwrap();
            let prev = points[points.len() - 2];
            let dir = (last - prev).normalize();
            let end = Point2::new(last.x + dir.x * length, last.y + dir.y * length);
            result.push(end);
        }
        _ => {}
    }

    result
}

pub fn rapid_to_safe(path: &mut Toolpath, target_xy: Point2, settings: &LinkingSettings) {
    if let Some(last) = path.last_position()
        && (last.z - settings.safe_z).abs() > 1e-6
    {
        let lift = Point3::new(last.x, last.y, settings.safe_z);
        path.push(ToolMotion::Rapid { to: lift });
    }

    let safe_point = Point3::new(target_xy.x, target_xy.y, settings.safe_z);
    path.push(ToolMotion::Rapid { to: safe_point });
}

pub fn entry_moves(
    path: &mut Toolpath,
    start_xy: Point2,
    next_xy: Option<Point2>,
    target_z: f64,
    feed: f64,
    settings: &LinkingSettings,
) -> usize {
    match settings.ramp {
        RampStrategy::Helical {
            radius,
            revolutions,
        } => {
            helical_entry(
                path,
                start_xy,
                target_z,
                feed,
                settings,
                radius,
                revolutions,
            );
            0
        }
        RampStrategy::Linear { .. } => {
            rapid_to_safe(path, start_xy, settings);
            if let Some(next) = next_xy {
                path.push(ToolMotion::Feed {
                    to: Point3::new(next.x, next.y, target_z),
                    feed: settings.plunge_feed,
                });
                1
            } else {
                path.push(ToolMotion::Feed {
                    to: Point3::new(start_xy.x, start_xy.y, target_z),
                    feed: settings.plunge_feed,
                });
                0
            }
        }
        RampStrategy::Plunge => {
            rapid_to_safe(path, start_xy, settings);
            path.push(ToolMotion::Feed {
                to: Point3::new(start_xy.x, start_xy.y, target_z),
                feed: settings.plunge_feed,
            });
            0
        }
    }
}

pub fn exit_moves(path: &mut Toolpath, end_xy: Point2, settings: &LinkingSettings) {
    let safe = Point3::new(end_xy.x, end_xy.y, settings.safe_z);
    path.push(ToolMotion::Feed {
        to: safe,
        feed: settings.plunge_feed,
    });
}

fn helical_entry(
    path: &mut Toolpath,
    entry_center: Point2,
    target_z: f64,
    feed: f64,
    settings: &LinkingSettings,
    radius: f64,
    revolutions: usize,
) {
    let revolutions = revolutions.max(1);
    let segments_per_rev = 36;
    let total_segments = revolutions * segments_per_rev;
    let basis_u = Vec2::new(1.0, 0.0);
    let basis_v = Vec2::new(0.0, 1.0);
    let start_xy = entry_center + basis_u * radius;
    let safe_start = Point3::new(start_xy.x, start_xy.y, settings.safe_z);
    path.push(ToolMotion::Rapid { to: safe_start });

    for i in 0..=total_segments {
        let t = i as f64 / total_segments as f64;
        let angle = t * std::f64::consts::TAU * revolutions as f64;
        let cos = angle.cos();
        let sin = angle.sin();
        let xy = entry_center + basis_u * (radius * cos) + basis_v * (radius * sin);
        let z = settings.safe_z + (target_z - settings.safe_z) * t;
        path.push(ToolMotion::Feed {
            to: Point3::new(xy.x, xy.y, z),
            feed: settings.plunge_feed,
        });
    }

    path.push(ToolMotion::Feed {
        to: Point3::new(entry_center.x, entry_center.y, target_z),
        feed,
    });
}
