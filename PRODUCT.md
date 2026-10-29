# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
An internal team transcribing meetings and interviews. They work with live microphone input and recorded .wav files, and need to know who said what.

## Product Purpose
Turn spoken audio into a usable, attributable transcript. Success is a transcript the team can read, copy and export without cleanup.

## Positioning
Azure Speech-backed transcription with speaker diarization, behind Static Web Apps authentication, so keys never reach the browser.

## Operating Context
Angular app on Azure Static Web Apps calling an ASP.NET Core API (`/api/speech/token`, `recognize`, `diarize`). Browser uses short-lived tokens, not the Speech key. Users are authenticated through SWA.

## Capabilities and Constraints
- Live microphone recognition; .wav file upload (once or continuous recognition).
- Diarization returns phrases with speaker IDs; not yet surfaced in the UI.
- Output must be copy-able and exportable.
- Language currently fixed to en-US (undecided whether to expose a selector).

## Evidence on Hand
No logo, brand assets, testimonials or usage data exist. Do not fabricate them.

## Product Principles
- The transcript is the product; controls serve it.
- Always show system state: is the mic live, is a file processing.
- Speaker attribution is a first-class part of the output.
- Errors state plain-language causes and a next action.

## Accessibility & Inclusion
No formal standard confirmed; treat WCAG AA as the working baseline, including live-region announcements for transcripts and errors.
