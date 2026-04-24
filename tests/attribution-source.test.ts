import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAttributionSource,
  normalizeCampaignAttributionSource,
  resolveSignupAttributionSource,
} from "../lib/attribution-source.ts";

test("normalizeAttributionSource accepts supported values and rejects unknown values", () => {
  assert.equal(normalizeAttributionSource("galxe"), "galxe");
  assert.equal(normalizeAttributionSource(" Social "), "social");
  assert.equal(normalizeAttributionSource("foobar"), null);
  assert.equal(normalizeAttributionSource(undefined), null);
});

test("resolveSignupAttributionSource defaults to organic and preserves referral fallback", () => {
  assert.equal(resolveSignupAttributionSource({ source: "galxe" }), "galxe");
  assert.equal(resolveSignupAttributionSource({ source: "foobar" }), "organic");
  assert.equal(resolveSignupAttributionSource({ referralCode: "EMORYA-8W3K9R" }), "referral");
  assert.equal(
    resolveSignupAttributionSource({ referralCode: "EMORYA-8W3K9R", source: "taskon" }),
    "taskon",
  );
  assert.equal(
    resolveSignupAttributionSource({ referralCode: "EMORYA-8W3K9R", source: "foobar" }),
    "organic",
  );
});

test("normalizeCampaignAttributionSource maps non-campaign signup sources to direct", () => {
  assert.equal(normalizeCampaignAttributionSource("zealy"), "zealy");
  assert.equal(normalizeCampaignAttributionSource("galxe"), "galxe");
  assert.equal(normalizeCampaignAttributionSource("taskon"), "taskon");
  assert.equal(normalizeCampaignAttributionSource("direct"), "direct");
  assert.equal(normalizeCampaignAttributionSource("organic"), "direct");
  assert.equal(normalizeCampaignAttributionSource("social"), "direct");
  assert.equal(normalizeCampaignAttributionSource("referral"), "direct");
  assert.equal(normalizeCampaignAttributionSource("ads"), "direct");
  assert.equal(normalizeCampaignAttributionSource("unknown"), null);
});
