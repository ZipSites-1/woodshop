use std::fmt;

use crate::error::{CamError, CamResult};
use crate::geometry::Point3;

const EPSILON: f64 = 1e-6;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Word {
    pub letter: char,
    pub value: String,
}

impl Word {
    pub fn new(letter: char, value: impl Into<String>) -> CamResult<Self> {
        let letter = letter.to_ascii_uppercase();
        if !letter.is_ascii_alphabetic() {
            return Err(CamError::InvalidArgument(format!(
                "invalid word letter '{letter}'"
            )));
        }
        Ok(Self {
            letter,
            value: value.into(),
        })
    }

    pub fn float(letter: char, value: f64, precision: usize) -> CamResult<Self> {
        let formatted = format_float(value, precision);
        Self::new(letter, formatted)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Block {
    pub words: Vec<Word>,
    pub comment: Option<String>,
}

#[derive(Debug, Default, Clone, Copy, PartialEq)]
struct ModalState {
    motion: Option<MotionMode>,
    feed: Option<f64>,
    spindle: Option<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MotionMode {
    Rapid,
    Linear,
}

impl MotionMode {
    fn gcode(&self) -> &'static str {
        match self {
            MotionMode::Rapid => "G0",
            MotionMode::Linear => "G1",
        }
    }
}

#[derive(Debug, Default, Clone)]
pub struct Program {
    pub blocks: Vec<Block>,
}

impl Program {
    pub fn push(&mut self, block: Block) {
        self.blocks.push(block);
    }
}

impl fmt::Display for Block {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (idx, word) in self.words.iter().enumerate() {
            if idx > 0 {
                f.write_str(" ")?;
            }
            write!(f, "{}{}", word.letter, word.value)?;
        }
        if let Some(comment) = &self.comment {
            if !self.words.is_empty() {
                f.write_str(" ")?;
            }
            write!(f, "({comment})")?;
        }
        Ok(())
    }
}

impl fmt::Display for Program {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (idx, block) in self.blocks.iter().enumerate() {
            if idx > 0 {
                f.write_str("\n")?;
            }
            write!(f, "{block}")?;
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct Writer {
    precision: usize,
    state: ModalState,
    last_position: Option<Point3>,
    program: Program,
}

impl Writer {
    pub fn new() -> Self {
        Self {
            precision: 3,
            state: ModalState::default(),
            last_position: None,
            program: Program::default(),
        }
    }

    pub fn with_precision(mut self, precision: usize) -> Self {
        self.precision = precision.max(1);
        self
    }

    pub fn start_program(&mut self) -> CamResult<()> {
        let mut block = BlockBuilder::new();
        block.add_word(Word::new('G', "21")?)?; // millimetres
        block.add_word(Word::new('G', "90")?)?; // absolute positioning
        block.add_word(Word::new('G', "94")?)?; // feed per minute
        self.program.push(block.build());
        Ok(())
    }

    pub fn comment(&mut self, text: impl Into<String>) {
        self.program.push(Block {
            words: Vec::new(),
            comment: Some(text.into()),
        });
    }

    pub fn set_spindle(&mut self, rpm: f64) -> CamResult<()> {
        if rpm <= 0.0 {
            return Err(CamError::InvalidArgument(
                "spindle RPM must be positive".into(),
            ));
        }
        if self
            .state
            .spindle
            .map(|s| (s - rpm).abs() < EPSILON)
            .unwrap_or(false)
        {
            return Ok(());
        }
        let mut block = BlockBuilder::new();
        block.add_word(Word::new('M', "3")?)?;
        block.add_word(Word::float('S', rpm, 0)?)?;
        self.program.push(block.build());
        self.state.spindle = Some(rpm);
        Ok(())
    }

    pub fn stop_spindle(&mut self) -> CamResult<()> {
        let mut block = BlockBuilder::new();
        block.add_word(Word::new('M', "5")?)?;
        self.program.push(block.build());
        self.state.spindle = None;
        Ok(())
    }

    pub fn motion(&mut self, mode: MotionMode, to: Point3, feed: Option<f64>) -> CamResult<()> {
        let mut block = BlockBuilder::new();
        if self.state.motion != Some(mode) {
            block.add_word(Word::new('G', mode.gcode().trim_start_matches('G'))?)?;
            self.state.motion = Some(mode);
        }

        if let Some(last) = self.last_position {
            if (last.x - to.x).abs() > EPSILON {
                block.add_word(Word::float('X', to.x, self.precision)?)?;
            }
            if (last.y - to.y).abs() > EPSILON {
                block.add_word(Word::float('Y', to.y, self.precision)?)?;
            }
            if (last.z - to.z).abs() > EPSILON {
                block.add_word(Word::float('Z', to.z, self.precision)?)?;
            }
        } else {
            block.add_word(Word::float('X', to.x, self.precision)?)?;
            block.add_word(Word::float('Y', to.y, self.precision)?)?;
            block.add_word(Word::float('Z', to.z, self.precision)?)?;
        }

        if let Some(feed) = feed {
            if feed <= 0.0 {
                return Err(CamError::InvalidArgument(
                    "feed rate must be positive".into(),
                ));
            }
            let require_feed = match self.state.feed {
                Some(prev) => (prev - feed).abs() > EPSILON,
                None => true,
            };
            if require_feed {
                block.add_word(Word::float('F', feed, 2)?)?;
                self.state.feed = Some(feed);
            }
        }

        if block.is_empty() {
            // Nothing changed; still record target point to keep state consistent
            self.last_position = Some(to);
            return Ok(());
        }

        self.program.push(block.build());
        self.last_position = Some(to);
        Ok(())
    }

    pub fn dwell(&mut self, seconds: f64) -> CamResult<()> {
        if seconds <= 0.0 {
            return Err(CamError::InvalidArgument(
                "dwell duration must be positive".into(),
            ));
        }
        let mut block = BlockBuilder::new();
        block.add_word(Word::new('G', "4")?)?;
        block.add_word(Word::float('P', seconds, 3)?)?;
        self.program.push(block.build());
        Ok(())
    }

    pub fn end_program(&mut self) -> CamResult<()> {
        let mut block = BlockBuilder::new();
        block.add_word(Word::new('M', "2")?)?;
        self.program.push(block.build());
        Ok(())
    }

    pub fn finish(self) -> Program {
        self.program
    }
}

impl Default for Writer {
    fn default() -> Self {
        Self::new()
    }
}

struct BlockBuilder {
    words: Vec<Word>,
    motion_word: Option<String>,
    used_letters: Vec<char>,
}

impl BlockBuilder {
    fn new() -> Self {
        Self {
            words: Vec::new(),
            motion_word: None,
            used_letters: Vec::new(),
        }
    }

    fn add_word(&mut self, word: Word) -> CamResult<()> {
        let upper = word.letter;
        if upper != 'G' && self.used_letters.contains(&upper) {
            return Err(CamError::InvalidArgument(format!(
                "letter {} emitted twice in single block",
                upper
            )));
        }

        if upper == 'G' {
            if let Some(existing) = &self.motion_word {
                let new_word = word.value.clone();
                if !is_motion_compatible(existing, &new_word) {
                    return Err(CamError::InvalidArgument(
                        "multiple motion words in one block".into(),
                    ));
                }
            } else if is_motion_code(&word.value) {
                self.motion_word = Some(word.value.clone());
            }
        } else {
            self.used_letters.push(upper);
        }

        self.words.push(word);
        Ok(())
    }

    fn build(self) -> Block {
        Block {
            words: self.words,
            comment: None,
        }
    }

    fn is_empty(&self) -> bool {
        self.words.is_empty()
    }
}

fn is_motion_code(word: &str) -> bool {
    matches!(word, "0" | "1")
}

fn is_motion_compatible(existing: &str, new_word: &str) -> bool {
    if !is_motion_code(existing) || !is_motion_code(new_word) {
        return true;
    }
    existing == new_word
}

fn format_float(value: f64, precision: usize) -> String {
    let mut s = format!("{:.*}", precision, value);
    if s.contains('.') {
        while s.ends_with('0') {
            s.pop();
        }
        if s.ends_with('.') {
            s.pop();
        }
    }
    if s == "-0" {
        s = "0".into();
    }
    if s == "-" {
        s = "0".into();
    }
    if s.is_empty() {
        s.push('0');
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_to_string_formats_words() {
        let block = Block {
            words: vec![
                Word::new('G', "1").unwrap(),
                Word::float('X', 10.12, 3).unwrap(),
                Word::float('F', 400.0, 1).unwrap(),
            ],
            comment: Some("pass".into()),
        };
        assert_eq!(block.to_string(), "G1 X10.12 F400 (pass)");
    }

    #[test]
    fn format_float_trims_trailing_zeroes() {
        assert_eq!(format_float(12.3400, 4), "12.34");
        assert_eq!(format_float(-0.0004, 4), "-0.0004");
        assert_eq!(format_float(0.0, 4), "0");
    }

    #[test]
    fn writer_omits_redundant_motion() {
        let mut writer = Writer::new();
        writer.start_program().unwrap();
        writer
            .motion(MotionMode::Rapid, Point3::new(0.0, 0.0, 5.0), None)
            .unwrap();
        writer
            .motion(MotionMode::Rapid, Point3::new(10.0, 0.0, 5.0), None)
            .unwrap();
        let program = writer.finish();
        let serialized = program.to_string();
        let lines: Vec<&str> = serialized.lines().collect();
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[1], "G0 X0 Y0 Z5");
        assert_eq!(lines[2], "X10");
    }
}
