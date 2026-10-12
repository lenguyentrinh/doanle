import { createSlice } from "@reduxjs/toolkit";
import { signupThunk, loginThunk, verifyEmailThunk, fetchMeThunk, logoutThunk, updateProfileThunk, sendOtpThunk, verifyOtpThunk, resetPasswordThunk } from "./authThunk";
import type { MeResponse as User } from "@/types/user";

interface AuthState {
  signupLoading: boolean;
  loginLoading: boolean;
  verifyEmailLoading: boolean;
  meLoading: boolean;
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  sendOtpLoading: boolean;
  verifyOtpLoading: boolean;
  resetPasswordLoading: boolean;
}

const initialState: AuthState = {
  signupLoading: false,
  loginLoading: false,
  verifyEmailLoading: false,
  meLoading: false,
  user: null,
  isAuthenticated: false,
  authChecked: false,
  sendOtpLoading: false,
  verifyOtpLoading: false,
  resetPasswordLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // SIGNUP
      .addCase(signupThunk.pending, (state) => {
        state.signupLoading = true;
      })
      .addCase(signupThunk.fulfilled, (state) => {
        state.signupLoading = false;
      })
      .addCase(signupThunk.rejected, (state) => {
        state.signupLoading = false;
      })

      // LOGIN
      .addCase(loginThunk.pending, (state) => {
        state.loginLoading = true;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(loginThunk.rejected, (state) => {
        state.loginLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })

      // VERIFY EMAIL
      .addCase(verifyEmailThunk.pending, (state) => {
        state.verifyEmailLoading = true;
      })
      .addCase(verifyEmailThunk.fulfilled, (state) => {
        state.verifyEmailLoading = false;
      })
      .addCase(verifyEmailThunk.rejected, (state) => {
        state.verifyEmailLoading = false;
      })

      // SEND OTP
      .addCase(sendOtpThunk.pending, (state) => {
        state.sendOtpLoading = true;
      })
      .addCase(sendOtpThunk.fulfilled, (state) => {
        state.sendOtpLoading = false;
      })
      .addCase(sendOtpThunk.rejected, (state) => {
        state.sendOtpLoading = false;
      })

      // VERIFY OTP
      .addCase(verifyOtpThunk.pending, (state) => {
        state.verifyOtpLoading = true;
      })
      .addCase(verifyOtpThunk.fulfilled, (state) => {
        state.verifyOtpLoading = false;
      })
      .addCase(verifyOtpThunk.rejected, (state) => {
        state.verifyOtpLoading = false;
      })

      // RESET PASSWORD
      .addCase(resetPasswordThunk.pending, (state) => {
        state.resetPasswordLoading = true;
      })
      .addCase(resetPasswordThunk.fulfilled, (state) => {
        state.resetPasswordLoading = false;
      })
      .addCase(resetPasswordThunk.rejected, (state) => {
        state.resetPasswordLoading = false;
      })

      // FETCH ME (session hydration)
      .addCase(fetchMeThunk.pending, (state) => {
        state.meLoading = true;
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.meLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.authChecked = true;
      })
      .addCase(fetchMeThunk.rejected, (state) => {
        state.meLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.authChecked = true;
      })

      // UPDATE PROFILE (refresh the displayed user + Header name)
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      })

      // LOGOUT
      .addCase(logoutThunk.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export default authSlice.reducer;
