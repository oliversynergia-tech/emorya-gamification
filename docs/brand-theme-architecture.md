# Brand Theme Architecture

This is the foundation for the upcoming multi-brand skinning layer.

## Current Theme Model

The app now has a registry-driven brand theme layer in:

- `lib/brand-themes/types.ts`
- `lib/brand-themes/emorya.ts`
- `lib/brand-themes/index.ts`

The current implementation does three things:

1. keeps `Emorya` as the default active brand
2. exposes brand metadata separately from theme tokens
3. injects CSS custom properties from the active theme at the app shell level

## What Is Themeable

The current token model is designed to cover:

- typography
- spacing rhythm
- radius system
- shadow system
- core surfaces and borders
- text and accent colors
- app background treatments
- shell glows and mesh treatment
- mission-cue styling
- shell-level brand assets and copy

## How Themes Activate

The active theme is currently config-driven through:

- `NEXT_PUBLIC_BRAND_THEME`
- or `BRAND_THEME`

If no value is supplied, the app falls back to `Emorya`.

## Why This Matters

This keeps the current UI structure intact while moving brand expression into:

- theme files
- shared tokens
- shell-level metadata

That makes future flagship skins like `MultiversX` and `xPortal` additive instead of invasive.

## Next Theme Steps

- add `MultiversX` theme file
- add `xPortal` theme file
- expand shared CSS token usage where current styles still rely on fallback literals
- add a theme switcher for demo and validation
