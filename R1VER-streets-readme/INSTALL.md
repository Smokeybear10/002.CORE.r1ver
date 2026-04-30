# R1VER Streets — README assets

Drop these into your repo:

```
docs/architecture/
  R1VER-Streets.png    ← embed this in README.md
  streets.html         ← open in browser to re-render / re-export PDF
  diagrams.jsx         ← React source for the diagram (loaded by streets.html)
```

Then in `README.md`, replace the existing ```mermaid block under "## Architecture"
with the contents of `README-snippet.md`.

## Re-rendering

Open `docs/architecture/streets.html` in any browser — it pulls React + the diagram
source via CDN, no build step. To export:

- **PNG** (recommended for README): browser → right-click → "Save as image" on the SVG,
  or use a tool like `puppeteer` / browser screenshot at 2× DPR.
- **PDF**: Cmd/Ctrl+P → Save as PDF → A3 landscape → Background graphics ON.

## Editing

The diagram is defined in `diagrams.jsx` as `VariantStreets`. Node data lives in
the `N` (nodes) and `E` (edges) constants near the top of the file. The print page
`streets.html` mounts only `VariantStreets` — no chrome, no navigation.
