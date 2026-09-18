# Local-only jsPDF build

`jspdf.local.js` is generated from the readable jsPDF 4.2.1 UMD distribution.
The upstream license and copyright notices are retained.

Run `npm ci` and `npm run build:vendor` from the repository root to reproduce it.
The build pins the source hash and removes complete syntax-tree nodes for:

- The `pdfobjectnewwindow` output mode (loads an external PDFObject script).
- The `pdfjsnewwindow` output mode (loads an external viewer).
- The HTML plugin and its optional html2canvas/DOMPurify loaders.
- The SVG-to-image plugin and its optional canvg loader.

The reading-log exporter uses text, drawing, embedded local fonts, Blob previews,
and local file downloads. It does not use these removed features. The bundle
remains readable for review. Documentation and license URLs are attribution,
not remote code dependencies.

`npm run check:extension` verifies the generated bundle and checks the packaged
scripts for dynamic code loaders. PDF regression tests execute this exact bundle.
Do not replace it with an upstream full bundle without reviewing loader behavior.
