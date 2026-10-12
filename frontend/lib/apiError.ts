import axios from 'axios';

export function extractErrorMessage(error: unknown, fallback: string = 'Đã có lỗi xảy ra'): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return fallback;
}
