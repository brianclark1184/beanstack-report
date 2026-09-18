# Chrome Web Store submission — Reading Log for Beanstack

## Distribution

- Visibility: **Unlisted** (anyone with the listing URL can install).
- Price: Free.
- Language: English (United States).
- Suggested category: Productivity; choose an appropriate education subcategory if offered.
- Package: `output/extension/reading-log-beanstack-0.1.3.zip`.
- Icon: `extension/icons/128.png`.
- Required small promotional tile: `store/assets/promo-440x280.png`.
- Screenshots: `store/assets/screenshot-profiles-1280x800.png` and
  `store/assets/screenshot-export-1280x800.png` (synthetic example data).
- Homepage: https://github.com/brianclark1184/beanstack-report
- Support: https://github.com/brianclark1184/beanstack-report/issues
- Privacy policy: https://github.com/brianclark1184/beanstack-report/blob/codex/unlisted-store/docs/privacy-policy.md

## Short description (manifest)

Turn Beanstack reading history into printable PDFs with saved student, teacher, class, and reading-goal profiles.

## Detailed description (paste into Store listing)

Create a printable monthly reading log from your Beanstack reading calendar.

Reading Log for Beanstack helps families turn reading history into a school-ready PDF. Sign in to Beanstack as usual, open the intended reader's Reading Log in Calendar view, and click the extension icon.

FEATURES
- Save multiple Student / Teacher / Class profiles.
- Remember a Beanstack reader and nightly/monthly goals for each profile.
- Select a month and read its entries from the Beanstack calendar.
- Keep one row per reading session, including separate sessions for the same book and day.
- Exclude completion-only and zero-minute entries, and show total minutes read on the PDF.
- Preview or download a Letter-size PDF, with blank rows and continuation pages as needed.
- Export one selected profile at a time.

PRIVACY
Profiles are saved locally in Chrome. Reading entries stay in the editor tab's memory, and PDFs are generated on your computer. The extension does not transmit student information or reading records to its developer, OpenAI, advertisers, or analytics services. It uses your existing Beanstack session to navigate calendar months.

No AI key, subscription, or separate extension account is required.

GET STARTED
1. Open the reader's Beanstack Reading Log in Calendar view.
2. Click the extension icon.
3. Enter the student, teacher, and class, then link the displayed reader and save.
4. Choose a month and click Read from Beanstack.
5. Preview or download the PDF.

This is an early beta tested with an English-language school Beanstack calendar. Other layouts may need adjustments. List view and All Titles are not supported. Completion-only and zero-minute entries are excluded. Other untimed entries, such as pages, show a dash for minutes. The PDF has at least two pages.

Independent tool; not affiliated with or endorsed by Beanstack. Existing Beanstack access is required. Screenshots use sample data.

## Privacy practices fields

Single purpose:
Create printable monthly PDF reading logs from the user's selected Beanstack calendar, using locally saved student/teacher/class profiles and reading goals.

activeTab justification:
Temporarily access the Beanstack calendar tab where the user clicks the extension icon, read the selected reader and month's entries, and verify the page belongs to a supported Beanstack site. This avoids requesting persistent access to all websites.

scripting justification:
Inject the extension's bundled calendar extraction and month-navigation functions into that user-authorized tab. They read dates, titles, durations, entry statuses, and reader identity, and use Beanstack's existing previous/next month controls. They do not modify reading records.

storage justification:
Save Student / Teacher / Class profiles, goals, and linked Beanstack reader names, IDs, and site addresses in chrome.storage.local. Data is not synced or sent to a developer server. Reading entries are held in editor memory rather than persistent storage.

Remote code: **No**. All extension JavaScript, PDF code, and fonts are bundled.

Data categories to disclose (local handling still counts under Google's policy):
- Personally identifiable information: student/teacher/reader names and Beanstack reader IDs.
- Website content: calendar dates, book titles, durations, and entry statuses.
- Web history: the current Beanstack page/site address used to identify the reader/site; no general browsing history is recorded and no history permission is requested.

No payment, health, authentication, personal-communication, precise-location, or general user-activity tracking data is accessed by the extension. Do not claim that it handles no user data merely because processing is local.

The implementation does not sell or transfer data to third parties, use it for unrelated purposes, or use it for creditworthiness/lending. The publisher should review the dashboard certifications before submitting them.

## Reviewer testing instructions

This extension requires an existing school/library Beanstack reader login. It does not supply or collect login credentials. Use a dedicated test account and synthetic reading records, not a child's live account.

1. Sign in to the supplied Beanstack test account (publisher must arrange access if requested).
2. Open the test reader's Reading Log, then Calendar view. English date labels are required.
3. Click the extension icon to open the editor.
4. Enter sample Student / Teacher / Class values, link the displayed reader, and save.
5. Add a second class profile with different goals, then switch profiles and verify persistence.
6. Select a month that has test reading entries and click Read from Beanstack.
7. Preview and download the PDF. Distinct sessions stay separate; untimed entries show a dash.
8. Check that export is disabled for a different linked reader or an unread month.

The repository contains a local UI harness and synthetic automated tests for developer validation. These are not included in the installed extension and do not replace a real Beanstack test login.

## Remaining release checks

- Perform an installed-extension smoke test; earlier checks covered live DOM extraction and a local UI harness, not the native toolbar/permission flow.
- Arrange reviewer test access if requested; do not disclose an existing child's credentials.
- After Google approves the submission, verify the resulting store URL and unlisted visibility.

Status (September 18, 2026): developer registration paid and activated. Version
0.1.3 uploaded as item `cfekcfmecbnbmpekmiinanikdcipnkdf`. Store listing, icon,
both screenshots, promotional tile, privacy disclosures, and Unlisted/free
distribution are saved. Concise reviewer instructions are saved; no test
credentials have been supplied. Resubmitted for review on September 18, 2026;
Google confirmed submission and the dashboard shows **Pending review**.
Automatic publication after passing review is enabled.

The pending 0.1.2 review was canceled and replaced with 0.1.3 on September 18,
2026. This version excludes completion-only and zero-minute rows and adds Total
Minutes Read to the PDF. Store description and reviewer instructions were updated.
All 11 tests passed; the packaged code audit passed, and the new PDF total was
visually checked for spacing. Visibility remains Unlisted.

Version 0.1.1 was rejected for Blue Argon: the upstream PDF library included an
unused PDFObject remote-script loader. Version 0.1.2 removes that loader, the
external PDF.js viewer mode, and optional HTML/SVG dependency loaders. The
packaged library is generated reproducibly from pinned upstream source; the
package build checks it and audits extension code for executable loaders.
All nine tests passed, including offline preview/download and PDF output
comparison against upstream. The extracted release ZIP passed the code audit.

Dashboard:
https://chrome.google.com/webstore/devconsole/f6d3d760-f225-4b3e-b929-6f865d5344ea/cfekcfmecbnbmpekmiinanikdcipnkdf/edit

The publisher approved `bclark@cassinicap.com` as the public contact address.
Google confirmed this address is verified. Reviewer Beanstack test access and
the installed-extension smoke test remain outstanding.

The privacy policy is distributed on the `codex/unlisted-store` repository branch.
Keep that branch available while its URL is used in the store listing. If the
policy is later merged to main, update the listing URL to the main-branch page.

Official references checked September 16, 2026:
- https://developer.chrome.com/docs/webstore/publish/
- https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/images
