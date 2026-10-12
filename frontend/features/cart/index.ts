// Public surface of the cart feature. Code outside features/cart (the global
// Header badge, the product feature's add-to-cart hook) imports from here
// rather than reaching into features/cart/lib or features/cart/store
// directly. Code inside the cart feature (its own page, hooks, components)
// may still import those internals directly.
export {
  getGuestCartCount,
  addToGuestCart,
  GUEST_CART_UPDATED_EVENT,
} from './lib/guestCart';
export { selectCartCount, selectCartLoaded } from './store/cartSlice';
