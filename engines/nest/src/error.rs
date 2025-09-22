use std::fmt::{self, Display};

#[derive(Debug, Clone, PartialEq)]
pub enum NestError {
    InsufficientStock,
    InvalidDimension(&'static str),
}

impl Display for NestError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NestError::InsufficientStock => write!(f, "insufficient stock to satisfy all parts"),
            NestError::InvalidDimension(msg) => write!(f, "invalid dimensions: {msg}"),
        }
    }
}

impl std::error::Error for NestError {}

pub type NestResult<T> = Result<T, NestError>;
