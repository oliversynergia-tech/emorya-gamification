# Brand Assets

This app no longer depends on a remote Emorya logo URL for the main navigation shell.

## Current local brand assets

- local wordmark: [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/public/brand/emorya-wordmark.svg`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/public/brand/emorya-wordmark.svg)

## Optional local font upgrade

If you have approved brand font files available locally, place them in:

- [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/public/fonts`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/public/fonts)

Expected filenames:

- `SpaceGrotesk-Variable.woff2`
- `Manrope-Variable.woff2`

The CSS font hooks are already wired in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/app/globals.css`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/app/globals.css), so once the files are added the app will use them automatically.

## Why this is set up this way

- no runtime dependency on a remote logo asset
- no code refactor needed when the real local fonts become available
- safe fallback to the current local/system font stack if the font files are absent
