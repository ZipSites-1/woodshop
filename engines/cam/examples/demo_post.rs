use std::fs::{create_dir_all, write};

use cam::linking::{LeadStrategy, LinkingSettings, RampStrategy};
use cam::ops::{ContourOperation, ContourSide, OperationSettings, Tool};
use cam::post::grbl::{validate_program, write_program};
use cam::simulate::{SimulationSettings, simulate};
use cam::tabs::Tab;
use cam::{CamError, CamResult, Point2};

fn main() -> CamResult<()> {
    let tool = Tool::new(6.35, 900.0, 180.0, 12000.0)?;

    let mut linking = LinkingSettings::new(8.0, 15.0, tool.plunge_rate);
    linking.lead_in = LeadStrategy::Linear { length: 5.0 };
    linking.lead_out = LeadStrategy::Linear { length: 5.0 };
    linking.ramp = RampStrategy::Plunge;

    let settings = OperationSettings::new(tool.clone(), linking);

    let boundary = vec![
        Point2::new(0.0, 0.0),
        Point2::new(120.0, 0.0),
        Point2::new(120.0, 80.0),
        Point2::new(0.0, 80.0),
    ];

    let tabs = vec![Tab::new(0.25, 6.0, 1.5), Tab::new(0.75, 6.0, 1.5)];

    let contour = ContourOperation::new(
        "demo_contour",
        boundary,
        ContourSide::Outside,
        5.0,
        -5.0,
        2.0,
        settings,
        tabs,
    )?;

    let toolpath = contour.plan()?;
    let program = write_program(&toolpath, &tool)?;
    validate_program(&program)?;

    let report = simulate(&toolpath, SimulationSettings::new(toolpath.safe_z, -6.0))?;
    assert!(
        report.is_ok(),
        "unexpected collisions: {:?}",
        report.collisions
    );

    let artifact_dir = "artifacts/demo";
    create_dir_all(artifact_dir)
        .map_err(|err| CamError::InvalidInput(format!("failed to create artifacts dir: {err}")))?;
    let program_path = format!("{artifact_dir}/demo_post.nc");
    write(&program_path, program.as_bytes())
        .map_err(|err| CamError::InvalidInput(format!("failed to write G-code: {err}")))?;

    println!("G-code written to {program_path}");
    Ok(())
}
