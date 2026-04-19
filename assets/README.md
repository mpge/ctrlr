# Assets

Brand assets for Ctrlr.

## Files

| File              | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `logo.png`        | Primary logo (controller + terminal mark, neon gradient) |
| `logo-mark.png`   | Square mark only, for favicons / app icons               |
| `logo-wide.png`   | Wide lockup with wordmark, for README hero               |
| `social-card.png` | 1200x630 OpenGraph card                                  |

## Drop-in instructions

The README hero (`README.md` → `<img src="assets/logo.png">`) loads from this
directory, so:

1. Save the source PNG as `assets/logo.png` (any aspect ratio works; the
   README scales it to 280px wide).
2. `git add assets/logo.png && git commit -m "assets: add brand logo"`
3. Push.

The TUI splash (`packages/tui/src/components/Splash.tsx`) renders an ASCII
version of the same lockup with a pink → cyan gradient — that's what users see
inside the terminal where a PNG can't go.

## Palette

| Token          | Hex       | Use                          |
| -------------- | --------- | ---------------------------- |
| `--ctrlr-bg`   | `#08070d` | Background                   |
| `--ctrlr-ink`  | `#f4f4ff` | Primary text                 |
| `--ctrlr-pink` | `#b14bff` | Gradient start, focus accent |
| `--ctrlr-cyan` | `#3ed8ff` | Gradient end, success state  |
| `--ctrlr-warn` | `#ffb547` | Warning state                |
| `--ctrlr-err`  | `#ff5470` | Error / stop                 |
