export interface GuestCartItem {
  productId: number;
  quantity: number;
}

const GUEST_CART_KEY = 'oren_cart';
// Fired on `window` after every guest-cart write. The native `storage` event
// only fires in OTHER tabs, never the tab that made the write, so anything
// in-tab that needs to react to a guest-cart mutation (e.g. the Header cart
// badge) must listen for this instead/as well.
export const GUEST_CART_UPDATED_EVENT = 'guestcart-updated';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function notifyGuestCartUpdated(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(GUEST_CART_UPDATED_EVENT));
}

export function getGuestCart(): GuestCartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is GuestCartItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as GuestCartItem).productId === 'number' &&
        typeof (item as GuestCartItem).quantity === 'number',
    );
  } catch {
    return [];
  }
}

function setGuestCart(items: GuestCartItem[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    notifyGuestCartUpdated();
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function addToGuestCart(productId: number, quantity: number, maxQuantity?: number): void {
  const items = getGuestCart();
  const existing = items.find((i) => i.productId === productId);
  const current = existing ? existing.quantity : 0;
  const clamped = maxQuantity !== undefined ? Math.min(current + quantity, maxQuantity) : current + quantity;
  if (existing) {
    existing.quantity = clamped;
  } else {
    items.push({ productId, quantity: clamped });
  }
  setGuestCart(items);
}

export function removeFromGuestCart(productId: number): void {
  const items = getGuestCart().filter((i) => i.productId !== productId);
  setGuestCart(items);
}

export function updateGuestCartQuantity(productId: number, quantity: number, maxQuantity?: number): void {
  if (quantity <= 0) {
    removeFromGuestCart(productId);
    return;
  }
  const clamped = maxQuantity !== undefined ? Math.min(quantity, maxQuantity) : quantity;
  const items = getGuestCart();
  const existing = items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity = clamped;
  } else {
    items.push({ productId, quantity: clamped });
  }
  setGuestCart(items);
}

export function clearGuestCart(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(GUEST_CART_KEY);
    notifyGuestCartUpdated();
  } catch {
    // silently ignore
  }
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((sum, item) => sum + item.quantity, 0);
}
