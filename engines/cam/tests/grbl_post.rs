use cam::geometry::Point3;
use cam::linking::LinkingSettings;
use cam::ops::{ContourOperation, ContourSide, OperationSettings, Tool};
use cam::post::grbl::{validate_program, write_program};
use cam::tabs::Tab;
use cam::{ToolMotion, Toolpath};

#[test]
fn grbl_post_renders_header_and_footer() {
    let tool = Tool::new(6.0, 600.0, 200.0, 12000.0).unwrap();
    let mut path = Toolpath::new("demo", 5.0);
    path.push(ToolMotion::Rapid {
        to: Point3::new(0.0, 0.0, 5.0),
    });
    path.push(ToolMotion::Feed {
        to: Point3::new(10.0, 0.0, -1.0),
        feed: tool.feed_rate,
    });
    path.push(ToolMotion::Feed {
        to: Point3::new(10.0, 10.0, -1.0),
        feed: tool.feed_rate,
    });
    path.push(ToolMotion::Rapid {
        to: Point3::new(10.0, 10.0, 5.0),
    });

    let program = write_program(&path, &tool).unwrap();
    let lines: Vec<_> = program.lines().collect();
    assert!(lines[0].contains("G21"));
    assert!(lines.last().unwrap().contains("M2"));
    validate_program(&program).unwrap();
}

#[test]
fn contour_pipeline_posts_without_collisions() {
    let tool = Tool::new(8.0, 800.0, 220.0, 14000.0).unwrap();
    let mut linking = LinkingSettings::new(8.0, 15.0, tool.plunge_rate);
    linking.lead_in = cam::linking::LeadStrategy::Linear { length: 5.0 };
    linking.lead_out = cam::linking::LeadStrategy::Linear { length: 5.0 };
    let settings = OperationSettings::new(tool.clone(), linking);

    let boundary = vec![
        cam::Point2::new(0.0, 0.0),
        cam::Point2::new(60.0, 0.0),
        cam::Point2::new(60.0, 40.0),
        cam::Point2::new(0.0, 40.0),
    ];
    let op = ContourOperation::new(
        "panel",
        boundary,
        ContourSide::Outside,
        0.0,
        -4.0,
        2.0,
        settings,
        vec![Tab::new(0.25, 4.0, 1.0)],
    )
    .unwrap();

    let toolpath = op.plan().unwrap();
    let program = write_program(&toolpath, &tool).unwrap();
    validate_program(&program).unwrap();
}
