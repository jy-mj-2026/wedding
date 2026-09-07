export const guestApiUrl =
  "https://script.google.com/macros/s/AKfycbwXo4pXPtkzZAbf3_u045bbZzjwdUJpJ-QK3t82Fm-RHpuUte7xzyBILg32adNctXDzhQ/exec";

export type GuestLookupResult =
  | { found: true; message: string }
  | { found: false };

type GuestApiResponse = {
  found?: unknown;
  message?: unknown;
  error?: unknown;
};

export async function lookupGuest(name: string, signal: AbortSignal): Promise<GuestLookupResult> {
  const requestUrl = new URL(guestApiUrl);
  requestUrl.searchParams.set("name", name);

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "omit",
    cache: "no-store",
    redirect: "follow",
    referrerPolicy: "no-referrer",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Guest API returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as GuestApiResponse;

  if (typeof data !== "object" || data === null || typeof data.found !== "boolean") {
    throw new Error("Guest API returned an invalid response");
  }

  if (data.error) {
    throw new Error("Guest API reported an error");
  }

  if (!data.found) {
    return { found: false };
  }

  if (typeof data.message !== "string" || !data.message.trim()) {
    throw new Error("Guest API response is missing a message");
  }

  return { found: true, message: data.message };
}
