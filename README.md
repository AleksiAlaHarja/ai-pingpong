# ai-pingpong

A neon Pong game in vanilla JS + Canvas. No frameworks, no assets — one `main.js`.

![mode](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Canvas-4ce0c8) ![build](https://img.shields.io/badge/bundler-vite-ff4d7e)

## Play

```bash
npm install
npm run dev      # http://localhost:8080
```

Build a static bundle with `npm run build` (outputs to `dist/`), preview it with `npm run preview`.

## Controls

| Action | Keys |
| --- | --- |
| Move paddle | `W` / `S` or `↑` / `↓` |
| Pause / resume | `Space` |
| Touch & mouse | Drag on your half of the court |

In **2 Players** mode the left player uses `W`/`S`, the right player uses `↑`/`↓` — or each side drags on their half.

## Modes

| Mode | Paddle speed | Reaction | Aim error |
| --- | --- | --- | --- |
| Easy | 380 px/s | 0.30 s | ±60 px |
| Normal | 520 px/s | 0.16 s | ±30 px |
| Hard | 720 px/s | 0.06 s | ±10 px |
| 2 Players | — | — | — |

The CPU simulates the ball forward through wall bounces to predict where it will arrive, then chases that point with a capped speed, a reaction lag, and a random aim error — so higher difficulties read the ball earlier and more accurately instead of just moving faster.

## How it plays

- **Angle-based bounces** — where the ball strikes the paddle sets the exit angle (up to ~53°), and the paddle's own velocity adds spin.
- **Escalating rallies** — the ball gains ~5.5% speed per hit, capped at 1050 px/s, and resets on each serve.
- **Sub-stepped collision** — ball movement is split into ≤8 px steps each frame so a fast ball can never tunnel through a paddle.
- First to **7** points wins.

## Structure

```
index.html     markup + HUD + overlay menu
style.css      neon theme, responsive layout
main.js        game loop, physics, AI, particles, WebAudio sound
vite.config.js dev server config
```

`window.__pong` exposes the ball, paddles, state and score for debugging in the console.
