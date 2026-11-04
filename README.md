# Personal desk

Static deployment for [Personal desk](https://yjyj41.github.io/personal-desk-web/).

Journal and routines. Sign in with your existing Google account for cloud records.

This repository contains browser assets only. Personal records and backups are not included.

## Journal, tags and connected records

- Settings → 태그 관리 is the shared vocabulary for journal entries and calendars. Tags are created only here (or the same manager opened from Journal); normalized duplicate names are rejected. Rename, usage counts, merge and removal update every reference. Removing a tag never removes a record.
- The existing daily journal remains intact. Additional dated entries support multiple tags, title/body search, topic views, `[[title]]` or stable `[[entry-id]]` links and backlinks. The link picker inserts stable IDs so renaming a title does not break inserted links. Additional entries and tags are included in the existing JSON backup and journal PDF export.
- Calendar tag switches affect visibility only. With multiple tags, an event appears when at least one of its tags is enabled; untagged records have their own switch. Google calendar visibility and synchronization are independent.
- Google events are read-only until explicitly linked. New plans are never sent by default. Choose the destination calendar on each new connection. Disconnecting preserves both records and their identity so reconnecting does not duplicate an event. Remote deletion has a separate explicit control. Google events with attendees, all-day events, times before 06:00 or non-half-hour times remain read-only because the existing schedule grid cannot represent them safely.
- Routine exercises appear as live source-backed cards on their date in Today and Journal, including updates and removals. Other Routine records (including private records) are not displayed or copied into journal backups. Routine retains its own backup tools.
- Google sign-in from Journal authenticates both existing Firebase projects using the Google credential in memory. Existing signed-in users can use “Google 계정으로 함께 연결” once. Ownership is checked using the Google provider subject, not email or project-specific Firebase UID. No security rules or data collection paths change.

The Routine directory contains a compiled deployment artifact, not its original React source. Its bootstrap now uses the `routineShared` Firebase app name and IndexedDB persistence (`za` in this exact bundle), matching `shared/routine-journal.mjs`. Preserve these two bootstrap changes when replacing the bundle with a future upstream build. Personal records stay in `routine160/{uid}`.

## Verification

Run `node --test --test-isolation=none tests/*.test.mjs` on Node 24. Tests cover legacy backups, tags and merges, note links, visibility, selective Calendar reconciliation, reconnect identity, and Routine account boundaries/source updates.

Browser smoke checks cover tag management, note creation, linked tags and backlinks, and the production app's signed-out startup. A real-account check of both Firebase projects and Google Calendar authorization/sync is still needed; automated tests use synthetic records and mocked Calendar transport, without modifying personal data.
