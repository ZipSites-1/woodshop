use cam::geometry::{Point2, Point3};
use cam::linking::{LeadStrategy, LinkingSettings, RampStrategy};
use cam::ops::{ContourOperation, ContourSide, OperationSettings, Tool};
use cam::tabs::Tab;
use cam::toolpath::ToolMotion;

fn square(size: f64) -> Vec<Point2> {
    vec![
        Point2::new(0.0, 0.0),
        Point2::new(size, 0.0),
        Point2::new(size, size),
        Point2::new(0.0, size),
    ]
}

fn feed_xy_length(motions: &[ToolMotion]) -> f64 {
    let mut last: Option<Point3> = None;
    let mut length = 0.0;
    for motion in motions {
        if let ToolMotion::Feed { to, .. } = motion {
            if let Some(prev) = last {
                let dx = to.x - prev.x;
                let dy = to.y - prev.y;
                length += (dx * dx + dy * dy).sqrt();
            }
            last = Some(*to);
        }
    }
    length
}

#[test]
fn contour_outside_perimeter_matches_offset() {
    let tool = Tool::new(10.0, 800.0, 200.0, 12000.0).unwrap();
    let mut linking = LinkingSettings::new(5.0, 10.0, tool.plunge_rate);
    linking.ramp = RampStrategy::Plunge;
    let settings = OperationSettings::new(tool.clone(), linking);

    let op = ContourOperation::new(
        "square",
        square(40.0),
        ContourSide::Outside,
        0.0,
        -5.0,
        5.0,
        settings,
        vec![],
    )
    .unwrap();

    let path = op.plan().unwrap();

    let length = feed_xy_length(&path.motions);
    assert!((length - 200.0).abs() < 1e-4, "length={length}");
}

#[test]
fn contour_tabs_leave_material() {
    let tool = Tool::new(6.0, 600.0, 180.0, 10000.0).unwrap();
    let mut linking = LinkingSettings::new(6.0, 12.0, tool.plunge_rate);
    linking.lead_in = LeadStrategy::Linear { length: 4.0 };
    linking.lead_out = LeadStrategy::Linear { length: 4.0 };
    linking.ramp = RampStrategy::Linear { length: 6.0 };
    let settings = OperationSettings::new(tool.clone(), linking);

    let tabs = vec![Tab::new(0.25, 6.0, 1.2), Tab::new(0.75, 6.0, 1.2)];

    let op = ContourOperation::new(
        "panel",
        square(80.0),
        ContourSide::Inside,
        0.0,
        -8.0,
        2.5,
        settings,
        tabs,
    )
    .unwrap();

    let a = op.plan().unwrap();
    let b = op.plan().unwrap();
    assert_eq!(a.motions, b.motions, "deterministic planning");

    let mut min_z = 0.0;
    let mut max_z = f64::NEG_INFINITY;
    for motion in &a.motions {
        if let ToolMotion::Feed { to, .. } = motion {
            if to.z <= 0.0 {
                if to.z < min_z {
                    min_z = to.z;
                }
                if to.z > max_z {
                    max_z = to.z;
                }
            }
        }
    }
    assert!((min_z - -8.0).abs() < 1e-6);
    // Tabs should raise the cut slightly above final depth
    assert!(max_z > -7.0 && max_z < 0.1);
}
