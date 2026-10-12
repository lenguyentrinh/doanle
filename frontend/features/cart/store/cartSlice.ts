import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCartThunk,
  addCartItemThunk,
  updateCartItemThunk,
  removeCartItemThunk,
} from "./cartThunk";
import type { CartLine, CartView } from "@/types/cart";

interface CartState {
  items: CartLine[];
  subtotal: number;
  loading: boolean;
  error: string | null;
  loaded: boolean; // true once a fetch/mutation has populated the cart
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  loading: false,
  error: null,
  loaded: false,
};

// Every cart thunk resolves to a CartView; replace state from it.
function applyCartView(state: CartState, payload: CartView) {
  state.items = payload.items;
  state.subtotal = payload.subtotal;
  state.loading = false;
  state.error = null;
  state.loaded = true;
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Cleared on logout — the next user must not see the previous cart.
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.error = null;
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    for (const thunk of [
      fetchCartThunk,
      addCartItemThunk,
      updateCartItemThunk,
      removeCartItemThunk,
    ]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          applyCartView(state, action.payload);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error =
            (action.payload as string) || "Thao tác giỏ hàng thất bại";
        });
    }
  },
});

export const { clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// Selectors
interface RootStateWithCart {
  cart: CartState;
}
export const selectCartItems = (s: RootStateWithCart) => s.cart.items;
export const selectCartSubtotal = (s: RootStateWithCart) => s.cart.subtotal;
export const selectCartLoading = (s: RootStateWithCart) => s.cart.loading;
export const selectCartLoaded = (s: RootStateWithCart) => s.cart.loaded;
export const selectCartError = (s: RootStateWithCart) => s.cart.error;
// Total units across all lines — drives the Header badge.
export const selectCartCount = (s: RootStateWithCart) =>
  s.cart.items.reduce((sum, line) => sum + line.quantity, 0);
