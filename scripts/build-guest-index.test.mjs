import assert from "node:assert/strict";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, isAbsolute } from "node:path";
import test from "node:test";
import { buildGuestIndex, normalizeGuestName, parseCsv } from "./build-guest-index.mjs";

async function withTemporaryFiles(callback) {
  const directory = await fs.mkdtemp(join(tmpdir(), "wedding-guest-index-test-"));
  try {
    return await callback({
      inputPath: join(directory, "guests.csv"),
      outputPath: join(directory, "guest-index.json"),
    });
  } finally {
    const target = resolve(directory);
    const withinTemp = relative(resolve(tmpdir()), target);
    if (!withinTemp.startsWith("..") && !isAbsolute(withinTemp) &&
        target.split(/[\\/]/u).at(-1).startsWith("wedding-guest-index-test-")) {
      await fs.rm(target, { recursive: true, force: true });
    }
  }
}

test("CSV parser handles quoted commas, escaped quotes, CRLF/LF and multiline fields", () => {
  const rows = parseCsv('name,side,relation,message,active\r\n가상가,신랑,친구,"안녕, ""친구""!\r\n다음 줄",TRUE\n가상나,신부,친구,"끝",no');
  assert.equal(rows.length, 3);
  assert.equal(rows[1].line, 2);
  assert.equal(rows[1].fields[3], '안녕, "친구"!\r\n다음 줄');
  assert.equal(rows[2].line, 4);
  assert.equal(rows[2].fields[3], "끝");
  assert.equal(normalizeGuestName("  가 상 가님  "), "가상가");
  assert.equal(normalizeGuestName("  Kim Minho  "), "kimminho");
});

test("active rows are encrypted, inactive rows excluded, and existing salt reused", async () => {
  await withTemporaryFiles(async ({ inputPath, outputPath }) => {
    const message = '반가워, "친구"!\n좋은 날 함께해 줘.';
    await fs.writeFile(inputPath,
      `name,side,relation,message,active\n가상가,신랑,친구,"반가워, ""친구""!\n좋은 날 함께해 줘.",TRUE\n가상나,신부,친구,비활성 메시지,FALSE`, "utf8");
    const result = await buildGuestIndex({ inputPath, outputPath });
    assert.equal(result.count, 1);

    const output = await fs.readFile(outputPath, "utf8");
    const index = JSON.parse(output);
    assert.deepEqual(Object.keys(index), ["version", "kdf", "cipher", "entries"]);
    assert.equal(index.kdf.iterations, 100_000);
    assert.equal(Object.keys(index.entries).length, 1);
    assert.ok(!output.includes("가상가"));
    assert.ok(!output.includes("가상나"));
    assert.ok(!output.includes(message));
    assert.ok(!output.includes("relation"));

    const derived = pbkdf2Sync("가상가", Buffer.from(index.kdf.salt, "base64"), 100_000, 64, "sha256");
    const lookupId = derived.subarray(0, 32).toString("hex");
    const encrypted = index.entries[lookupId];
    assert.ok(encrypted);
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
    const decipher = createDecipheriv("aes-256-gcm", derived.subarray(32), Buffer.from(encrypted.iv, "base64"));
    decipher.setAuthTag(ciphertext.subarray(-16));
    const decrypted = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]).toString("utf8");
    assert.deepEqual(JSON.parse(decrypted), { type: "invite", message });
    assert.equal(index.version, 2);

    await buildGuestIndex({ inputPath, outputPath });
    const rebuilt = JSON.parse(await fs.readFile(outputPath, "utf8"));
    assert.equal(rebuilt.kdf.salt, index.kdf.salt);
    assert.ok(rebuilt.entries[lookupId]);
    assert.notEqual(rebuilt.entries[lookupId].iv, encrypted.iv);
  });
});

test("optional type encrypts Easter Egg payload and rejects invalid active types", async () => {
  await withTemporaryFiles(async ({ inputPath, outputPath }) => {
    await fs.writeFile(inputPath,
      "name,side,relation,message,active,type\nReal Name,,,Use your other name.,TRUE,easter_egg\nAlias,,,Personal invitation.,TRUE,invite\nOrdinary,,,Welcome.,TRUE,\nLegacy,,,Hello.,TRUE", "utf8");
    const { count } = await buildGuestIndex({ inputPath, outputPath });
    assert.equal(count, 4);
    const indexText = await fs.readFile(outputPath, "utf8");
    const index = JSON.parse(indexText);
    assert.ok(!indexText.includes("easter_egg"));
    assert.ok(!indexText.includes("Real Name"));
    assert.ok(!indexText.includes("Use your other name."));

    for (const [name, expectedType] of [["Real Name", "easter_egg"], ["Alias", "invite"],
      ["Ordinary", "invite"], ["Legacy", "invite"]]) {
      const derived = pbkdf2Sync(normalizeGuestName(name), Buffer.from(index.kdf.salt, "base64"), 100_000, 64, "sha256");
      const entry = index.entries[derived.subarray(0, 32).toString("hex")];
      const bytes = Buffer.from(entry.ciphertext, "base64");
      const decipher = createDecipheriv("aes-256-gcm", derived.subarray(32), Buffer.from(entry.iv, "base64"));
      decipher.setAuthTag(bytes.subarray(-16));
      const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString("utf8"));
      assert.equal(payload.type, expectedType);
    }

    const previous = await fs.readFile(outputPath, "utf8");
    await fs.writeFile(inputPath,
      "name,side,relation,message,active,type\nSomeone,,,Hello.,TRUE,unknown", "utf8");
    await assert.rejects(buildGuestIndex({ inputPath, outputPath }), /2.*type/);
    assert.equal(await fs.readFile(outputPath, "utf8"), previous);
  });
});

test("active rows without a message fail and preserve the previous index", async () => {
  await withTemporaryFiles(async ({ inputPath, outputPath }) => {
    const oldContent = '{"existing":"preserved"}\n';
    await fs.writeFile(outputPath, oldContent, "utf8");
    await fs.writeFile(inputPath, "name,side,relation,message,active\n가상가,신랑,친구,,TRUE", "utf8");
    await assert.rejects(buildGuestIndex({ inputPath, outputPath }), /2행.*message/);
    assert.equal(await fs.readFile(outputPath, "utf8"), oldContent);
  });
});

test("normalized duplicate names fail with both CSV row numbers", async () => {
  await withTemporaryFiles(async ({ inputPath, outputPath }) => {
    await fs.writeFile(inputPath,
      "name,side,relation,message,active\n가상가,신랑,친구,첫 메시지,yes\n가 상 가님,신부,친구,둘째 메시지,1", "utf8");
    await assert.rejects(buildGuestIndex({ inputPath, outputPath }), /3행.*중복.*2행/);
    await assert.rejects(fs.readFile(outputPath, "utf8"), { code: "ENOENT" });
  });
});

test("missing source produces a clear generator-only error", async () => {
  await withTemporaryFiles(async ({ inputPath, outputPath }) => {
    await assert.rejects(buildGuestIndex({ inputPath, outputPath }), /private\/Wedding Guests - guests\.csv 파일을 찾을 수 없습니다/);
    await assert.rejects(fs.readFile(outputPath, "utf8"), { code: "ENOENT" });
  });
});
