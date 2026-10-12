import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractErrorMessage } from "@/lib/apiError";
import { signupAPI, SignupPayload, loginAPI, LoginPayload,
         verifyEmailPayload, verifyEmailAPI, meAPI, logoutAPI, sendOtpPayload,
         sendOtpAPI, verifyOtpPayload, verifyOtpAPI,
         resetPasswordPayload, resetPasswordAPI }
        from "@/features/auth/services/authAPI";
import { updateProfileAPI } from "@/features/account/services/usersAPI";
import type { ProfilePayload } from "@/types/user";

export const signupThunk = createAsyncThunk(
  "auth/signup",
  async (data: SignupPayload, { rejectWithValue }) => {
    try {
      return await signupAPI(data);
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Đăng ký thất bại"));
    }
  }
);

export const  loginThunk = createAsyncThunk(
  "auth/login", 
  async(data: LoginPayload, {rejectWithValue})=>{
    try {
      const loginRes = await loginAPI(data);
      const user = await meAPI();
      return {
        message: loginRes.message || "Đăng nhập thành công",
        user,
      };
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Đăng nhập thất bại"));
    }
  }
)

export const fetchMeThunk = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    try {
      const user = await meAPI();
      return user;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Chưa xác thực"));
    }
  }
);

export const updateProfileThunk = createAsyncThunk(
  "auth/update-profile",
  async (data: ProfilePayload, { rejectWithValue }) => {
    try {
      return await updateProfileAPI(data);
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Cập nhật hồ sơ thất bại"));
    }
  }
);

export const verifyEmailThunk =createAsyncThunk(
  "auth/verify-email",
  async(data: verifyEmailPayload,{rejectWithValue})=>{
    try {
      return await verifyEmailAPI(data);
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Xác thực email thất bại"));
    }
  }
)

export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async () => {
    try {
      await logoutAPI();
    } catch {
      // Even if backend logout fails, clear client auth state.
    }
    return true;
  }
);

export const sendOtpThunk = createAsyncThunk(
  "auth/send-otp",
  async(data: sendOtpPayload,{rejectWithValue})=>{
    try {
      return await sendOtpAPI(data);
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Gửi OTP thất bại"));
    }
  }
)

export const verifyOtpThunk = createAsyncThunk(
  "auth/verify-otp",
  async(data: verifyOtpPayload,{rejectWithValue})=>{
    try {
      return await verifyOtpAPI(data);
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Xác thực OTP thất bại"));
    }
  }
)

export const resetPasswordThunk = createAsyncThunk(
  "auth/reset-password",
  async(data: resetPasswordPayload,{rejectWithValue})=>{
    try {
      return await resetPasswordAPI(data);
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, "Đặt lại mật khẩu thất bại"));
    }
  }
)

