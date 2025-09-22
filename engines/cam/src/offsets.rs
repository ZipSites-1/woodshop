use std::fmt;

use crate::geometry::{
    Orientation, Point2, Vec2, lines_intersection, polygon_orientation, polygon_self_intersections,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OffsetSide {
    Inside,
    Outside,
}

#[derive(Debug, Clone, PartialEq)]
pub enum OffsetError {
    TooFewPoints,
    DegenerateEdge,
    SelfIntersection,
}

impl fmt::Display for OffsetError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            OffsetError::TooFewPoints => write!(f, "polygon has fewer than three points"),
            OffsetError::DegenerateEdge => write!(f, "degenerate edge encountered"),
            OffsetError::SelfIntersection => write!(f, "offset introduced self-intersection"),
        }
    }
}

impl std::error::Error for OffsetError {}

pub fn offset_polygon(
    points: &[Point2],
    distance: f64,
    side: OffsetSide,
) -> Result<Vec<Point2>, OffsetError> {
    if points.len() < 3 {
        return Err(OffsetError::TooFewPoints);
    }

    let orientation = polygon_orientation(points);
    let signed_distance = match (orientation, side) {
        (Orientation::Ccw, OffsetSide::Outside) => distance,
        (Orientation::Ccw, OffsetSide::Inside) => -distance,
        (Orientation::Cw, OffsetSide::Outside) => -distance,
        (Orientation::Cw, OffsetSide::Inside) => distance,
    };

    if signed_distance.abs() < 1e-9 {
        return Ok(points.to_vec());
    }

    let mut result = Vec::with_capacity(points.len());

    for i in 0..points.len() {
        let prev = points[(i + points.len() - 1) % points.len()];
        let curr = points[i];
        let next = points[(i + 1) % points.len()];

        let edge1 = curr - prev;
        let edge2 = next - curr;

        let len1 = edge1.length();
        let len2 = edge2.length();
        if len1 < 1e-9 || len2 < 1e-9 {
            return Err(OffsetError::DegenerateEdge);
        }

        let dir1 = edge1 / len1;
        let dir2 = edge2 / len2;
        let normal1 = outward_normal(dir1, orientation);
        let normal2 = outward_normal(dir2, orientation);

        let a1 = prev + normal1 * signed_distance;
        let b1 = curr + normal1 * signed_distance;
        let a2 = curr + normal2 * signed_distance;
        let b2 = next + normal2 * signed_distance;

        if let Some(intersection) = lines_intersection(a1, b1, a2, b2) {
            result.push(intersection);
            continue;
        }

        let mut combined = normal1 + normal2;
        if combined.length() < 1e-9 {
            combined = normal1;
        }
        combined = combined.normalize();
        result.push(curr + combined * signed_distance);
    }

    if polygon_self_intersections(&result) {
        return Err(OffsetError::SelfIntersection);
    }

    if !result.is_empty() && polygon_orientation(&result) != orientation {
        result.reverse();
    }

    Ok(result)
}

fn outward_normal(dir: Vec2, orientation: Orientation) -> Vec2 {
    match orientation {
        Orientation::Ccw => dir.perp_cw().normalize(),
        Orientation::Cw => dir.perp_ccw().normalize(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::Point2;

    #[test]
    fn square_outside_offset() {
        let poly = vec![
            Point2::new(0.0, 0.0),
            Point2::new(40.0, 0.0),
            Point2::new(40.0, 40.0),
            Point2::new(0.0, 40.0),
        ];
        let result = offset_polygon(&poly, 5.0, OffsetSide::Outside).unwrap();
        assert_eq!(result.len(), 4);
    }
}
