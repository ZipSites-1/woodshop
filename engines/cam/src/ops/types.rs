use crate::error::{CamError, CamResult};
use crate::linking::LinkingSettings;

#[derive(Debug, Clone, PartialEq)]
pub struct Tool {
    pub diameter: f64,
    pub feed_rate: f64,
    pub plunge_rate: f64,
    pub spindle_rpm: f64,
}

impl Tool {
    pub fn new(
        diameter: f64,
        feed_rate: f64,
        plunge_rate: f64,
        spindle_rpm: f64,
    ) -> CamResult<Self> {
        if diameter <= 0.0 {
            return Err(CamError::InvalidArgument(
                "tool diameter must be positive".into(),
            ));
        }
        if feed_rate <= 0.0 {
            return Err(CamError::InvalidArgument(
                "feed rate must be positive".into(),
            ));
        }
        if plunge_rate <= 0.0 {
            return Err(CamError::InvalidArgument(
                "plunge rate must be positive".into(),
            ));
        }
        if spindle_rpm <= 0.0 {
            return Err(CamError::InvalidArgument(
                "spindle RPM must be positive".into(),
            ));
        }
        Ok(Self {
            diameter,
            feed_rate,
            plunge_rate,
            spindle_rpm,
        })
    }

    pub fn radius(&self) -> f64 {
        self.diameter * 0.5
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct OperationSettings {
    pub tool: Tool,
    pub linking: LinkingSettings,
}

impl OperationSettings {
    pub fn new(tool: Tool, linking: LinkingSettings) -> Self {
        Self { tool, linking }
    }
}
