use cam::geometry::Point2;
use cam::linking::{LinkingSettings, RampStrategy};
use cam::ops::{OperationSettings, PocketOperation, Tool};
use cam::toolpath::ToolMotion;

fn rectangle(width: f64, height: f64) -> Vec<Point2> {
    vec![
        Point2::new(0.0, 0.0),
        Point2::new(width, 0.0),
        Point2::new(width, height),
        Point2::new(0.0, height),
    ]
}

#[test]
fn pocket_clears_inside_boundary() {
    let tool = Tool::new(8.0, 900.0, 250.0, 14000.0).unwrap();
    let mut linking = LinkingSettings::new(8.0, 16.0, tool.plunge_rate);
    linking.ramp = RampStrategy::Plunge;
    let settings = OperationSettings::new(tool.clone(), linking);

    let op =
        PocketOperation::new("rect", rectangle(60.0, 40.0), 0.0, -6.0, 3.0, 4.0, settings).unwrap();

    let path = op.plan().unwrap();
    assert!(!path.motions.is_empty());

    let mut min_x = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_y = f64::NEG_INFINITY;

    for motion in &path.motions {
        if let ToolMotion::Feed { to, .. } = motion {
            if to.z < 0.0 {
                min_x = min_x.min(to.x);
                max_x = max_x.max(to.x);
                min_y = min_y.min(to.y);
                max_y = max_y.max(to.y);
            }
        }
    }

    let radius = tool.radius();
    assert!(min_x >= radius - 1e-6);
    assert!(min_y >= radius - 1e-6);
    assert!(max_x <= 60.0 - radius + 1e-6);
    assert!(max_y <= 40.0 - radius + 1e-6);
}

#[test]
fn pocket_respects_safe_height() {
    let tool = Tool::new(10.0, 700.0, 220.0, 12000.0).unwrap();
    let mut linking = LinkingSettings::new(12.0, 20.0, tool.plunge_rate);
    linking.ramp = RampStrategy::Linear { length: 5.0 };
    let settings = OperationSettings::new(tool.clone(), linking);

    let op = PocketOperation::new(
        "safety",
        rectangle(50.0, 30.0),
        0.0,
        -5.0,
        2.0,
        4.0,
        settings,
    )
    .unwrap();

    let path = op.plan().unwrap();
    for motion in &path.motions {
        if let ToolMotion::Rapid { to } = motion {
            assert!(to.z >= path.safe_z - 1e-6);
        }
    }
}
