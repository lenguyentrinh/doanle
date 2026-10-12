import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import {
  getCartAPI,
  addCartItemAPI,
  updateCartItemAPI,
  removeCartItemAPI,
} from "@/features/cart/services/cartAPI";
import type { CartView } from "@/types/cart";

function apiErrorMessage(err: unknown): string | undefined {
  if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
    return err.response.data.message;
  }
  return undefined;
}

// Each thunk resolves to the authoritative CartView from the server so the
// slice can REPLACE its state (no client-side recomputation of subtotal/qty).
// Mirrors the auth thunk pattern: try/catch → rejectWithValue(server message).

export const fetchCartThunk = createAsyncThunk<CartView>(
  "cart/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await getCartAPI();
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err) || "Tải giỏ hàng thất bại");
    }
  },
);

export const addCartItemThunk = createAsyncThunk<
  CartView,
  { productId: string; quantity: number }
>("cart/add", async ({ productId, quantity }, { rejectWithValue }) => {
  try {
    return await addCartItemAPI(productId, quantity);
  } catch (err: unknown) {
    return rejectWithValue(
      apiErrorMessage(err) || "Thêm vào giỏ hàng thất bại",
    );
  }
});

export const updateCartItemThunk = createAsyncThunk<
  CartView,
  { itemId: string; quantity: number }
>("cart/update", async ({ itemId, quantity }, { rejectWithValue }) => {
  try {
    return await updateCartItemAPI(itemId, quantity);
  } catch (err: unknown) {
    return rejectWithValue(
      apiErrorMessage(err) || "Cập nhật giỏ hàng thất bại",
    );
  }
});

export const removeCartItemThunk = createAsyncThunk<
  CartView,
  { itemId: string }
>("cart/remove", async ({ itemId }, { rejectWithValue }) => {
  try {
    return await removeCartItemAPI(itemId);
  } catch (err: unknown) {
    return rejectWithValue(
      apiErrorMessage(err) || "Xóa sản phẩm thất bại",
    );
  }
});
