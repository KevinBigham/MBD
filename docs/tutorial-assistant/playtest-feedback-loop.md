# Closed Playtest Feedback Loop V2

## Shipped

Mack Mercer now includes a `Give feedback` action inside the expanded Assistant panel.

The form asks:

- Was Mack helpful? 1-5
- Did you know what to do next? 1-5
- What confused you?

The `Copy report` action writes a backend-free diagnostic text report to the clipboard.

## Report Fields

- app version when provided by `VITE_APP_VERSION`, otherwise `local`
- route and normalized Assistant route key
- phase, season, day
- Assistant mode
- completed Assistant route keys
- viewport category
- tester scores and comment

## Backend

No backend or external service is required. Closed testers can paste the copied report into Slack, email, GitHub, or a playtest doc.
