use std::ops::{Add, AddAssign, Div, Mul, Sub, SubAssign};

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Point2 {
    pub x: f64,
    pub y: f64,
}

impl Point2 {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub fn distance(&self, other: &Self) -> f64 {
        (*self - *other).length()
    }

    pub fn midpoint(&self, other: &Self) -> Self {
        Self::new((self.x + other.x) * 0.5, (self.y + other.y) * 0.5)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Point3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Point3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    pub fn translate(mut self, v: Vec3) -> Self {
        self.x += v.x;
        self.y += v.y;
        self.z += v.z;
        self
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}

impl Vec2 {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub fn length(&self) -> f64 {
        (self.x * self.x + self.y * self.y).sqrt()
    }

    pub fn normalize(&self) -> Self {
        let len = self.length();
        if len < 1e-9 {
            Self::new(0.0, 0.0)
        } else {
            Self::new(self.x / len, self.y / len)
        }
    }

    pub fn dot(&self, other: &Self) -> f64 {
        self.x * other.x + self.y * other.y
    }

    pub fn cross(&self, other: &Self) -> f64 {
        self.x * other.y - self.y * other.x
    }

    pub fn perp_cw(&self) -> Self {
        Self::new(self.y, -self.x)
    }

    pub fn perp_ccw(&self) -> Self {
        Self::new(-self.y, self.x)
    }
}

impl Add<Vec2> for Point2 {
    type Output = Point2;

    fn add(self, rhs: Vec2) -> Self::Output {
        Point2::new(self.x + rhs.x, self.y + rhs.y)
    }
}

impl Sub for Point2 {
    type Output = Vec2;

    fn sub(self, rhs: Self) -> Self::Output {
        Vec2::new(self.x - rhs.x, self.y - rhs.y)
    }
}

impl AddAssign<Vec2> for Point2 {
    fn add_assign(&mut self, rhs: Vec2) {
        self.x += rhs.x;
        self.y += rhs.y;
    }
}

impl SubAssign<Vec2> for Point2 {
    fn sub_assign(&mut self, rhs: Vec2) {
        self.x -= rhs.x;
        self.y -= rhs.y;
    }
}

impl Mul<f64> for Vec2 {
    type Output = Vec2;

    fn mul(self, rhs: f64) -> Self::Output {
        Vec2::new(self.x * rhs, self.y * rhs)
    }
}

impl Mul<Vec2> for f64 {
    type Output = Vec2;

    fn mul(self, rhs: Vec2) -> Self::Output {
        Vec2::new(self * rhs.x, self * rhs.y)
    }
}

impl Add for Vec2 {
    type Output = Vec2;

    fn add(self, rhs: Self) -> Self::Output {
        Vec2::new(self.x + rhs.x, self.y + rhs.y)
    }
}

impl Sub for Vec2 {
    type Output = Vec2;

    fn sub(self, rhs: Self) -> Self::Output {
        Vec2::new(self.x - rhs.x, self.y - rhs.y)
    }
}

impl AddAssign for Vec2 {
    fn add_assign(&mut self, rhs: Self) {
        self.x += rhs.x;
        self.y += rhs.y;
    }
}

impl SubAssign for Vec2 {
    fn sub_assign(&mut self, rhs: Self) {
        self.x -= rhs.x;
        self.y -= rhs.y;
    }
}

impl Div<f64> for Vec2 {
    type Output = Vec2;

    fn div(self, rhs: f64) -> Self::Output {
        Vec2::new(self.x / rhs, self.y / rhs)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    pub fn length(&self) -> f64 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }
}

impl Add<Vec3> for Point3 {
    type Output = Point3;

    fn add(self, rhs: Vec3) -> Self::Output {
        Point3::new(self.x + rhs.x, self.y + rhs.y, self.z + rhs.z)
    }
}

impl Sub for Point3 {
    type Output = Vec3;

    fn sub(self, rhs: Self) -> Self::Output {
        Vec3::new(self.x - rhs.x, self.y - rhs.y, self.z - rhs.z)
    }
}

impl AddAssign<Vec3> for Point3 {
    fn add_assign(&mut self, rhs: Vec3) {
        self.x += rhs.x;
        self.y += rhs.y;
        self.z += rhs.z;
    }
}

impl SubAssign<Vec3> for Point3 {
    fn sub_assign(&mut self, rhs: Vec3) {
        self.x -= rhs.x;
        self.y -= rhs.y;
        self.z -= rhs.z;
    }
}

impl Mul<f64> for Vec3 {
    type Output = Vec3;

    fn mul(self, rhs: f64) -> Self::Output {
        Vec3::new(self.x * rhs, self.y * rhs, self.z * rhs)
    }
}

impl Mul<Vec3> for f64 {
    type Output = Vec3;

    fn mul(self, rhs: Vec3) -> Self::Output {
        Vec3::new(self * rhs.x, self * rhs.y, self * rhs.z)
    }
}

impl Div<f64> for Vec3 {
    type Output = Vec3;

    fn div(self, rhs: f64) -> Self::Output {
        Vec3::new(self.x / rhs, self.y / rhs, self.z / rhs)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Orientation {
    Ccw,
    Cw,
}

pub fn polygon_area(points: &[Point2]) -> f64 {
    let mut area = 0.0;
    if points.len() < 3 {
        return 0.0;
    }

    for i in 0..points.len() {
        let p1 = points[i];
        let p2 = points[(i + 1) % points.len()];
        area += (p1.x * p2.y) - (p2.x * p1.y);
    }

    area * 0.5
}

pub fn polygon_orientation(points: &[Point2]) -> Orientation {
    if polygon_area(points) >= 0.0 {
        Orientation::Ccw
    } else {
        Orientation::Cw
    }
}

pub fn polyline_length(points: &[Point2], closed: bool) -> f64 {
    if points.is_empty() {
        return 0.0;
    }

    let mut length = 0.0;
    for i in 0..(points.len() - 1) {
        length += points[i].distance(&points[i + 1]);
    }

    if closed {
        length += points[points.len() - 1].distance(&points[0]);
    }

    length
}

pub fn bounding_box(points: &[Point2]) -> Option<(Point2, Point2)> {
    if points.is_empty() {
        return None;
    }

    let mut min_x = points[0].x;
    let mut max_x = points[0].x;
    let mut min_y = points[0].y;
    let mut max_y = points[0].y;

    for p in points.iter().skip(1) {
        min_x = min_x.min(p.x);
        max_x = max_x.max(p.x);
        min_y = min_y.min(p.y);
        max_y = max_y.max(p.y);
    }

    Some((Point2::new(min_x, min_y), Point2::new(max_x, max_y)))
}

pub fn lines_intersection(a1: Point2, a2: Point2, b1: Point2, b2: Point2) -> Option<Point2> {
    let r = a2 - a1;
    let s = b2 - b1;
    let rxs = r.cross(&s);
    if rxs.abs() < 1e-9 {
        return None;
    }
    let t = (b1 - a1).cross(&s) / rxs;
    Some(Point2::new(a1.x + t * r.x, a1.y + t * r.y))
}

pub fn segments_intersect(a1: Point2, a2: Point2, b1: Point2, b2: Point2) -> bool {
    // Based on the orientation test
    fn orientation(p: Point2, q: Point2, r: Point2) -> f64 {
        (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
    }

    fn on_segment(p: Point2, q: Point2, r: Point2) -> bool {
        q.x <= p.x.max(r.x) + 1e-9
            && q.x + 1e-9 >= p.x.min(r.x)
            && q.y <= p.y.max(r.y) + 1e-9
            && q.y + 1e-9 >= p.y.min(r.y)
    }

    let o1 = orientation(a1, a2, b1);
    let o2 = orientation(a1, a2, b2);
    let o3 = orientation(b1, b2, a1);
    let o4 = orientation(b1, b2, a2);

    if o1 * o2 < 0.0 && o3 * o4 < 0.0 {
        return true;
    }

    if o1.abs() < 1e-9 && on_segment(a1, b1, a2) {
        return true;
    }
    if o2.abs() < 1e-9 && on_segment(a1, b2, a2) {
        return true;
    }
    if o3.abs() < 1e-9 && on_segment(b1, a1, b2) {
        return true;
    }
    if o4.abs() < 1e-9 && on_segment(b1, a2, b2) {
        return true;
    }

    false
}

pub fn polygon_self_intersections(points: &[Point2]) -> bool {
    if points.len() < 4 {
        return false;
    }

    for i in 0..points.len() {
        let a1 = points[i];
        let a2 = points[(i + 1) % points.len()];
        for j in (i + 1)..points.len() {
            let b1 = points[j];
            let b2 = points[(j + 1) % points.len()];
            if j == i || j == (i + 1) % points.len() || j == (i + points.len() - 1) % points.len() {
                continue;
            }
            if segments_intersect(a1, a2, b1, b2) {
                return true;
            }
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_self_intersection() {
        let bow_tie = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 1.0),
            Point2::new(0.0, 1.0),
            Point2::new(1.0, 0.0),
        ];
        assert!(polygon_self_intersections(&bow_tie));
    }
}
