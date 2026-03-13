import test from "node:test";
import assert from "node:assert/strict";

import { hashPassword, verifyPassword } from "../server/auth/passwords.ts";

test("hashPassword prefixes scrypt and verifyPassword accepts the original secret", () => {
  const password = "CorrectHorseBatteryStaple42!";
  const hash = hashPassword(password);

  assert.match(hash, /^scrypt:[a-f0-9]+:[a-f0-9]+$/);
  assert.equal(verifyPassword(password, hash), true);
});

test("verifyPassword rejects the wrong secret and malformed hashes", () => {
  const hash = hashPassword("ValidSecret123!");

  assert.equal(verifyPassword("WrongSecret123!", hash), false);
  assert.equal(verifyPassword("ValidSecret123!", "sha256:not-a-real-hash"), false);
  assert.equal(verifyPassword("ValidSecret123!", null), false);
});
