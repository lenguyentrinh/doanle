import { api } from "@/services/api";
import type { MeResponse } from "@/types/user";

interface SignupPayload {
  userName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

const signupAPI = async (data: SignupPayload) => {
  const res = await api.post("/api/auth/signup", data);
  return res.data;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
}

interface LogoutResponse {
  message: string;
}

const loginAPI = async(data:LoginPayload)=>{
  const res = await api.post("/api/auth/login", data);
  return res.data as LoginResponse;
}

interface verifyEmailPayload {
  email: string | null;
  code: string;
}

const verifyEmailAPI = async(data: verifyEmailPayload)=>{
  const res = await api.post("/api/auth/verify-email",data);
  return res.data;
}

const meAPI = async () => {
  const res = await api.get("/api/auth/me");
  return res.data as MeResponse;
};

const logoutAPI = async () => {
  const res = await api.post("/api/auth/logout");
  return res.data as LogoutResponse;
};

interface sendOtpPayload {
  email: string;
}

const sendOtpAPI = async(data: sendOtpPayload)=>{
  const res = await api.post("/api/auth/send-otp",data);  
  return res.data;
}

interface verifyOtpPayload {
  email: string;
  otp: string;
}

const verifyOtpAPI = async(data: verifyOtpPayload)=>{
  const res = await api.post("/api/auth/verify-otp",data);
  return res.data;
}

interface resetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmNewPassword: string | null;
}
    
const resetPasswordAPI = async(data: resetPasswordPayload)=>{
  const res = await api.post("/api/auth/reset-password",data);
  return res.data;
}

export {
  signupAPI,
  loginAPI,
  verifyEmailAPI,
  meAPI,
  logoutAPI,
  sendOtpAPI,
  verifyOtpAPI,
  resetPasswordAPI
};

export type {
  SignupPayload,
  LoginPayload,
  verifyEmailPayload,
  sendOtpPayload,
  verifyOtpPayload,
  resetPasswordPayload
};