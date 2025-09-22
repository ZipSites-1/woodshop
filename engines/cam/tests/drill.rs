use cam::geometry::Point2;
use cam::linking::LinkingSettings;
use cam::ops::{DrillCycle, DrillOperation, OperationSettings, Tool};
use cam::toolpath::ToolMotion;

#[test]
fn drill_peck_cycle_respects_retracts() {
    let tool = Tool::new(5.0, 400.0, 180.0, 9000.0).unwrap();
    let linking = LinkingSettings::new(6.0, 10.0, tool.plunge_rate);
    let settings = OperationSettings::new(tool.clone(), linking);

    let op = DrillOperation::new(
        "holes",
        vec![Point2::new(0.0, 0.0)],
        0.0,
        -10.0,
        2.0,
        Some(0.25),
        DrillCycle::Peck { peck_depth: 3.0 },
        settings,
    )
    .unwrap();

    let path = op.plan().unwrap();

    // Expect alternating feed to depth and retract
    let feeds: Vec<_> = path
        .motions
        .iter()
        .filter_map(|m| match m {
            ToolMotion::Feed { to, .. } => Some(to.z),
            _ => None,
        })
        .collect();

    assert_eq!(feeds.first().copied().unwrap(), -3.0);
    assert!(feeds.contains(&-10.0));
    assert!(feeds.iter().any(|z| (*z - 2.0).abs() < 1e-9));
}

#[test]
fn drill_simple_cycle_single_pass() {
    let tool = Tool::new(6.0, 500.0, 150.0, 8000.0).unwrap();
    let linking = LinkingSettings::new(5.0, 8.0, tool.plunge_rate);
    let settings = OperationSettings::new(tool.clone(), linking);

    let op = DrillOperation::new(
        "single",
        vec![Point2::new(5.0, 5.0)],
        1.0,
        -4.0,
        2.0,
        None,
        DrillCycle::Simple,
        settings,
    )
    .unwrap();

    let path = op.plan().unwrap();

    let mut hits_target = false;
    let mut retracts_above_surface = true;
    for motion in &path.motions {
        match motion {
            ToolMotion::Feed { to, .. } => {
                if (to.z + 4.0).abs() < 1e-9 {
                    hits_target = true;
                }
                if to.z < 1.0 - 1e-6 && to.z > 0.0 {
                    retracts_above_surface = false;
                }
            }
            ToolMotion::Rapid { to } => {
                assert!(to.z >= path.safe_z - 1e-6);
            }
            _ => {}
        }
    }

    assert!(hits_target);
    assert!(retracts_above_surface);
}
