import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { parseCsv } from "./build-guest-index.mjs";
import {
  lookupGuestInIndex,
  normalizeGuestName,
  validateGuestIndex,
} from "../lib/guest-index-crypto.ts";

async function createLoader(fetchMock) {
  const source = await fs.readFile(resolve("lib/guest-index.ts"), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    fetch: fetchMock,
    require(specifier) {
      if (specifier === "@/lib/public-path") {
        return { publicAssetPath: (path) => `/wedding${path}` };
      }
      if (specifier === "@/lib/guest-index-crypto") {
        return { lookupGuestInIndex, validateGuestIndex };
      }
      throw new Error("Unexpected loader import");
    },
  }, { filename: "guest-index-loader.js" });
  return module.exports;
}

test("the real encrypted index matches two active private CSV rows without printing personal data", async () => {
  const csv = await fs.readFile(resolve("private/guests.csv"), "utf8");
  const indexText = await fs.readFile(resolve("public/data/guest-index.json"), "utf8");
  const index = validateGuestIndex(JSON.parse(indexText));
  const rows = parseCsv(csv);
  const headers = rows[0].fields.map((value) => value.trim().toLowerCase());
  const nameColumn = headers.indexOf("name");
  const messageColumn = headers.indexOf("message");
  const activeColumn = headers.indexOf("active");
  const activeRows = rows.slice(1).filter((row) =>
    ["true", "1", "y", "yes"].includes(row.fields[activeColumn].trim().toLowerCase())
  );
  assert.ok(activeRows.length >= 2, "Two active test rows are required");

  for (const row of activeRows.slice(0, 2)) {
    const name = row.fields[nameColumn];
    const expectedMessage = row.fields[messageColumn];
    const result = await lookupGuestInIndex(index, name);
    assert.ok(result.found && result.message === expectedMessage, "Registered lookup mismatch");
  }

  const firstName = activeRows[0].fields[nameColumn];
  const spacedName = Array.from(firstName).join(" ");
  const nameWithSuffix = `${firstName.endsWith("님") ? firstName.slice(0, -1) : firstName}님`;
  const spaced = await lookupGuestInIndex(index, spacedName);
  const withSuffix = await lookupGuestInIndex(index, nameWithSuffix);
  assert.ok(spaced.found && withSuffix.found, "Name normalization mismatch");
  assert.equal(normalizeGuestName(spacedName), normalizeGuestName(firstName));
  assert.equal(normalizeGuestName(nameWithSuffix), normalizeGuestName(firstName));

  for (const missingName of ["존재하지않는가상하객일", "존재하지않는가상하객이"]) {
    const result = await lookupGuestInIndex(index, missingName);
    assert.ok(!result.found, "Unregistered lookup should not find an entry");
  }

  const lookupId = pbkdf2Sync(
    normalizeGuestName(firstName),
    Buffer.from(index.kdf.salt, "base64"),
    index.kdf.iterations,
    64,
    "sha256"
  ).subarray(0, 32).toString("hex");
  const corruptIndex = structuredClone(index);
  const ciphertext = Buffer.from(corruptIndex.entries[lookupId].ciphertext, "base64");
  ciphertext[0] ^= 1;
  corruptIndex.entries[lookupId].ciphertext = ciphertext.toString("base64");
  await assert.rejects(lookupGuestInIndex(validateGuestIndex(corruptIndex), firstName));

  const corruptIvIndex = structuredClone(index);
  const iv = Buffer.from(corruptIvIndex.entries[lookupId].iv, "base64");
  iv[0] ^= 1;
  corruptIvIndex.entries[lookupId].iv = iv.toString("base64");
  await assert.rejects(lookupGuestInIndex(validateGuestIndex(corruptIvIndex), firstName));

  assert.throws(() => validateGuestIndex({ ...index, version: 2 }));
  assert.throws(() => validateGuestIndex({ ...index, kdf: { ...index.kdf, salt: "bad" } }));
  assert.deepEqual(Object.keys(index), ["version", "kdf", "cipher", "entries"]);
  assert.deepEqual(Object.keys(index.kdf), ["name", "hash", "iterations", "salt"]);
  for (const entry of Object.values(index.entries)) {
    assert.deepEqual(Object.keys(entry), ["iv", "ciphertext"]);
  }
  for (const row of activeRows) {
    assert.ok(!indexText.includes(row.fields[nameColumn]), "Plaintext name in public index");
    assert.ok(!indexText.includes(row.fields[messageColumn]), "Plaintext message in public index");
  }
});

test("preload and repeated lookups share one basePath-aware JSON fetch", async () => {
  const index = JSON.parse(await fs.readFile(resolve("public/data/guest-index.json"), "utf8"));
  const urls = [];
  const loader = await createLoader(async (url) => {
    urls.push(url);
    return { ok: true, json: async () => index };
  });

  loader.preloadGuestIndex();
  assert.ok(!(await loader.lookupGuest("존재하지않는가상하객일")).found);
  assert.ok(!(await loader.lookupGuest("존재하지않는가상하객이")).found);
  assert.deepEqual(urls, ["/wedding/data/guest-index.json"]);
});

test("a failed preload is not cached and the next lookup retries the index fetch", async () => {
  const index = JSON.parse(await fs.readFile(resolve("public/data/guest-index.json"), "utf8"));
  let count = 0;
  const loader = await createLoader(async () => {
    count += 1;
    if (count === 1) throw new Error("Simulated fetch failure");
    return { ok: true, json: async () => index };
  });

  loader.preloadGuestIndex();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(!(await loader.lookupGuest("존재하지않는가상하객일")).found);
  assert.equal(count, 2);
});

test("HTTP and malformed JSON failures reject rather than becoming an unregistered result", async () => {
  for (const response of [
    { ok: false, status: 404 },
    { ok: true, json: async () => { throw new Error("Invalid JSON"); } },
  ]) {
    const loader = await createLoader(async () => response);
    await assert.rejects(loader.lookupGuest("존재하지않는가상하객일"));
  }
});
