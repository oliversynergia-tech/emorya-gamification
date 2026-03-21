import assert from "node:assert/strict";
import test from "node:test";

import {
  brandThemes,
  defaultBrandThemeId,
  getBrandTheme,
  getBrandThemeStyleVariables,
  resolveBrandThemeId,
} from "../lib/brand-themes/index.ts";

test("brand theme registry defaults cleanly to emorya", () => {
  assert.equal(defaultBrandThemeId, "emorya");
  assert.equal(resolveBrandThemeId(undefined), "emorya");
  assert.equal(resolveBrandThemeId("unknown-partner"), "emorya");
});

test("active theme tokens include the shell-level variables needed by globals", () => {
  const theme = getBrandTheme("emorya");
  const cssVariables = getBrandThemeStyleVariables(theme);

  assert.equal(theme.brand.platformName, "Emorya Gamification");
  assert.equal(theme.brand.logoSrc, "/brand/emorya-wordmark.svg");

  for (const key of [
    "--font-display",
    "--font-body",
    "--bg",
    "--surface",
    "--app-gradient-start",
    "--topbar-surface",
    "--mission-cue-ready-surface",
  ]) {
    assert.ok(cssVariables[key as keyof typeof cssVariables], `Missing theme token: ${key}`);
  }
});

test("brand theme registry exposes the default brand entry", () => {
  assert.ok(brandThemes.emorya);
  assert.equal(brandThemes.emorya.id, "emorya");
  assert.equal(brandThemes.emorya.label, "Emorya");
});
