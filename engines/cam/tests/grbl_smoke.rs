use cam::geometry::Point2;
use cam::linking::{LeadStrategy, LinkingSettings, RampStrategy};
use cam::ops::{OperationSettings, PocketOperation, Tool};
use cam::post::grbl::{validate_program, write_program};
use cam::simulate::{SimulationSettings, simulate};

#[test]
fn pocket_program_passes_smoke_validation() {
    let tool = Tool::new(6.0, 700.0, 180.0, 11000.0).unwrap();
    let mut linking = LinkingSettings::new(6.0, 10.0, tool.plunge_rate);
    linking.lead_in = LeadStrategy::Linear { length: 3.0 };
    linking.lead_out = LeadStrategy::Linear { length: 3.0 };
    linking.ramp = RampStrategy::Plunge;
    let settings = OperationSettings::new(tool.clone(), linking);

    let boundary = vec![
        Point2::new(0.0, 0.0),
        Point2::new(40.0, 0.0),
        Point2::new(40.0, 30.0),
        Point2::new(0.0, 30.0),
    ];
    let op = PocketOperation::new("smoke", boundary, 0.0, -5.0, 2.0, 3.0, settings).unwrap();

    let toolpath = op.plan().unwrap();
    let program = write_program(&toolpath, &tool).unwrap();
    validate_program(&program).unwrap();

    let report = simulate(&toolpath, SimulationSettings::new(toolpath.safe_z, -6.0)).unwrap();
    assert!(
        report.is_ok(),
        "simulation collisions: {:?}",
        report.collisions
    );
}
