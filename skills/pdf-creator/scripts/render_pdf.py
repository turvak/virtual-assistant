#!/usr/bin/env python3
"""
render_pdf.py — Render an HTML file to PDF using headless Chrome.

Usage:
    python3 render_pdf.py <input.html> <output.pdf> [--landscape] [--paper A4|Letter]
"""

import argparse
import subprocess
import sys
import os


CHROME = "/usr/bin/google-chrome-stable"
CHROME_FLAGS = [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--run-all-compositor-stages-before-draw",
    "--print-to-pdf-no-header",
]


def render(input_html: str, output_pdf: str, landscape: bool = False, paper: str = "A4") -> None:
    input_path = os.path.abspath(input_html)
    output_path = os.path.abspath(output_pdf)

    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    flags = CHROME_FLAGS.copy()
    flags.append(f"--print-to-pdf={output_path}")

    if landscape:
        flags.append("--landscape")

    # Paper size mapping (Chrome uses inches)
    paper_sizes = {
        "A4": "--paper-width=8.27 --paper-height=11.69",
        "Letter": "--paper-width=8.5 --paper-height=11",
        "Legal": "--paper-width=8.5 --paper-height=14",
        "A3": "--paper-width=11.69 --paper-height=16.54",
    }
    size_flags = paper_sizes.get(paper.upper(), paper_sizes["A4"])
    flags.extend(size_flags.split())

    cmd = [CHROME] + flags + [f"file://{input_path}"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if not os.path.exists(output_path):
        print(f"ERROR: PDF not created. Chrome stderr:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"OK: {output_path} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render HTML to PDF via headless Chrome")
    parser.add_argument("input", help="Path to input HTML file")
    parser.add_argument("output", help="Path to output PDF file")
    parser.add_argument("--landscape", action="store_true", help="Render in landscape orientation")
    parser.add_argument("--paper", default="A4", choices=["A4", "Letter", "Legal", "A3"],
                        help="Paper size (default: A4)")
    args = parser.parse_args()
    render(args.input, args.output, args.landscape, args.paper)
