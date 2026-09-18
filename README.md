# Beanstack Report — Reading Log for Beanstack

An offline PDF formatter with saved Student / Teacher / Class profiles. No AI key,
backend, telemetry, or ongoing service costs. Includes a Chrome extension and the
original standalone Python formatter. Personal reading records are excluded from
the repository and are not packaged into the extension.

## Install from the Chrome Web Store

**[Install Reading Log for Beanstack](https://chromewebstore.google.com/detail/cfekcfmecbnbmpekmiinanikdcipnkdf)**

**Release status (September 18, 2026):** version 0.1.1 was rejected because an unused
PDF-library feature could load external code. Version 0.1.2 removes that feature
and other optional dependency loaders. Version 0.1.3 replaces that submission with
completion-only/zero-minute filtering and a total-minutes field on the PDF. The dashboard
shows **Pending review**, with automatic publication after approval enabled. Store
installation will be available after approval. Until then, the link above may
show an unavailable page; the development ZIP is available below.

Once the listing is available:

1. Open the installation link above in Google Chrome on your computer.
2. Click **Add to Chrome**, review the requested permissions, then click
   **Add extension**.
3. Open Chrome's **Extensions** menu (the puzzle-piece icon) and pin
   **Reading Log for Beanstack** for easy access.

The listing is **unlisted**, so use the direct link rather than searching the
Chrome Web Store. Anyone with the link can install and share it; unlisted does
not restrict access to particular people. Installation is free, no OpenAI key or
Developer mode is required, and Chrome manages extension updates.

School- or work-managed browsers may require administrator approval. See
[Google's extension installation help](https://support.google.com/chrome_webstore/answer/2664769?hl=en)
if installation is blocked. Saved profiles from an unpacked development copy do
not automatically transfer to the store installation; enter them again.

## Install from a development ZIP (alternative)

This option works while the Chrome Web Store submission is awaiting approval.
Use Chrome on a computer; no OpenAI key or build tools are required.

1. [Download the development ZIP](https://github.com/brianclark1184/beanstack-report/archive/refs/heads/codex/unlisted-store.zip),
   or use a supplied extension package such as `reading-log-beanstack-0.1.3.zip`.
2. Extract **all** files into a permanent folder, such as
   `Documents/Reading Log`. On Windows, right-click the ZIP and choose
   **Extract All**; on macOS, double-click it.
3. Type `chrome://extensions` into Chrome's address bar and press Enter.
4. Turn on **Developer mode** in the upper-right corner.
5. Click **Load unpacked** and select the folder containing `manifest.json`:
   - For the GitHub development ZIP, select the **extension** folder inside the
     extracted repository folder.
   - For the packaged extension ZIP, select the extracted folder itself.
6. Open Chrome's puzzle-piece **Extensions** menu and pin
   **Reading Log for Beanstack**, then follow [Create a reading log](#create-a-reading-log)
   below.

Keep the extracted folder in place: Chrome loads the extension from that folder.
Select the extracted folder, not the ZIP file. If Chrome reports a missing
manifest, check that the selected folder directly contains `manifest.json`.
Managed school or work browsers may block Developer mode or unpacked extensions;
ask your administrator if these controls are unavailable. See
[Google's unpacked extension guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
for more detail.

**Updating a ZIP installation:** save your profiles and close open Reading Log
editor tabs. Extract the new ZIP and copy the extension files into the **same
permanent extension folder**, replacing the old files. Return to
`chrome://extensions` and click **Reload** on Reading Log for Beanstack. Unpacked
extensions do not update automatically. Keep the same folder path and avoid
removing/reinstalling the extension to preserve saved profiles.

## Create a reading log

1. Sign in to your school or library's Beanstack site and select the intended reader.
2. Open **Reading Log → Calendar**, then click the pinned extension icon.
   Keep the Beanstack tab open.
3. Enter the **Student**, **Teacher**, and **Class**, and adjust the reading goals.
4. Click **Use reader: [name]** to link the displayed reader, then **Save profile**.
   Use **New** to add more Student / Teacher / Class profiles.
5. Choose the export month and click **Read from Beanstack**.
6. Check the entries, then click **Preview PDF** or **Download PDF**.

Each export uses one selected profile. To change students, select the next reader
in Beanstack and click the extension icon again. If several profiles share a reader,
select the desired teacher and class in the editor. Profiles and goals are saved
locally in Chrome; reading entries stay in the open editor tab's memory.

Each reading session remains a separate row. Completed events without reading
time and zero-minute entries are excluded from the preview and PDF. Other untimed
entries, such as pages, have a dash for minutes and a status next to the title.
Adjacent calendar months are excluded. Repeated identical IDs are deduplicated;
distinct sessions are not.
The PDF also shows the total minutes read for the selected month.

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
- PDF generation uses a reproducible local build of jsPDF 4.2.1 and Liberation
  Sans fonts. External viewer modes and optional HTML/SVG loaders are removed.
  See [PDF bundle notes](extension/vendor/JSPDF-BUILD.md). Third-party licenses
  are included alongside those assets.
- Letter PDFs keep the original outlined GOAL treatment and minimum two-page format.
  Rows expand for long titles, and continuation pages are added as necessary.

## Development and checks

For local development, load the `extension` folder unpacked using the instructions
in [extension/START-HERE.txt](extension/START-HERE.txt). You can also build a ZIP
under `output/extension` with `npm run package`; it contains only `extension/` files.
Unpacked copies require manual updates.

Node 24 or newer:

```text
npm ci
npm run check:extension
npm test
npm run package
```

`tests/extension.test.mjs` checks distinct sessions, untimed events, duplicate IDs,
incomplete calendars, wrong readers/sites/months, navigation, and PDF pagination.
It writes a synthetic layout PDF to `tmp/extension-test/` for visual inspection.
PDF tests execute the exact browser bundle shipped in the extension, including
Blob previews and file downloads with network requests blocked. Packaging checks
the reproducible vendor build and scans scripts for dynamic code loaders. Run
`npm run build:vendor` to regenerate the reviewed PDF bundle.

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
