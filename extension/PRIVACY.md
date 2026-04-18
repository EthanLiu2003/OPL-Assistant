# OPL Assistant Privacy Policy

**Last updated:** 2026-04-17

## What OPL Assistant does

OPL Assistant is a browser extension that adds personalized powerlifting context to openpowerlifting.org. It shows your percentile rank, qualifying total gaps, scoring (DOTS/Wilks/IPF GL), and lifter progression charts.

## Data we collect

**None.** OPL Assistant does not collect, store, or transmit any personal data to our servers.

## Data stored locally

All user data stays in your browser's local storage (`chrome.storage.local`):

- **Profile preferences:** bodyweight, age, sex, equipment, federation, weight class, display unit (kg/lb). You enter these voluntarily.
- **Chat thread:** your conversation history with the AI search feature. Stored locally, never transmitted.

You can clear all local data at any time via the extension's "Clear chat" button or by removing the extension.

## Network requests

OPL Assistant makes the following network requests:

1. **OpenPowerlifting.org API** — to fetch public rankings data and lifter competition history. This is the same data visible on the OpenPowerlifting website.

2. **OPL Assistant proxy server** (Cloudflare Worker at `opl-coach-proxy.ewl172003.workers.dev`) — to:
   - Parse natural language search queries into structured filters (via Anthropic's Claude API)
   - Cache and proxy OpenPowerlifting API responses for performance
   - Generate short insight text about rankings data

   The proxy server does **not** log, store, or retain any user queries or data. It processes requests statelessly and returns results.

## Third-party services

- **Anthropic Claude API** — used server-side (through our proxy) for natural language parsing. Your search queries are sent to Anthropic for processing but are not stored by our proxy. Anthropic's data handling is governed by their [privacy policy](https://www.anthropic.com/privacy).
- **OpenPowerlifting** — public powerlifting data. All data on OpenPowerlifting is already publicly available.

## No accounts, no tracking

- No user accounts or login
- No analytics or telemetry
- No cookies
- No advertising
- No data sold or shared with third parties

## Permissions explained

- **`storage`** — to save your profile preferences and chat history locally in your browser
- **`activeTab`** — to inject the AI Search drawer and lifter charts on openpowerlifting.org pages
- **Host permissions for openpowerlifting.org** — to read page content and inject UI enhancements
- **Host permission for our Cloudflare Worker** — to communicate with the proxy server for search parsing and data caching

## Contact

For questions about this privacy policy, open an issue at the project's GitHub repository.
