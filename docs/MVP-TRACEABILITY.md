# ClearPlay MVP implementation matrix

| PRD requirement | Status | Implementation / limitation |
| --- | --- | --- |
| URL import, platform detection, video ID, metadata, validation, errors | Implemented | `AdapterRegistry` and `YouTubeAdapter` validate supported YouTube URL forms; oEmbed metadata is best-effort with a clear fallback. |
| Multi-platform detection and protected-platform boundary | Implemented / provider-dependent | Vimeo, Dailymotion, Twitch, Wistia, Loom, Internet Archive, and protected services are recognized for honest unsupported/external-open messaging. YouTube is the only playable adapter currently wired; PeerTube requires an instance-specific adapter. No protected playback is faked. |
| Clean responsive player | Implemented | Existing adapter-backed `VideoPlayer` now has loading/error states, keyboard shortcuts, seek, speed, mute, fullscreen, responsive controls, and autoplay preference. YouTube's supported iframe controls remain the source of truth for platform playback. |
| Watch Later | Implemented | Existing IndexedDB repository is preserved; save state is loaded, duplicate saves are prevented, and feedback is visible. |
| Local history | Implemented | History is written after meaningful playback, sorted, reopenable, clearable, and has loading/error/empty states. |
| Continue Watching | Implemented | Playback positions persist after 10 seconds, on meaningful progress, and when the player is torn down; resume links include position, progress is displayed, and near-complete videos are removed. |
| Focus Mode | Implemented | Persisted preference hides surrounding navigation and metadata while leaving the player and exit control available. |
| Smart Skip categories and auto/ask behavior | Partially implemented | Typed `VideoSegment` and `smartSkipEngine` contracts are present, but no legitimate segment provider is configured. The YouTube adapter returns no invented segments, so the UI degrades honestly. |
| Smart Chapters | Not technically supported | No chapter metadata is available through the current legitimate YouTube/oEmbed path; no timestamps or titles are fabricated. |
| Playback preferences | Implemented | Local preferences cover `autoSkipSponsor`, `autoSkipIntro`, `autoSkipOutro`, `focusMode`, `autoplay`, `theme`, and `skipMode`; dark/light theme changes the actual CSS variables. |
| Shareable viewing and deep links | Implemented | `/watch?v=…&t=…` opens the intended video and optional position, legacy `?video=…` remains readable, Web Share is used where available, and clipboard fallback is provided. |
| Browser install affordance | Provider-dependent | The real `beforeinstallprompt` event is surfaced as “Install app” when the browser offers it; unsupported platforms are not represented as installed. |
| Time Saved session summary | Deferred | The current player contract does not expose trusted segment skips, so no time or skip count is fabricated. |
| PWA manifest/service worker/offline shell | Implemented | Existing `vite-plugin-pwa` setup is retained, missing asset references removed, production shell assets are precached, and video streams are not runtime-cached. |
| Privacy/security principles | Implemented / verified by design | No credentials, downloads, stream proxying, DRM circumvention, or backend history were added; URL parsing is allow-listed through adapters. |
