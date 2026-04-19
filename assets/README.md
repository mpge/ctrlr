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

The repository ships with placeholders. To install the real assets, save the
official PNG into `assets/logo.png`. Anything that consumes the logo (the
README, the marketing site, the Tauri app icon) reads from this directory.

## Palette

| Token          | Hex       | Use                          |
| -------------- | --------- | ---------------------------- |
| `--ctrlr-bg`   | `#08070d` | Background                   |
| `--ctrlr-ink`  | `#f4f4ff` | Primary text                 |
| `--ctrlr-pink` | `#b14bff` | Gradient start, focus accent |
| `--ctrlr-cyan` | `#3ed8ff` | Gradient end, success state  |
| `--ctrlr-warn` | `#ffb547` | Warning state                |
| `--ctrlr-err`  | `#ff5470` | Error / stop                 |
