export const guestApiUrl =
  "https://script.google.com/macros/s/AKfycbwXo4pXPtkzZAbf3_u045bbZzjwdUJpJ-QK3t82Fm-RHpuUte7xzyBILg32adNctXDzhQ/exec";

const maxRequestAttempts = 2;
const requestTimeoutMs = 9000;
const retryDelaysMs = [700] as const;

export type GuestLookupResult =
  | { found: true; message: string }
  | { found: false };

type GuestApiResponse = {
  found?: unknown;
  message?: unknown;
  error?: unknown;
};

class RetryableGuestApiError extends Error {}

function createAbortError() {
  const error = new Error("Guest lookup aborted");
  error.name = "AbortError";
  return error;
}

function waitForRetry(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const handleAbort = () => {
      clearTimeout(timerId);
      reject(createAbortError());
    };

    const timerId = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, delay);

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

async function requestGuest(name: string, signal: AbortSignal): Promise<GuestLookupResult> {
  if (signal.aborted) {
    throw createAbortError();
  }

  const requestUrl = new URL(guestApiUrl);
  requestUrl.searchParams.set("name", name);

  const attemptController = new AbortController();
  let didTimeout = false;
  const handleAbort = () => attemptController.abort();
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    attemptController.abort();
  }, requestTimeoutMs);

  signal.addEventListener("abort", handleAbort, { once: true });

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "follow",
      referrerPolicy: "no-referrer",
      signal: attemptController.signal,
    });

    if (response.status >= 500) {
      throw new RetryableGuestApiError(`Guest API returned HTTP ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(`Guest API returned HTTP ${response.status}`);
    }

    let data: GuestApiResponse;

    try {
      data = (await response.json()) as GuestApiResponse;
    } catch {
      throw new RetryableGuestApiError("Guest API returned invalid JSON");
    }

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
  } catch (error) {
    if (signal.aborted) {
      throw createAbortError();
    }

    if (error instanceof RetryableGuestApiError) {
      throw error;
    }

    if (didTimeout) {
      throw new RetryableGuestApiError("Guest API request timed out");
    }

    if (error instanceof TypeError) {
      throw new RetryableGuestApiError("Guest API network request failed");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener("abort", handleAbort);
  }
}

export async function lookupGuest(name: string, signal: AbortSignal): Promise<GuestLookupResult> {
  for (let attempt = 0; attempt < maxRequestAttempts; attempt += 1) {
    try {
      return await requestGuest(name, signal);
    } catch (error) {
      if (signal.aborted || !(error instanceof RetryableGuestApiError)) {
        throw error;
      }

      const retryDelay = retryDelaysMs[attempt];

      if (retryDelay === undefined) {
        throw error;
      }

      await waitForRetry(retryDelay, signal);
    }
  }

  throw new Error("Guest API request failed");
}
