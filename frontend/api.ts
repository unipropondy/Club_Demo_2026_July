import axios from 'axios';
import { API_URL } from '@/constants/Config';
import { useAuthStore } from './stores/authStore';

const API = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000, // 15s per attempt
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach the JWT token to every outgoing request
API.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔁 Retry interceptor — retries up to 3 times on network errors or transient 5xx
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 300;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as any;

    // Only retry on network errors or transient server errors (502, 503, 504)
    const isNetworkError = !error.response;
    const isTransient =
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504;

    if (!isNetworkError && !isTransient) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount ?? 0;

    if (config.__retryCount >= MAX_RETRIES) {
      if (__DEV__) {
        console.error(
          `🛑 [API Retry Exhausted] ${config.method?.toUpperCase()} ${config.url} failed after ${MAX_RETRIES} retries.`
        );
      }
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const delay = INITIAL_DELAY_MS * Math.pow(2, config.__retryCount - 1);
    const jitter = delay * 0.8 + Math.random() * delay * 0.4;

    if (__DEV__) {
      console.warn(
        `⚠️ [API Retry] Attempt ${config.__retryCount}/${MAX_RETRIES} for ${config.method?.toUpperCase()} ${config.url} — waiting ${Math.round(jitter)}ms`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, jitter));
    return API(config);
  }
);

export default API;