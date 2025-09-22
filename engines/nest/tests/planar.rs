use nest::{
    GrainDirection, PlanarNestConfig, RectPart, SheetStock, best_fit_sheets, skyline_sheets,
    summarize_sheet_layouts,
};

fn sheet_fixture() -> Vec<SheetStock> {
    vec![SheetStock {
        id: "sheet-96x48".into(),
        width: 2438.4,
        height: 1219.2,
        quantity: 2,
    }]
}

#[test]
fn grain_constraints_prevent_rotation() {
    let parts = vec![RectPart {
        id: "panel".into(),
        width: 1000.0,
        height: 300.0,
        quantity: 2,
        grain: GrainDirection::AlongX,
    }];

    let layouts = best_fit_sheets(
        &parts,
        &sheet_fixture(),
        &PlanarNestConfig {
            kerf: 3.0,
            trim: 6.0,
            seed: 123,
        },
    )
    .expect("nest succeeds");

    assert!(!layouts[0].placements[0].rotated);
}

#[test]
fn skyline_allows_rotation_when_either() {
    let parts = vec![RectPart {
        id: "brace".into(),
        width: 300.0,
        height: 600.0,
        quantity: 4,
        grain: GrainDirection::Either,
    }];

    let layouts = skyline_sheets(
        &parts,
        &sheet_fixture(),
        &PlanarNestConfig {
            kerf: 2.0,
            trim: 10.0,
            seed: 99,
        },
    )
    .expect("nest succeeds");

    assert!(
        layouts
            .iter()
            .any(|layout| layout.placements.iter().any(|p| p.rotated))
    );
}

#[test]
fn deterministic_with_seed() {
    let parts: Vec<RectPart> = (0..6)
        .map(|idx| RectPart {
            id: format!("tile-{idx}"),
            width: 400.0,
            height: 400.0,
            quantity: 1,
            grain: GrainDirection::Either,
        })
        .collect();

    let stock = sheet_fixture();

    let cfg_a = PlanarNestConfig {
        kerf: 1.5,
        trim: 5.0,
        seed: 4,
    };
    let cfg_b = PlanarNestConfig { seed: 10, ..cfg_a };

    let a_first = best_fit_sheets(&parts, &stock, &cfg_a).unwrap();
    let a_again = best_fit_sheets(&parts, &stock, &cfg_a).unwrap();
    let b_first = best_fit_sheets(&parts, &stock, &cfg_b).unwrap();

    assert_eq!(a_first, a_again, "same seed must maintain ordering");
    assert_ne!(
        a_first, b_first,
        "different seed should change tie-breaking"
    );
}

#[test]
fn utilization_breakdown_reports_totals() {
    let parts = vec![RectPart {
        id: "panel".into(),
        width: 800.0,
        height: 400.0,
        quantity: 5,
        grain: GrainDirection::Either,
    }];
    let stock = sheet_fixture();
    let cfg = PlanarNestConfig {
        kerf: 1.0,
        trim: 8.0,
        seed: 7,
    };

    let layouts = best_fit_sheets(&parts, &stock, &cfg).unwrap();
    let summary = summarize_sheet_layouts(&layouts);

    assert!(summary.stock_total > 0.0);
    assert!(summary.utilized > 0.0);
    assert!(summary.efficiency() > 0.25);
}
