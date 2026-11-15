# Pulse design preview

Renders the real app in a browser with local demo data (no Firebase account, no
network), so screens can be checked against `Design/pulse/Pulse.dc.html`.

```bash
PULSE_PREVIEW=1 npx expo start --web --port 8090
```

Open `http://localhost:8090/` at a phone width (390 px). URL parameters:

| Param | Effect |
| --- | --- |
| `theme=dark` | start in the dark theme |
| `auth=out` | start signed out (Auth stack) |
| `nav=Tab/Screen` | open a screen, e.g. `nav=Wealth/MFPortfolio`, `nav=Plan/Goals`, `nav=Auth/Login` |

`PULSE_PREVIEW` only changes module resolution in `metro.config.js`: Firebase,
Yahoo Finance and session modules are swapped for `preview/mocks/*`. Normal
`expo start` / EAS builds are unaffected.

Useful checks after UI changes:

```bash
node scripts/check-undefined.js      # identifiers used but never declared/imported
npx expo export --platform android   # full native bundle compiles
```
