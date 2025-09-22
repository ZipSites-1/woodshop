use nest::{
    LinearNestConfig, LinearNestResult, LinearPart, LinearStock, NestError, first_fit_boards,
};

fn approx_eq(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-6
}

#[test]
fn first_fit_accounts_for_kerf_and_trim() {
    let parts = vec![
        LinearPart {
            id: "panel-a".into(),
            length: 900.0,
            quantity: 2,
        },
        LinearPart {
            id: "panel-b".into(),
            length: 450.0,
            quantity: 1,
        },
        LinearPart {
            id: "panel-c".into(),
            length: 300.0,
            quantity: 2,
        },
    ];

    let stock = vec![LinearStock {
        id: "spruce-3m".into(),
        length: 3000.0,
        quantity: 2,
    }];

    let config = LinearNestConfig {
        kerf: 3.0,
        trim_leading: 10.0,
        trim_trailing: 12.0,
        seed: 11,
    };

    let result = first_fit_boards(&parts, &stock, &config).expect("nesting succeeds");
    assert_eq!(result.boards.len(), 1, "expected a single board to suffice");

    let first_board = &result.boards[0];
    let first_cut = &first_board.cuts[0];
    assert!(approx_eq(first_cut.start, config.trim_leading));

    if first_board.cuts.len() >= 2 {
        let second_cut = &first_board.cuts[1];
        assert!(second_cut.start - (first_cut.start + first_cut.length) >= config.kerf - 1e-6);
    }

    let efficiency = result.metrics.efficiency();
    assert!(
        efficiency > 0.8,
        "expected good utilization, got {efficiency:.3}"
    );

    let offcut_total: f64 = result
        .boards
        .iter()
        .flat_map(|board| board.offcuts.iter())
        .map(|offcut| offcut.length)
        .sum();
    assert!(offcut_total > 0.0);
}

#[test]
fn seed_controls_tie_breaks() {
    let parts = vec![
        LinearPart {
            id: "shelf-a".into(),
            length: 600.0,
            quantity: 1,
        },
        LinearPart {
            id: "shelf-b".into(),
            length: 600.0,
            quantity: 1,
        },
        LinearPart {
            id: "shelf-c".into(),
            length: 600.0,
            quantity: 1,
        },
    ];
    let stock = vec![LinearStock {
        id: "beam".into(),
        length: 1205.0,
        quantity: 2,
    }];

    let cfg_a = LinearNestConfig {
        kerf: 2.0,
        trim_leading: 0.0,
        trim_trailing: 0.0,
        seed: 1,
    };
    let cfg_b = LinearNestConfig {
        seed: 99,
        ..cfg_a.clone()
    };

    let result_a = first_fit_boards(&parts, &stock, &cfg_a).unwrap();
    let result_b = first_fit_boards(&parts, &stock, &cfg_b).unwrap();

    assert_eq!(result_a.boards.len(), result_b.boards.len());
    let collect_ids = |res: &LinearNestResult| {
        res.boards
            .iter()
            .flat_map(|board| board.cuts.iter().map(|c| c.part_id.clone()))
            .collect::<Vec<_>>()
    };
    assert_ne!(collect_ids(&result_a), collect_ids(&result_b));

    let result_a_repeat = first_fit_boards(&parts, &stock, &cfg_a).unwrap();
    assert_eq!(collect_ids(&result_a), collect_ids(&result_a_repeat));
}

#[test]
fn insufficient_stock_errors() {
    let parts = vec![LinearPart {
        id: "rail".into(),
        length: 1500.0,
        quantity: 3,
    }];
    let stock = vec![LinearStock {
        id: "stick".into(),
        length: 1000.0,
        quantity: 2,
    }];
    let cfg = LinearNestConfig {
        kerf: 1.0,
        trim_leading: 0.0,
        trim_trailing: 0.0,
        seed: 0,
    };

    let err = first_fit_boards(&parts, &stock, &cfg).expect_err("should fail");
    assert!(matches!(err, NestError::InsufficientStock));
}
