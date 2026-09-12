export type GuestLookupResult =
  | { found: true; message: string }
  | { found: false };

type GuestIndexEntry = { iv: string; ciphertext: string };

export type GuestIndex = {
  version: 1;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: 100000; salt: string };
  cipher: { name: "AES-GCM" };
  entries: Record<string, GuestIndexEntry>;
};

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const lookupIdPattern = /^[0-9a-f]{64}$/u;

// Keep this byte-for-byte equivalent to normalizeGuestName in build-guest-index.mjs.
export function normalizeGuestName(value: unknown) {
  return String(value).normalize("NFC").trim().replace(/\s/gu, "").replace(/님$/u, "").toLowerCase();
}

function decodeBase64(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string" || !base64Pattern.test(value)) {
    throw new Error("Invalid guest index encoding");
  }
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function validateGuestIndex(value: unknown): GuestIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid guest index");
  }

  const index = value as Partial<GuestIndex>;
  if (index.version !== 1 || index.kdf?.name !== "PBKDF2" ||
      index.kdf.hash !== "SHA-256" || index.kdf.iterations !== 100000 ||
      index.cipher?.name !== "AES-GCM" || !index.entries ||
      typeof index.entries !== "object" || Array.isArray(index.entries)) {
    throw new Error("Unsupported guest index format");
  }

  if (decodeBase64(index.kdf.salt).length < 16) {
    throw new Error("Invalid guest index salt");
  }

  for (const [lookupId, entry] of Object.entries(index.entries)) {
    if (!lookupIdPattern.test(lookupId) || !entry || typeof entry !== "object" ||
        decodeBase64(entry.iv).length !== 12 || decodeBase64(entry.ciphertext).length < 17) {
      throw new Error("Invalid guest index entry");
    }
  }

  return index as GuestIndex;
}

export async function lookupGuestInIndex(index: GuestIndex, name: string): Promise<GuestLookupResult> {
  const normalizedName = normalizeGuestName(name);
  const subtle = globalThis.crypto?.subtle;
  if (!normalizedName || !subtle) {
    throw new Error("Guest lookup is unavailable");
  }

  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizedName),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = new Uint8Array(await subtle.deriveBits({
    name: "PBKDF2",
    hash: index.kdf.hash,
    iterations: index.kdf.iterations,
    salt: decodeBase64(index.kdf.salt),
  }, keyMaterial, 512));
  const lookupId = Array.from(derived.subarray(0, 32), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const entry = index.entries[lookupId];

  if (!entry) return { found: false };

  // Node's generator appends the 16-byte GCM tag to the ciphertext; Web Crypto expects that form.
  const encryptionKey = await subtle.importKey("raw", derived.subarray(32), "AES-GCM", false, ["decrypt"]);
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(entry.iv) },
    encryptionKey,
    decodeBase64(entry.ciphertext)
  );
  const message = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
  if (!message.trim()) throw new Error("Guest message is empty");
  return { found: true, message };
}
