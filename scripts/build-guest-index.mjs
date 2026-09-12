import { promises as fs } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const ITERATIONS = 100_000;
const REQUIRED_HEADERS = ["name", "side", "relation", "message", "active"];
const ACTIVE_VALUES = new Set(["true", "1", "y", "yes"]);

export function normalizeGuestName(value) {
  return String(value).normalize("NFC").trim().replace(/\s/gu, "").replace(/님$/u, "").toLowerCase();
}

// RFC 4180-style parser: commas and line endings are delimiters only outside quotes.
export function parseCsv(text) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let fields = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  let fieldStarted = false;
  let line = 1;
  let rowStartLine = 1;

  function endField() {
    fields.push(field);
    field = "";
    afterQuote = false;
    fieldStarted = false;
  }

  function endRow() {
    endField();
    if (fields.length !== 1 || fields[0] !== "") {
      rows.push({ fields, line: rowStartLine });
    }
    fields = [];
  }

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const isNewline = char === "\r" || char === "\n";
    const newlineLength = char === "\r" && input[i + 1] === "\n" ? 2 : 1;

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else if (isNewline) {
        field += input.slice(i, i + newlineLength);
        i += newlineLength - 1;
        line += 1;
      } else {
        field += char;
      }
      continue;
    }

    if (afterQuote && char !== "," && !isNewline) {
      throw new Error(`CSV ${line}행: 닫는 따옴표 뒤에 예상치 못한 문자가 있습니다.`);
    }

    if (char === ",") {
      endField();
    } else if (isNewline) {
      endRow();
      i += newlineLength - 1;
      line += 1;
      rowStartLine = line;
    } else if (char === '"') {
      if (fieldStarted) {
        throw new Error(`CSV ${line}행: 따옴표 위치가 잘못되었습니다.`);
      }
      quoted = true;
      fieldStarted = true;
    } else {
      field += char;
      fieldStarted = true;
    }
  }

  if (quoted) {
    throw new Error(`CSV ${rowStartLine}행: 닫히지 않은 따옴표가 있습니다.`);
  }
  if (fields.length > 0 || fieldStarted || afterQuote) {
    endRow();
  }
  return rows;
}

function readActiveGuests(csv) {
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    throw new Error("CSV 헤더가 없습니다.");
  }

  const headers = rows[0].fields.map((header) => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length ||
      REQUIRED_HEADERS.some((header) => !headers.includes(header))) {
    throw new Error("CSV 헤더는 name,side,relation,message,active를 포함해야 합니다.");
  }

  const nameIndex = headers.indexOf("name");
  const messageIndex = headers.indexOf("message");
  const activeIndex = headers.indexOf("active");
  const guests = new Map();

  for (const row of rows.slice(1)) {
    if (row.fields.length !== headers.length) {
      throw new Error(`CSV ${row.line}행: 헤더와 필드 개수가 다릅니다.`);
    }
    if (!ACTIVE_VALUES.has(row.fields[activeIndex].trim().toLowerCase())) {
      continue;
    }

    const rawName = row.fields[nameIndex];
    const normalizedName = normalizeGuestName(rawName);
    const message = row.fields[messageIndex];
    if (!normalizedName || !message.trim()) {
      throw new Error(`CSV ${row.line}행: 활성 하객의 name 또는 message가 비어 있습니다.`);
    }

    const previous = guests.get(normalizedName);
    if (previous) {
      throw new Error(`CSV ${row.line}행: 중복된 성함 "${rawName}" (이전 ${previous.line}행).`);
    }
    guests.set(normalizedName, { message, line: row.line });
  }

  return guests;
}

async function loadSalt(outputPath) {
  let existing;
  try {
    existing = await fs.readFile(outputPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return randomBytes(16);
    throw error;
  }

  let index;
  try {
    index = JSON.parse(existing);
  } catch {
    throw new Error("기존 guest-index.json이 올바른 JSON이 아니어서 교체하지 않았습니다.");
  }
  const saltText = index?.kdf?.salt;
  const salt = typeof saltText === "string" ? Buffer.from(saltText, "base64") : null;
  if (index?.version !== 1 || index?.kdf?.name !== "PBKDF2" ||
      index?.kdf?.hash !== "SHA-256" || index?.kdf?.iterations !== ITERATIONS ||
      index?.cipher?.name !== "AES-GCM" || !salt || salt.length < 16 ||
      salt.toString("base64") !== saltText) {
    throw new Error("기존 guest-index.json의 암호화 설정 또는 salt가 유효하지 않아 교체하지 않았습니다.");
  }
  return salt;
}

function encryptMessage(message, key, iv) {
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([
    cipher.update(message, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}

function decryptMessage(ciphertext, key, ivText) {
  const bytes = Buffer.from(ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64"));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString("utf8");
}

export async function buildGuestIndex({
  inputPath = resolve("private/guests.csv"),
  outputPath = resolve("public/data/guest-index.json"),
} = {}) {
  let csv;
  try {
    csv = await fs.readFile(inputPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("private/guests.csv 파일을 찾을 수 없습니다.");
    }
    throw error;
  }

  const guests = readActiveGuests(csv);
  const salt = await loadSalt(outputPath);
  const entries = Object.create(null);
  const checks = [];
  const usedIvs = new Set();

  for (const [normalizedName, { message }] of guests) {
    const derived = pbkdf2Sync(normalizedName, salt, ITERATIONS, 64, "sha256");
    const lookupId = derived.subarray(0, 32).toString("hex");
    const key = derived.subarray(32, 64);
    let iv;
    do {
      iv = randomBytes(12);
    } while (usedIvs.has(iv.toString("base64")));
    const ivText = iv.toString("base64");
    usedIvs.add(ivText);

    entries[lookupId] = { iv: ivText, ciphertext: encryptMessage(message, key, iv) };
    checks.push({ lookupId, key, message });
  }

  const index = {
    version: 1,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: salt.toString("base64") },
    cipher: { name: "AES-GCM" },
    entries,
  };
  const output = `${JSON.stringify(index, null, 2)}\n`;
  const serialized = JSON.parse(output);
  for (const { lookupId, key, message } of checks) {
    const entry = serialized.entries[lookupId];
    if (decryptMessage(entry.ciphertext, key, entry.iv) !== message) {
      throw new Error("암호화 결과 검증에 실패하여 index를 생성하지 않았습니다.");
    }
  }

  await fs.mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = join(dirname(outputPath), `guest-index.${randomBytes(8).toString("hex")}.tmp.json`);
  try {
    await fs.writeFile(temporaryPath, output, { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryPath, outputPath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => {});
    throw error;
  }

  return { count: guests.size, outputPath };
}

if (process.argv[1] && basename(process.argv[1]) === "build-guest-index.mjs") {
  buildGuestIndex()
    .then(({ count }) => {
      console.log("Guest index generated successfully.");
      console.log(`Active entries: ${count}`);
      console.log("Output: public/data/guest-index.json");
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
