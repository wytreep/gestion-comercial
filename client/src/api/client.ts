import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse } from '../types';

// Ruta relativa por defecto: nginx y el proxy de Vite resuelven /api/*.
const BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

const client: AxiosInstance = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing = false;
let queue: Array<{ resolve: Function; reject: Function }> = [];
const flush = (err: AxiosError | null, token: string | null = null) => {
  queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token));
  queue = [];
};

client.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiResponse>) => {
    const orig = error.config as any;
    if (error.response?.status === 401 && !orig._retry && !orig.url?.includes('/auth/')) {
      if (refreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then((token) => { orig.headers.Authorization = `Bearer ${token}`; return client(orig); });
      }
      orig._retry = true;
      refreshing  = true;
      const rt    = localStorage.getItem('refresh_token');
      if (!rt) { refreshing = false; clearSession(); return Promise.reject(error); }
      try {
        const { data } = await axios.post<ApiResponse<{ access_token: string }>>(
          `${BASE}/auth/refresh`, { refresh_token: rt }
        );
        const newToken = data.data.access_token;
        localStorage.setItem('access_token', newToken);
        flush(null, newToken);
        orig.headers.Authorization = `Bearer ${newToken}`;
        return client(orig);
      } catch (e) {
        flush(e as AxiosError, null);
        clearSession();
        return Promise.reject(e);
      } finally { refreshing = false; }
    }
    return Promise.reject(new Error(
      error.response?.data?.message ?? error.message ?? 'Error de conexión'
    ));
  }
);

function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/login';
}

export default client;
