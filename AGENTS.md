# herdr-watcher

A herdr plugin that serves a mobile-first web dashboard on 127.0.0.1. Read README.md first.

## Layout
- `herdr-plugin.toml`: the plugin manifest. The startup hook and the `pane.agent_detected` hook both run `bin/launch.js`, which starts the server only if it is not already running.
- `server/`: plain ESM JavaScript with no runtime dependencies. Keep it that way.
- `web/`: a separate npm package (Vite, React, Tailwind v4, shadcn, AI Elements). Its build output `web/dist` is not committed.
- `test/`: `node --test`. Fixtures are real herdr screen captures.

## Rules
- Never read panes with `source: "recent"`. On an alternate-screen agent it scrolls the user's real pane. Use `visible`.
- Herdr's pane `revision` does not track screen content. Do not cache screen reads with it.
- Never write on an `events.subscribe` connection. The server polls instead of subscribing.
- The answer endpoint must re-read the screen and compare the fingerprint before it sends keys.
- Keep the Host/Origin guard in `server/http.js`. The server binds to 127.0.0.1 with no auth by design; users bring their own tunnel.
- UI: follows the system light/dark setting via `prefers-color-scheme` (Catppuccin Latte / Mocha). All colors are CSS variables in `web/src/index.css`; never hardcode a hex in a component. The terminal mirror stays dark in both themes. Status colors are herdr's. Workspace hues must never look like a status color. Fonts are IBM Plex Sans and IBM Plex Mono. Use mono only for terminal, command and tool output.

## Verify
- `npm test`
- `npm --prefix web run build`
- For UI changes, screenshot at 390×844 against a live herdr and check a real blocked Claude pane.
