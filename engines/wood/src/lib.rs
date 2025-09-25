use std::str::FromStr;

#[derive(Clone, Copy, Debug, PartialEq)]
struct SpeciesCoefficients {
    radial: f64,
    tangential: f64,
    longitudinal: f64,
}

fn lookup_species(species: &str) -> Option<SpeciesCoefficients> {
    match species.trim().to_ascii_lowercase().as_str() {
        "birch" | "birch ply" | "birch plywood" => Some(SpeciesCoefficients {
            radial: 0.00027,
            tangential: 0.00041,
            longitudinal: 0.00002,
        }),
        "oak" | "red oak" | "white oak" => Some(SpeciesCoefficients {
            radial: 0.00030,
            tangential: 0.00038,
            longitudinal: 0.00002,
        }),
        "maple" => Some(SpeciesCoefficients {
            radial: 0.00029,
            tangential: 0.00043,
            longitudinal: 0.00002,
        }),
        "walnut" => Some(SpeciesCoefficients {
            radial: 0.00028,
            tangential: 0.00037,
            longitudinal: 0.00002,
        }),
        "cherry" => Some(SpeciesCoefficients {
            radial: 0.00027,
            tangential: 0.00036,
            longitudinal: 0.00002,
        }),
        _ => None,
    }
}

#[derive(Clone, Copy)]
enum Orientation {
    Length,
    Width,
    Thickness,
}

impl Orientation {
    fn coefficient(self, coefficients: &SpeciesCoefficients) -> f64 {
        match self {
            Orientation::Length => coefficients.longitudinal,
            Orientation::Width => coefficients.tangential,
            Orientation::Thickness => coefficients.radial,
        }
    }
}

impl FromStr for Orientation {
    type Err = ();

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_ascii_lowercase().as_str() {
            "length" | "longitudinal" | "along_grain" => Ok(Orientation::Length),
            "width" | "tangential" | "across_grain" => Ok(Orientation::Width),
            "thickness" | "radial" => Ok(Orientation::Thickness),
            _ => Err(()),
        }
    }
}

fn normalize_delta(delta_mc: f64) -> f64 {
    if delta_mc.abs() <= 1.0 {
        delta_mc * 100.0
    } else {
        delta_mc
    }
}

fn round_to_microns(value: f64) -> f64 {
    (value * 1_000.0).round() / 1_000.0
}

/// Estimate dimensional change (in millimetres) for a given member of wood.
///
/// The calculation is intentionally simple: a linear response using shrinkage
/// coefficients derived from the USDA Wood Handbook. The coefficients are
/// expressed as fractional change per percentage-point of moisture content and
/// are mapped to the requested orientation (length → longitudinal, width →
/// tangential, thickness → radial).
pub fn delta_dim(len_mm: f64, species: &str, orient: &str, delta_mc: f64) -> f64 {
    if !(len_mm.is_finite() && len_mm > 0.0) {
        return 0.0;
    }

    let coefficients = match lookup_species(species) {
        Some(coeffs) => coeffs,
        None => return 0.0,
    };

    let orientation = match Orientation::from_str(orient) {
        Ok(orientation) => orientation,
        Err(_) => return 0.0,
    };

    let normalized_delta = normalize_delta(delta_mc);
    let coefficient = orientation.coefficient(&coefficients);
    let delta = len_mm * coefficient * normalized_delta;
    round_to_microns(delta)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64) {
        assert!(
            (a - b).abs() < 1e-6,
            "expected {a} ≈ {b} (diff {})",
            (a - b).abs()
        );
    }

    #[test]
    fn width_expands_with_higher_moisture() {
        let delta = delta_dim(500.0, "Oak", "width", 10.0);
        approx_eq(delta, 1.9);
    }

    #[test]
    fn radial_and_fractional_delta_are_supported() {
        let delta_fraction = delta_dim(300.0, "Birch", "radial", 0.08);
        let delta_percent = delta_dim(300.0, "Birch", "radial", 8.0);
        approx_eq(delta_fraction, delta_percent);
    }

    #[test]
    fn unknown_species_or_orientation_returns_zero() {
        assert_eq!(delta_dim(400.0, "mystery", "width", 5.0), 0.0);
        assert_eq!(delta_dim(400.0, "oak", "diagonal", 5.0), 0.0);
    }

    #[test]
    fn non_positive_length_returns_zero() {
        assert_eq!(delta_dim(0.0, "oak", "width", 5.0), 0.0);
        assert_eq!(delta_dim(-10.0, "oak", "width", 5.0), 0.0);
    }
}
