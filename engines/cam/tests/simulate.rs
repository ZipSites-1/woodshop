use cam::geometry::Point3;
use cam::simulate::{CollisionReason, SimulationSettings, simulate};
use cam::toolpath::{ToolMotion, Toolpath};

#[test]
fn simulator_flags_rapid_below_safe() {
    let mut path = Toolpath::new("safety", 5.0);
    path.push(ToolMotion::Rapid {
        to: Point3::new(0.0, 0.0, 4.0),
    });
    let report = simulate(&path, SimulationSettings::new(5.0, -10.0)).unwrap();
    assert!(!report.is_ok());
    assert_eq!(report.collisions[0].reason, CollisionReason::RapidBelowSafe);
}

#[test]
fn simulator_detects_depth_violations() {
    let mut path = Toolpath::new("depth", 6.0);
    path.push(ToolMotion::Rapid {
        to: Point3::new(0.0, 0.0, 6.0),
    });
    path.push(ToolMotion::Feed {
        to: Point3::new(0.0, 0.0, -12.0),
        feed: 400.0,
    });

    let report = simulate(&path, SimulationSettings::new(6.0, -10.0)).unwrap();
    assert!(!report.is_ok());
    assert_eq!(report.collisions[0].reason, CollisionReason::BelowMinimumZ);
}

#[test]
fn simulator_accepts_safe_toolpath() {
    let mut path = Toolpath::new("ok", 8.0);
    path.push(ToolMotion::Rapid {
        to: Point3::new(0.0, 0.0, 8.0),
    });
    path.push(ToolMotion::Feed {
        to: Point3::new(0.0, 0.0, -3.0),
        feed: 500.0,
    });
    path.push(ToolMotion::Rapid {
        to: Point3::new(0.0, 0.0, 8.0),
    });

    let report = simulate(&path, SimulationSettings::new(8.0, -5.0)).unwrap();
    assert!(report.is_ok(), "collisions: {:?}", report.collisions);
}
