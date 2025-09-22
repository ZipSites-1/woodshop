use crate::error::{CamError, CamResult};
use crate::gcode::{MotionMode, Writer};
use crate::geometry::Point3;
use crate::ops::Tool;
use crate::toolpath::{ToolMotion, Toolpath};

#[derive(Debug, Clone, Copy)]
pub struct GrblConfig {
    pub home_x: f64,
    pub home_y: f64,
}

impl Default for GrblConfig {
    fn default() -> Self {
        Self {
            home_x: 0.0,
            home_y: 0.0,
        }
    }
}

pub fn write_program(toolpath: &Toolpath, tool: &Tool) -> CamResult<String> {
    write_program_with_config(toolpath, tool, GrblConfig::default())
}

pub fn write_program_with_config(
    toolpath: &Toolpath,
    tool: &Tool,
    config: GrblConfig,
) -> CamResult<String> {
    if toolpath.is_empty() {
        return Err(CamError::InvalidInput(
            "toolpath must contain at least one motion".into(),
        ));
    }

    let mut writer = Writer::new().with_precision(3);
    writer.start_program()?;
    writer.comment(toolpath.name.clone());
    writer.set_spindle(tool.spindle_rpm)?;

    let mut current = Point3::new(config.home_x, config.home_y, toolpath.safe_z);

    for motion in toolpath.iter() {
        match motion {
            ToolMotion::Rapid { to } => {
                writer.motion(MotionMode::Rapid, *to, None)?;
                current = *to;
            }
            ToolMotion::Feed { to, feed } => {
                writer.motion(MotionMode::Linear, *to, Some(*feed))?;
                current = *to;
            }
            ToolMotion::Dwell { seconds } => {
                writer.dwell(*seconds)?;
            }
        }
    }

    if current.z + 1e-6 < toolpath.safe_z {
        let safe = Point3::new(current.x, current.y, toolpath.safe_z);
        writer.motion(MotionMode::Rapid, safe, None)?;
        current = safe;
    }

    let home = Point3::new(config.home_x, config.home_y, toolpath.safe_z);
    if (current.x - home.x).abs() > 1e-6 || (current.y - home.y).abs() > 1e-6 {
        writer.motion(MotionMode::Rapid, home, None)?;
    }

    writer.stop_spindle()?;
    writer.end_program()?;

    let program = writer.finish();
    Ok(program.to_string())
}

pub fn validate_program(program: &str) -> CamResult<()> {
    if program.trim().is_empty() {
        return Err(CamError::InvalidInput("program is empty".into()));
    }

    let mut has_end = false;
    for (line_idx, raw_line) in program.lines().enumerate() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        let mut in_comment = false;
        let mut token = String::new();
        let mut seen_letters: Vec<char> = Vec::new();

        for ch in line.chars() {
            if in_comment {
                if ch == ')' {
                    in_comment = false;
                }
                continue;
            }
            if ch == '(' {
                in_comment = true;
                continue;
            }
            if ch.is_whitespace() {
                validate_token(&token, line_idx + 1, &mut seen_letters)?;
                token.clear();
                continue;
            }
            token.push(ch);
        }
        validate_token(&token, line_idx + 1, &mut seen_letters)?;

        if line.contains("M2") {
            has_end = true;
        }
    }

    if !has_end {
        return Err(CamError::InvalidInput("program missing M2 end".into()));
    }

    Ok(())
}

fn validate_token(token: &str, line: usize, seen_letters: &mut Vec<char>) -> CamResult<()> {
    if token.is_empty() {
        return Ok(());
    }
    let (letter, rest) = token.split_at(1);
    let letter = letter.chars().next().unwrap();
    if !letter.is_ascii_alphabetic() {
        return Err(CamError::InvalidInput(format!(
            "line {line}: invalid token '{token}'"
        )));
    }
    let letter_upper = letter.to_ascii_uppercase();
    if seen_letters.contains(&letter_upper) && letter_upper != 'G' {
        return Err(CamError::InvalidInput(format!(
            "line {line}: repeated letter '{letter_upper}'"
        )));
    }
    if letter_upper != 'G' {
        seen_letters.push(letter_upper);
    }

    match letter_upper {
        'G' => validate_g_code(rest, line)?,
        'M' => validate_m_code(rest, line)?,
        'X' | 'Y' | 'Z' | 'F' | 'S' | 'P' => {
            rest.parse::<f64>().map_err(|_| {
                CamError::InvalidInput(format!(
                    "line {line}: expected numeric value after {letter_upper}"
                ))
            })?;
        }
        _ => {
            return Err(CamError::InvalidInput(format!(
                "line {line}: unsupported address {letter_upper}"
            )));
        }
    }

    Ok(())
}

fn validate_g_code(rest: &str, line: usize) -> CamResult<()> {
    match rest {
        "0" | "1" | "4" | "21" | "90" | "94" => Ok(()),
        _ => Err(CamError::InvalidInput(format!(
            "line {line}: unsupported G-code {rest}"
        ))),
    }
}

fn validate_m_code(rest: &str, line: usize) -> CamResult<()> {
    match rest {
        "2" | "3" | "5" => Ok(()),
        _ => Err(CamError::InvalidInput(format!(
            "line {line}: unsupported M-code {rest}"
        ))),
    }
}
