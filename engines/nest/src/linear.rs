use crate::error::{NestError, NestResult};
use crate::metrics::{MetricKind, UtilizationBreakdown};
use crate::util::{cmp_f64_desc, hash_with_seed};

#[derive(Debug, Clone, PartialEq)]
pub struct LinearPart {
    pub id: String,
    pub length: f64,
    pub quantity: usize,
}

impl LinearPart {
    fn instances(&self) -> impl Iterator<Item = LinearPartInstance> + '_ {
        (0..self.quantity).map(move |idx| LinearPartInstance {
            id: self.id.clone(),
            length: self.length,
            seq: idx,
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct LinearStock {
    pub id: String,
    pub length: f64,
    pub quantity: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LinearNestConfig {
    pub kerf: f64,
    pub trim_leading: f64,
    pub trim_trailing: f64,
    pub seed: u64,
}

impl Default for LinearNestConfig {
    fn default() -> Self {
        Self {
            kerf: 0.0,
            trim_leading: 0.0,
            trim_trailing: 0.0,
            seed: 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct LinearCut {
    pub part_id: String,
    pub start: f64,
    pub length: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LinearOffcut {
    pub start: f64,
    pub length: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LinearBoard {
    pub stock_id: String,
    pub index: usize,
    pub cuts: Vec<LinearCut>,
    pub offcuts: Vec<LinearOffcut>,
    pub metrics: UtilizationBreakdown,
}

#[derive(Debug, Clone)]
pub struct LinearNestResult {
    pub boards: Vec<LinearBoard>,
    pub metrics: UtilizationBreakdown,
}

#[derive(Debug, Clone)]
struct LinearPartInstance {
    id: String,
    length: f64,
    seq: usize,
}

#[derive(Debug, Clone)]
struct StockSupply {
    stock: LinearStock,
    used: usize,
}

struct BoardState {
    stock: LinearStock,
    index: usize,
    cursor: f64,
    cuts: Vec<LinearCut>,
    trim_trailing: f64,
    config: LinearNestConfig,
}

impl BoardState {
    fn new(
        stock: &LinearStock,
        index: usize,
        config: &LinearNestConfig,
    ) -> Result<Self, NestError> {
        if stock.length <= config.trim_leading + config.trim_trailing {
            return Err(NestError::InvalidDimension(
                "stock length smaller than trim allowance",
            ));
        }
        Ok(Self {
            stock: stock.clone(),
            index,
            cursor: config.trim_leading,
            cuts: Vec::new(),
            trim_trailing: config.trim_trailing,
            config: config.clone(),
        })
    }

    fn available(&self) -> f64 {
        self.stock.length - self.cursor - self.trim_trailing
    }

    fn can_place(&self, part_len: f64) -> bool {
        if part_len <= 0.0 {
            return false;
        }
        if self.cuts.is_empty() {
            part_len <= self.available() + 1e-9
        } else {
            part_len + self.config.kerf <= self.available() + 1e-9
        }
    }

    fn place(&mut self, part: &LinearPartInstance) -> Result<(), NestError> {
        if !self.can_place(part.length) {
            return Err(NestError::InsufficientStock);
        }
        if !self.cuts.is_empty() {
            self.cursor += self.config.kerf;
        }
        let start = self.cursor;
        self.cuts.push(LinearCut {
            part_id: part.id.clone(),
            start,
            length: part.length,
        });
        self.cursor += part.length;
        Ok(())
    }

    fn finalize(self) -> LinearBoard {
        let mut metrics = UtilizationBreakdown::new(MetricKind::Linear);
        metrics.stock_total = self.stock.length;
        metrics.trim_loss = self.config.trim_leading + self.trim_trailing;
        metrics.kerf_loss = self.cuts.len().saturating_sub(1) as f64 * self.config.kerf;
        metrics.utilized = self.cuts.iter().map(|cut| cut.length).sum();
        let utilized_and_losses = metrics.utilized + metrics.kerf_loss + metrics.trim_loss;
        metrics.offcut_loss = (metrics.stock_total - utilized_and_losses).max(0.0);

        let offcuts = compute_offcuts(&self, metrics.offcut_loss);

        LinearBoard {
            stock_id: self.stock.id.clone(),
            index: self.index,
            cuts: self.cuts,
            offcuts,
            metrics,
        }
    }
}

fn compute_offcuts(board: &BoardState, tail_offcut: f64) -> Vec<LinearOffcut> {
    let mut offcuts = Vec::new();

    if board.config.trim_leading > 0.0 {
        offcuts.push(LinearOffcut {
            start: 0.0,
            length: board.config.trim_leading,
        });
    }

    if let Some(last_cut) = board.cuts.last() {
        if tail_offcut > 1e-9 {
            offcuts.push(LinearOffcut {
                start: last_cut.start + last_cut.length,
                length: tail_offcut,
            });
        }
    } else {
        let remaining =
            board.stock.length - (board.config.trim_leading + board.config.trim_trailing);
        if remaining > 1e-9 {
            offcuts.push(LinearOffcut {
                start: board.config.trim_leading,
                length: remaining,
            });
        }
    }

    offcuts
}

pub fn first_fit_boards(
    parts: &[LinearPart],
    stock: &[LinearStock],
    config: &LinearNestConfig,
) -> NestResult<LinearNestResult> {
    validate_inputs(parts, stock)?;

    let mut part_instances: Vec<LinearPartInstance> =
        parts.iter().flat_map(|part| part.instances()).collect();

    // first-fit decreasing with deterministic tie-breaking
    part_instances.sort_by(|a, b| {
        cmp_f64_desc(a.length, b.length).then_with(|| {
            let ha = hash_with_seed(&a.id, config.seed ^ a.seq as u64);
            let hb = hash_with_seed(&b.id, config.seed ^ b.seq as u64);
            ha.cmp(&hb)
        })
    });

    let mut supplies: Vec<StockSupply> = stock
        .iter()
        .map(|s| StockSupply {
            stock: s.clone(),
            used: 0,
        })
        .collect();

    let mut active_boards: Vec<BoardState> = Vec::new();

    for part in &part_instances {
        let mut placed = false;
        for board in &mut active_boards {
            if board.can_place(part.length) {
                board.place(part)?;
                placed = true;
                break;
            }
        }

        if !placed {
            let supply = supplies
                .iter_mut()
                .find(|s| s.used < s.stock.quantity)
                .ok_or(NestError::InsufficientStock)?;

            let mut board_state = BoardState::new(&supply.stock, supply.used, config)?;
            supply.used += 1;
            board_state.place(part)?;
            active_boards.push(board_state);
        }
    }

    let mut boards: Vec<LinearBoard> = active_boards.into_iter().map(|b| b.finalize()).collect();
    boards.sort_by(|a, b| a.stock_id.cmp(&b.stock_id).then(a.index.cmp(&b.index)));

    let mut agg = UtilizationBreakdown::new(MetricKind::Linear);
    for board in &boards {
        agg.stock_total += board.metrics.stock_total;
        agg.trim_loss += board.metrics.trim_loss;
        agg.kerf_loss += board.metrics.kerf_loss;
        agg.offcut_loss += board.metrics.offcut_loss;
        agg.utilized += board.metrics.utilized;
    }

    Ok(LinearNestResult {
        boards,
        metrics: agg,
    })
}

fn validate_inputs(parts: &[LinearPart], stock: &[LinearStock]) -> NestResult<()> {
    if parts.iter().any(|p| p.length <= 0.0) {
        return Err(NestError::InvalidDimension("part length must be positive"));
    }
    if stock.iter().any(|s| s.length <= 0.0) {
        return Err(NestError::InvalidDimension("stock length must be positive"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn places_parts_first_fit() {
        let parts = vec![
            LinearPart {
                id: "A".into(),
                length: 2.0,
                quantity: 2,
            },
            LinearPart {
                id: "B".into(),
                length: 1.0,
                quantity: 1,
            },
        ];
        let stock = vec![LinearStock {
            id: "board".into(),
            length: 5.3,
            quantity: 1,
        }];
        let config = LinearNestConfig {
            kerf: 0.1,
            trim_leading: 0.0,
            trim_trailing: 0.0,
            seed: 42,
        };

        let result = first_fit_boards(&parts, &stock, &config).unwrap();
        assert_eq!(result.boards.len(), 1);
        let board = &result.boards[0];
        assert_eq!(board.cuts.len(), 3);
        assert!(board.metrics.utilized > 4.9);
        assert!(board.metrics.kerf_loss > 0.0);
    }
}
