# Beanstack Report — Reading Log for Beanstack

An offline PDF formatter with saved Student / Teacher / Class profiles. No AI key,
backend, telemetry, or ongoing service costs. Includes a Chrome extension and the
original standalone Python formatter. Personal reading records are excluded from
the repository and are not packaged into the extension.

## Install and use

See [extension/START-HERE.txt](extension/START-HERE.txt). Load the `extension` folder
unpacked for development, or share the ZIP under `output/extension` after running
`npm run package`. The ZIP contains only files from `extension/`.

Click the extension icon on the intended reader's Beanstack **Reading Log → Calendar**
page. The editor captures that month. Save a triplet, explicitly link its reader,
choose a month, read it, then preview/download one PDF. Goals and reader bindings
are saved per triplet in `chrome.storage.local`. Entries remain in editor memory.

Each entry remains a separate row. Untimed entries, including Completed events,
have a dash for minutes and a status next to the title. Adjacent calendar months
are excluded. Repeated identical IDs are deduplicated; distinct sessions are not.

## Implementation

- Manifest V3; `activeTab`, `scripting`, `storage`. No blanket host permissions.
- Self-contained extraction/navigation functions are injected in Chrome's isolated
  world using the temporary grant from clicking the action. Only `.beanstack.com`
  HTTPS reader-calendar paths are accepted.
- The extractor validates all days of the displayed month and each entry's reader
  ID. Navigation uses Beanstack's own previous/next controls and waits for calendar
  replacement, with timeouts, a two-year limit, and reader checks.
- The editor checks origin + reader ID + selected month before export. Profile
  writes merge under a Web Lock so separate editor tabs do not lose other profiles.
- PDF generation uses bundled jsPDF 4.2.1 and Liberation Sans fonts. No CDN/runtime
  downloads. Third-party licenses are included alongside those assets.
- Letter PDFs keep the original outlined GOAL treatment and minimum two-page format.
  Rows expand for long titles, and continuation pages are added as necessary.

## Development and checks

Node 24 or newer:

```text
npm ci
npm test
npm run package
```

`tests/extension.test.mjs` checks distinct sessions, untimed events, duplicate IDs,
incomplete calendars, wrong readers/sites/months, navigation, and PDF pagination.
It writes a synthetic layout PDF to `tmp/extension-test/` for visual inspection.

`node scripts/test-server.mjs` serves a local **mock Chrome API UI harness** on
127.0.0.1:8766 with synthetic records. This verifies the real editor and PDF code,
but does not substitute for testing native extension APIs. It is excluded from the ZIP.

Manual release smoke test:

1. Load unpacked, click the action from a Beanstack calendar, and verify capture.
2. Save two triplets with different goals; reopen and switch between them.
3. Read another month and verify the real Beanstack tab moves to that month.
4. Verify wrong-reader and unsupported-view messages.
5. Preview and download; check dates, minutes, and continuation pages.
6. Reload an update from the same path and confirm saved profiles remain.

## Known limits

Beta, validated against the Gilchrist calendar DOM in September 2026.
Calendar view and English Beanstack date labels are required. Other site layouts
may need adapters; unexpected/incomplete markup blocks export. PDF fonts cover
Latin and common European scripts; broad multilingual typesetting is not tested.
Only one profile exports at a time. No automatic updates for ZIP distribution.
Institution-managed browsers may block unpacked extensions.

Native installation was not performed: browser automation policy blocked the
Chrome extension-management page. The ZIP requires the manual smoke test above.

## License

This project uses the [Apache License 2.0](LICENSE). Bundled jsPDF and Liberation
Sans assets retain their own licenses in `extension/vendor/JSPDF-LICENSE.txt`
and `extension/fonts/LICENSE.txt`.
