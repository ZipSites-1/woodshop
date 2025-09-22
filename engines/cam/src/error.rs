use std::fmt;

use crate::offsets::OffsetError;

#[derive(Debug)]
pub enum CamError {
    Offset(OffsetError),
    InvalidInput(String),
    InvalidArgument(String),
}

pub type CamResult<T> = Result<T, CamError>;

impl fmt::Display for CamError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CamError::Offset(err) => write!(f, "offset error: {err}"),
            CamError::InvalidInput(msg) => write!(f, "invalid input: {msg}"),
            CamError::InvalidArgument(msg) => write!(f, "invalid argument: {msg}"),
        }
    }
}

impl std::error::Error for CamError {}

impl From<OffsetError> for CamError {
    fn from(value: OffsetError) -> Self {
        CamError::Offset(value)
    }
}
