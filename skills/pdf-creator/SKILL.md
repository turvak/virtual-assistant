---
name: pdf-creator
description: Generate styled PDF reports by rendering HTML/CSS to PDF via headless Chrome (installed at /usr/bin/google-chrome-stable). Use when asked to create a PDF report, export data as a PDF, convert an HTML layout to PDF, or produce a formatted document for sharing. Handles data-driven reports (tables, stats, highlights), branded layouts, and arbitrary HTML-to-PDF conversion. Output goes to the workspace or a specified path.
---

# PDF Creator

Generate PDFs by writing HTML, then rendering with headless Chrome.

## Workflow

1. **Design the HTML** — write inline CSS, structure the content
2. **Save to a `.html` temp file** in `/tmp/` or workspace
3. **Render to PDF** using `render_pdf.py`
4. **Move/clean up** the HTML if it's temporary

## Render Script

```bash
python3 /root/.openclaw/workspace/skills/pdf-creator/scripts/render_pdf.py \
  <input.html> <output.pdf> [--landscape] [--paper A4|Letter|Legal|A3]
```

Default: A4, portrait. Script prints `OK: <path> (<size> KB)` on success.

## Base Template

A styled base template lives at:
`/root/.openclaw/workspace/skills/pdf-creator/assets/report-template.html`

Use it for data reports — it includes:
- Header with title, subtitle, date/source meta
- Stats strip (4 stat cards)
- Table styles with alternating rows, bold headers
- Keyword highlight class (`.kw`), excerpt block (`.excerpt`)
- Signal badges: `.badge-high`, `.badge-medium`, `.badge-low`
- Print-safe CSS

**Placeholders to replace:** `{{REPORT_TITLE}}`, `{{REPORT_SUBTITLE}}`, `{{GENERATED_DATE}}`, `{{TOTAL_DEALS}}`, `{{TOTAL_MATCHES}}`, `{{HIGH_SIGNAL_COUNT}}`, `{{KEYWORDS}}`, `{{BODY_CONTENT}}`

Read the template, substitute placeholders in Python, write to `/tmp/report.html`, then render.

## For Custom Layouts

Skip the template and write raw HTML with `<style>` blocks. Keep it self-contained (inline or `<style>`, no external CDN — Chrome headless may not fetch them reliably).

## Tips

- Use `@media print` CSS rules to control page breaks
- `page-break-inside: avoid` on `<tr>` prevents table rows splitting across pages
- For large tables: split into sections with `<h2>` headers so the report is scannable
- Emoji render fine in Chrome headless
- For charts/graphs: use inline SVG — it renders perfectly

## Output

Save final PDFs to an appropriate workspace subfolder (e.g., `hubspot-analysis/`, `reports/`), not the workspace root.
