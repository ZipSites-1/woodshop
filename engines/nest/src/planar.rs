use crate::error::{NestError, NestResult};
use crate::metrics::{MetricKind, UtilizationBreakdown};
use crate::util::{cmp_f64_desc, hash_with_seed};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GrainDirection {
    AlongX,
    AlongY,
    Either,
}

#[derive(Debug, Clone, PartialEq)]
pub struct RectPart {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub quantity: usize,
    pub grain: GrainDirection,
}

impl RectPart {
    fn instances(&self) -> impl Iterator<Item = RectInstance> + '_ {
        (0..self.quantity).map(move |seq| RectInstance {
            id: self.id.clone(),
            base_width: self.width,
            base_height: self.height,
            grain: self.grain,
            seq,
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SheetStock {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub quantity: usize,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlanarNestConfig {
    pub kerf: f64,
    pub trim: f64,
    pub seed: u64,
}

impl Default for PlanarNestConfig {
    fn default() -> Self {
        Self {
            kerf: 0.0,
            trim: 0.0,
            seed: 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct RectPlacement {
    pub part_id: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub rotated: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OffcutRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SheetLayout {
    pub stock_id: String,
    pub index: usize,
    pub placements: Vec<RectPlacement>,
    pub offcuts: Vec<OffcutRect>,
    pub metrics: UtilizationBreakdown,
}

#[derive(Debug, Clone)]
struct RectInstance {
    id: String,
    base_width: f64,
    base_height: f64,
    grain: GrainDirection,
    seq: usize,
}

#[derive(Debug, Clone)]
struct SheetSupply {
    stock: SheetStock,
    used: usize,
}

#[derive(Debug, Clone)]
struct FreeRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl FreeRect {
    fn can_fit(&self, width: f64, height: f64) -> bool {
        width <= self.width + 1e-9 && height <= self.height + 1e-9
    }

    fn area(&self) -> f64 {
        self.width * self.height
    }
}

struct SheetState {
    stock: SheetStock,
    index: usize,
    free_rects: Vec<FreeRect>,
    placements: Vec<RectPlacement>,
    config: PlanarNestConfig,
}

impl SheetState {
    fn new(stock: &SheetStock, index: usize, config: &PlanarNestConfig) -> NestResult<Self> {
        if stock.width <= 2.0 * config.trim || stock.height <= 2.0 * config.trim {
            return Err(NestError::InvalidDimension(
                "sheet dimensions smaller than trim allowance",
            ));
        }
        let usable = FreeRect {
            x: config.trim,
            y: config.trim,
            width: stock.width - 2.0 * config.trim,
            height: stock.height - 2.0 * config.trim,
        };
        Ok(Self {
            stock: stock.clone(),
            index,
            free_rects: vec![usable],
            placements: Vec::new(),
            config: *config,
        })
    }

    fn place_best_fit(&mut self, part: &RectInstance) -> Option<()> {
        let mut best_choice: Option<(usize, Orientation, (f64, f64))> = None;
        for (idx, rect) in self.free_rects.iter().enumerate() {
            for orientation in Orientation::options_for(part) {
                let (pw, ph) = (orientation.width, orientation.height);
                if !rect.can_fit(pw, ph) {
                    continue;
                }
                let score = (
                    rect.area() - pw * ph,
                    (rect.width - pw).abs() + (rect.height - ph).abs(),
                );
                match best_choice {
                    None => best_choice = Some((idx, orientation, score)),
                    Some((_, _, current_score)) => {
                        if score.0 < current_score.0
                            || (score.0 - current_score.0).abs() < 1e-9 && score.1 < current_score.1
                        {
                            best_choice = Some((idx, orientation, score));
                        }
                    }
                }
            }
        }

        let (rect_idx, orientation, _) = best_choice?;
        self.commit(rect_idx, part, orientation)
    }

    fn commit(
        &mut self,
        rect_idx: usize,
        part: &RectInstance,
        orientation: Orientation,
    ) -> Option<()> {
        let rect = self.free_rects.swap_remove(rect_idx);
        let (pw, ph) = (orientation.width, orientation.height);
        let placement = RectPlacement {
            part_id: part.id.clone(),
            x: rect.x,
            y: rect.y,
            width: pw,
            height: ph,
            rotated: orientation.rotated,
        };
        self.placements.push(placement);

        let kerf = self.config.kerf;
        let right_width = rect.width - pw - kerf;
        if right_width > 1e-9 {
            self.free_rects.push(FreeRect {
                x: rect.x + pw + kerf,
                y: rect.y,
                width: right_width,
                height: rect.height,
            });
        }

        let top_height = rect.height - ph - kerf;
        if top_height > 1e-9 {
            self.free_rects.push(FreeRect {
                x: rect.x,
                y: rect.y + ph + kerf,
                width: (pw + kerf).min(rect.width),
                height: top_height,
            });
        }

        self.prune_free_rects();
        Some(())
    }

    fn prune_free_rects(&mut self) {
        self.free_rects
            .retain(|rect| rect.width > 1e-6 && rect.height > 1e-6);
        let mut i = 0;
        while i < self.free_rects.len() {
            let mut j = i + 1;
            while j < self.free_rects.len() {
                if contains(&self.free_rects[i], &self.free_rects[j]) {
                    self.free_rects.swap_remove(j);
                } else if contains(&self.free_rects[j], &self.free_rects[i]) {
                    self.free_rects.swap(i, j);
                    self.free_rects.swap_remove(j);
                } else {
                    j += 1;
                }
            }
            i += 1;
        }
    }

    fn finalize(mut self) -> SheetLayout {
        self.prune_free_rects();

        let mut metrics = UtilizationBreakdown::new(MetricKind::Area);
        metrics.stock_total = self.stock.width * self.stock.height;
        let trim_area = (self.stock.width * self.config.trim * 2.0)
            + (self.stock.height * self.config.trim * 2.0)
            - (4.0 * self.config.trim * self.config.trim);
        metrics.trim_loss = trim_area.max(0.0);
        metrics.kerf_loss = self
            .placements
            .iter()
            .map(|p| {
                let perimeter = 2.0 * (p.width + p.height);
                perimeter * self.config.kerf * 0.5
            })
            .sum();
        metrics.utilized = self.placements.iter().map(|p| p.width * p.height).sum();
        let occupied = metrics.utilized + metrics.kerf_loss + metrics.trim_loss;
        metrics.offcut_loss = (metrics.stock_total - occupied).max(0.0);

        let offcuts = self
            .free_rects
            .into_iter()
            .map(|r| OffcutRect {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
            })
            .collect();

        SheetLayout {
            stock_id: self.stock.id.clone(),
            index: self.index,
            placements: self.placements,
            offcuts,
            metrics,
        }
    }
}

#[derive(Clone, Copy)]
struct Orientation {
    width: f64,
    height: f64,
    rotated: bool,
}

impl Orientation {
    fn options_for(part: &RectInstance) -> Vec<Orientation> {
        let mut options = Vec::with_capacity(2);
        options.push(Orientation {
            width: part.base_width,
            height: part.base_height,
            rotated: false,
        });
        if matches!(part.grain, GrainDirection::Either) {
            options.push(Orientation {
                width: part.base_height,
                height: part.base_width,
                rotated: true,
            });
        }
        options
    }
}

fn contains(a: &FreeRect, b: &FreeRect) -> bool {
    b.x >= a.x - 1e-9
        && b.y >= a.y - 1e-9
        && b.x + b.width <= a.x + a.width + 1e-9
        && b.y + b.height <= a.y + a.height + 1e-9
}

pub fn best_fit_sheets(
    parts: &[RectPart],
    stock: &[SheetStock],
    config: &PlanarNestConfig,
) -> NestResult<Vec<SheetLayout>> {
    validate_inputs(parts, stock)?;

    let mut part_instances: Vec<RectInstance> =
        parts.iter().flat_map(|part| part.instances()).collect();
    part_instances.sort_by(|a, b| {
        cmp_f64_desc(a.base_width * a.base_height, b.base_width * b.base_height).then_with(|| {
            let ha = hash_with_seed(&a.id, config.seed ^ a.seq as u64);
            let hb = hash_with_seed(&b.id, config.seed ^ b.seq as u64);
            ha.cmp(&hb)
        })
    });

    let mut supplies: Vec<SheetSupply> = stock
        .iter()
        .map(|sheet| SheetSupply {
            stock: sheet.clone(),
            used: 0,
        })
        .collect();

    let mut sheets: Vec<SheetState> = Vec::new();

    for part in &part_instances {
        let mut placed = false;
        for sheet in &mut sheets {
            if sheet.place_best_fit(part).is_some() {
                placed = true;
                break;
            }
        }
        if !placed {
            let supply = supplies
                .iter_mut()
                .find(|s| s.used < s.stock.quantity)
                .ok_or(NestError::InsufficientStock)?;

            let mut sheet_state = SheetState::new(&supply.stock, supply.used, config)?;
            supply.used += 1;
            if sheet_state.place_best_fit(part).is_none() {
                return Err(NestError::InsufficientStock);
            }
            sheets.push(sheet_state);
        }
    }

    let mut results: Vec<SheetLayout> = sheets.into_iter().map(|s| s.finalize()).collect();
    results.sort_by(|a, b| a.stock_id.cmp(&b.stock_id).then(a.index.cmp(&b.index)));
    Ok(results)
}

struct SkylineShelf {
    y: f64,
    height: f64,
    cursor_x: f64,
    width_remaining: f64,
}

impl SkylineShelf {
    fn new(y: f64, height: f64, start_x: f64, available_width: f64) -> Self {
        Self {
            y,
            height,
            cursor_x: start_x,
            width_remaining: available_width,
        }
    }
}

struct SkylineState {
    sheet: SheetStock,
    index: usize,
    shelves: Vec<SkylineShelf>,
    placements: Vec<RectPlacement>,
    config: PlanarNestConfig,
}

impl SkylineState {
    fn new(sheet: &SheetStock, index: usize, config: &PlanarNestConfig) -> NestResult<Self> {
        if sheet.width <= 2.0 * config.trim || sheet.height <= 2.0 * config.trim {
            return Err(NestError::InvalidDimension(
                "sheet dimensions smaller than trim allowance",
            ));
        }
        Ok(Self {
            sheet: sheet.clone(),
            index,
            shelves: Vec::new(),
            placements: Vec::new(),
            config: *config,
        })
    }

    fn place(&mut self, part: &RectInstance) -> Option<()> {
        let mut best_idx: Option<(usize, Orientation)> = None;
        let mut best_score = f64::MAX;

        for (idx, shelf) in self.shelves.iter().enumerate() {
            for orientation in Orientation::options_for(part) {
                let (pw, ph) = (orientation.width, orientation.height);
                let mut needed_width = pw;
                if shelf.cursor_x > self.config.trim {
                    needed_width += self.config.kerf;
                }
                if needed_width <= shelf.width_remaining + 1e-9 && ph <= shelf.height + 1e-9 {
                    let score = shelf.width_remaining - needed_width;
                    if score < best_score {
                        best_score = score;
                        best_idx = Some((idx, orientation));
                    }
                }
            }
        }

        if let Some((idx, orient)) = best_idx {
            self.place_on_shelf(idx, part, orient)
        } else {
            self.create_shelf(part)
        }
    }

    fn place_on_shelf(
        &mut self,
        shelf_idx: usize,
        part: &RectInstance,
        preferred: Orientation,
    ) -> Option<()> {
        let shelf = &mut self.shelves[shelf_idx];
        let mut best_orientation: Option<Orientation> = None;
        for orientation in Orientation::options_for(part) {
            let (pw, ph) = (orientation.width, orientation.height);
            let mut needed_width = pw;
            if shelf.cursor_x > self.config.trim {
                needed_width += self.config.kerf;
            }
            if needed_width <= shelf.width_remaining + 1e-9 && ph <= shelf.height + 1e-9 {
                match best_orientation {
                    None => best_orientation = Some(orientation),
                    Some(prev) => {
                        let candidate_is_preferred = orientation.width == preferred.width
                            && orientation.height == preferred.height;
                        let prev_is_preferred =
                            prev.width == preferred.width && prev.height == preferred.height;
                        let prev_needed = if shelf.cursor_x > self.config.trim {
                            prev.width + self.config.kerf
                        } else {
                            prev.width
                        };
                        let candidate_score = shelf.width_remaining - needed_width;
                        let prev_score = shelf.width_remaining - prev_needed;

                        let take_candidate = if candidate_is_preferred && !prev_is_preferred {
                            true
                        } else if prev_is_preferred && !candidate_is_preferred {
                            false
                        } else {
                            candidate_score + 1e-9 < prev_score
                        };

                        if take_candidate {
                            best_orientation = Some(orientation);
                        }
                    }
                }
            }
        }
        let orientation = best_orientation?;
        let (pw, ph) = (orientation.width, orientation.height);
        if shelf.cursor_x > self.config.trim {
            shelf.cursor_x += self.config.kerf;
            shelf.width_remaining -= self.config.kerf;
        }
        let placement = RectPlacement {
            part_id: part.id.clone(),
            x: shelf.cursor_x,
            y: shelf.y,
            width: pw,
            height: ph,
            rotated: orientation.rotated,
        };
        self.placements.push(placement);
        shelf.cursor_x += pw;
        shelf.width_remaining -= pw;
        Some(())
    }

    fn create_shelf(&mut self, part: &RectInstance) -> Option<()> {
        for orientation in Orientation::options_for(part) {
            let (pw, ph) = (orientation.width, orientation.height);
            let usable_width = self.sheet.width - 2.0 * self.config.trim;
            let usable_height = self.sheet.height - 2.0 * self.config.trim;
            let next_y = if let Some(last) = self.shelves.last() {
                last.y + last.height + self.config.kerf
            } else {
                self.config.trim
            };
            if pw <= usable_width + 1e-9 && next_y + ph <= self.config.trim + usable_height + 1e-9 {
                let mut shelf = SkylineShelf::new(next_y, ph, self.config.trim, usable_width);
                shelf.cursor_x = self.config.trim;
                shelf.width_remaining = usable_width;
                self.shelves.push(shelf);
                let idx = self.shelves.len() - 1;
                return self.place_on_shelf(idx, part, orientation);
            }
        }
        None
    }

    fn finalize(self) -> SheetLayout {
        let mut metrics = UtilizationBreakdown::new(MetricKind::Area);
        metrics.stock_total = self.sheet.width * self.sheet.height;
        metrics.utilized = self.placements.iter().map(|p| p.width * p.height).sum();
        metrics.kerf_loss = self
            .shelves
            .iter()
            .filter(|shelf| shelf.cursor_x > self.config.trim)
            .map(|shelf| (shelf.height * self.config.kerf).max(0.0))
            .sum();
        metrics.trim_loss = 2.0 * self.sheet.width * self.config.trim
            + 2.0 * self.sheet.height * self.config.trim
            - 4.0 * self.config.trim * self.config.trim;

        let mut offcuts = Vec::new();
        for shelf in &self.shelves {
            if shelf.width_remaining > 1e-9 {
                offcuts.push(OffcutRect {
                    x: shelf.cursor_x,
                    y: shelf.y,
                    width: shelf.width_remaining,
                    height: shelf.height,
                });
            }
        }

        let usable_height = self.sheet.height - 2.0 * self.config.trim;
        let used_height = self
            .shelves
            .last()
            .map(|s| (s.y + s.height) - self.config.trim)
            .unwrap_or(0.0);
        if usable_height - used_height > 1e-9 {
            offcuts.push(OffcutRect {
                x: self.config.trim,
                y: self.config.trim + used_height,
                width: self.sheet.width - 2.0 * self.config.trim,
                height: (usable_height - used_height).max(0.0),
            });
        }

        metrics.offcut_loss = offcuts.iter().map(|o| o.width * o.height).sum();
        let occupied =
            metrics.utilized + metrics.kerf_loss + metrics.trim_loss + metrics.offcut_loss;
        if occupied > metrics.stock_total + 1e-6 {
            metrics.offcut_loss = (metrics.stock_total
                - (metrics.utilized + metrics.kerf_loss + metrics.trim_loss))
                .max(0.0);
        }

        SheetLayout {
            stock_id: self.sheet.id.clone(),
            index: self.index,
            placements: self.placements,
            offcuts,
            metrics,
        }
    }
}

pub fn skyline_sheets(
    parts: &[RectPart],
    stock: &[SheetStock],
    config: &PlanarNestConfig,
) -> NestResult<Vec<SheetLayout>> {
    validate_inputs(parts, stock)?;

    let mut part_instances: Vec<RectInstance> =
        parts.iter().flat_map(|part| part.instances()).collect();
    part_instances.sort_by(|a, b| {
        cmp_f64_desc(a.base_height, b.base_height).then_with(|| {
            let ha = hash_with_seed(&a.id, config.seed ^ a.seq as u64);
            let hb = hash_with_seed(&b.id, config.seed ^ b.seq as u64);
            ha.cmp(&hb)
        })
    });

    let mut supplies: Vec<SheetSupply> = stock
        .iter()
        .map(|sheet| SheetSupply {
            stock: sheet.clone(),
            used: 0,
        })
        .collect();

    let mut layouts: Vec<SkylineState> = Vec::new();

    for part in &part_instances {
        let mut placed = false;
        for layout in &mut layouts {
            if layout.place(part).is_some() {
                placed = true;
                break;
            }
        }
        if !placed {
            let supply = supplies
                .iter_mut()
                .find(|s| s.used < s.stock.quantity)
                .ok_or(NestError::InsufficientStock)?;

            let mut state = SkylineState::new(&supply.stock, supply.used, config)?;
            supply.used += 1;
            if state.place(part).is_none() {
                return Err(NestError::InsufficientStock);
            }
            layouts.push(state);
        }
    }

    let mut results: Vec<SheetLayout> = layouts.into_iter().map(|s| s.finalize()).collect();
    results.sort_by(|a, b| a.stock_id.cmp(&b.stock_id).then(a.index.cmp(&b.index)));
    Ok(results)
}

pub fn summarize_sheet_layouts(layouts: &[SheetLayout]) -> UtilizationBreakdown {
    let mut agg = UtilizationBreakdown::new(MetricKind::Area);
    for layout in layouts {
        agg.stock_total += layout.metrics.stock_total;
        agg.utilized += layout.metrics.utilized;
        agg.kerf_loss += layout.metrics.kerf_loss;
        agg.trim_loss += layout.metrics.trim_loss;
        agg.offcut_loss += layout.metrics.offcut_loss;
    }
    agg
}

fn validate_inputs(parts: &[RectPart], stock: &[SheetStock]) -> NestResult<()> {
    if parts
        .iter()
        .any(|p| p.width <= 0.0 || p.height <= 0.0 || p.quantity == 0)
    {
        return Err(NestError::InvalidDimension(
            "part dimensions must be positive",
        ));
    }
    if stock
        .iter()
        .any(|s| s.width <= 0.0 || s.height <= 0.0 || s.quantity == 0)
    {
        return Err(NestError::InvalidDimension(
            "stock dimensions must be positive",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn respects_grain() {
        let parts = vec![RectPart {
            id: "panel".into(),
            width: 4.0,
            height: 1.0,
            quantity: 2,
            grain: GrainDirection::AlongX,
        }];
        let stock = vec![SheetStock {
            id: "sheet".into(),
            width: 5.0,
            height: 3.0,
            quantity: 1,
        }];
        let config = PlanarNestConfig {
            kerf: 0.1,
            trim: 0.0,
            seed: 7,
        };
        let layouts = best_fit_sheets(&parts, &stock, &config).unwrap();
        let placement = &layouts[0].placements[0];
        assert!(!placement.rotated);
    }
}
