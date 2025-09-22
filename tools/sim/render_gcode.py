#!/usr/bin/env python3
"""Render a simple SVG preview from a GRBL-style G-code file."""
from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Iterable, List, Tuple

Segment = Tuple[str, Tuple[float, float], Tuple[float, float]]


def parse_gcode(path: Path) -> List[Segment]:
    mode = "G0"
    x = 0.0
    y = 0.0
    segments: List[Segment] = []

    for raw_line in path.read_text().splitlines():
        line = raw_line.split("(", 1)[0].strip()
        if not line:
            continue
        tokens = line.split()
        for token in tokens:
            letter = token[0].upper()
            value = token[1:]
            if letter == "G":
                mode = f"G{value}"
            elif letter == "X":
                x = float(value)
            elif letter == "Y":
                y = float(value)
        if mode in {"G0", "G1"} and any(t[0] in "XY" for t in tokens):
            # mode before update is the motion for this segment
            target_x = next((float(t[1:]) for t in tokens if t[0].upper() == "X"), x)
            target_y = next((float(t[1:]) for t in tokens if t[0].upper() == "Y"), y)
            segments.append((mode, (x, y), (target_x, target_y)))
            x, y = target_x, target_y
    return segments


def bounds(segments: Iterable[Segment]) -> Tuple[float, float, float, float]:
    xs: List[float] = []
    ys: List[float] = []
    for _, (x1, y1), (x2, y2) in segments:
        xs.extend([x1, x2])
        ys.extend([y1, y2])
    if not xs:
        return 0.0, 0.0, 0.0, 0.0
    return min(xs), min(ys), max(xs), max(ys)


def render_svg(segments: List[Segment], output: Path) -> None:
    min_x, min_y, max_x, max_y = bounds(segments)
    margin = 5.0
    width = max(1.0, max_x - min_x + 2 * margin)
    height = max(1.0, max_y - min_y + 2 * margin)

    def transform(point: Tuple[float, float]) -> Tuple[float, float]:
        x, y = point
        return x - min_x + margin, max_y - y + margin

    svg_lines = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        f"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {width:.3f} {height:.3f}\" stroke-width=\"0.4\" fill=\"none\">",
        '<rect x="0" y="0" width="{:.3f}" height="{:.3f}" fill="#111" stroke="#333" stroke-width="0.2"/>'.format(width, height),
    ]

    for mode, start, end in segments:
        sx, sy = transform(start)
        ex, ey = transform(end)
        colour = "#4CAF50" if mode == "G1" else "#2196F3"
        svg_lines.append(
            f'<line x1="{sx:.3f}" y1="{sy:.3f}" x2="{ex:.3f}" y2="{ey:.3f}" stroke="{colour}"/>'
        )

    svg_lines.append("</svg>")
    output.write_text("\n".join(svg_lines))


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: render_gcode.py <input.gcode> <output.svg>", file=sys.stderr)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.is_file():
        print(f"missing input file: {input_path}", file=sys.stderr)
        sys.exit(1)

    segments = parse_gcode(input_path)
    render_svg(segments, output_path)
    print(f"Rendered preview to {output_path}")


if __name__ == "__main__":
    main()
