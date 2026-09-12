import { publicAssetPath } from "@/lib/public-path";
import {
  lookupGuestInIndex,
  validateGuestIndex,
  type GuestIndex,
  type GuestLookupResult,
} from "@/lib/guest-index-crypto";

const guestIndexUrl = publicAssetPath("/data/guest-index.json");
let loadedIndex: GuestIndex | null = null;
let pendingIndex: Promise<GuestIndex> | null = null;

function loadGuestIndex(): Promise<GuestIndex> {
  if (loadedIndex) return Promise.resolve(loadedIndex);
  if (pendingIndex) return pendingIndex;

  pendingIndex = fetch(guestIndexUrl)
    .then((response) => {
      if (!response.ok) throw new Error("Guest index request failed");
      return response.json() as Promise<unknown>;
    })
    .then(validateGuestIndex)
    .then((index) => {
      loadedIndex = index;
      return index;
    })
    .finally(() => {
      pendingIndex = null;
    });

  return pendingIndex;
}

export function preloadGuestIndex() {
  void loadGuestIndex().catch(() => {
    // A later submit may retry; failed loads are never cached.
  });
}

export async function lookupGuest(name: string): Promise<GuestLookupResult> {
  const index = await loadGuestIndex();
  return lookupGuestInIndex(index, name);
}
