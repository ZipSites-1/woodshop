use cam::gcode::{MotionMode, Writer};
use cam::geometry::Point3;

fn parse_block(block: &str) -> Vec<(char, String)> {
    block
        .split_whitespace()
        .filter(|token| !token.starts_with('('))
        .map(|token| {
            let mut chars = token.chars();
            let letter = chars.next().unwrap();
            let rest: String = chars.collect();
            (letter, rest)
        })
        .collect()
}

#[test]
fn writer_emits_well_formed_blocks() {
    let mut writer = Writer::new().with_precision(4);
    writer.start_program().unwrap();
    writer
        .motion(MotionMode::Rapid, Point3::new(0.0, 0.0, 5.0), None)
        .unwrap();
    writer
        .motion(
            MotionMode::Linear,
            Point3::new(12.5, 8.25, -1.25),
            Some(450.0),
        )
        .unwrap();
    writer.dwell(0.5).unwrap();
    writer.end_program().unwrap();
    let program = writer.finish();
    let text = program.to_string();
    let lines: Vec<String> = text.lines().map(|s| s.to_owned()).collect();
    assert_eq!(lines[0], "G21 G90 G94");
    let motion_words = parse_block(&lines[2]);
    assert!(motion_words.contains(&('X', "12.5".into())));
    assert!(motion_words.iter().any(|(c, v)| *c == 'F' && v == "450"));

    for line in &lines {
        for (letter, value) in parse_block(line) {
            assert!(letter.is_ascii_alphabetic());
            if matches!(letter, 'X' | 'Y' | 'Z' | 'F' | 'P') {
                value.parse::<f64>().expect("numeric word");
            }
        }
    }
}
