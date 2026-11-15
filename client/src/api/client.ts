import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse } from '../types';

// Ruta relativa por defecto: nginx y el proxy de Vite resuelven /api/*.
const BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

/** Error de la API con el código HTTP y los datos extra del backend. */
export class ApiError extends Error {
  readonly status?: number;
  readonly data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

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
const flush = (err: unknown, token: string | null = null) => {
  queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token));
  queue = [];
};

/**
 * Solo estas dos rutas emiten tokens. Sus 401 hablan de credenciales o de un
 * refresh inválido, no de un access vencido: reintentarlas no arregla nada.
 * El resto (`/auth/seguridad`, `/auth/logout`, `/auth/preferencias`…) sí son
 * rutas protegidas y su 401 significa que el access murió.
 */
const emiteToken = (url = '') => url.includes('/auth/login') || url.includes('/auth/refresh');

/** Un 401 al confirmar la contraseña es una contraseña mal escrita, no un token. */
const contrasenaIncorrecta = (error: AxiosError<ApiResponse>) =>
  (error.response?.data as { message?: string } | undefined)?.message === 'Contraseña incorrecta.';

client.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiResponse>) => {
    const orig = error.config as any;
    const tokenMuerto = error.response?.status === 401 &&
      !orig?._retry &&
      !emiteToken(orig?.url) &&
      !contrasenaIncorrecta(error);

    if (tokenMuerto) {
      if (refreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then((token) => { orig.headers.Authorization = `Bearer ${token}`; return client(orig); });
      }

      orig._retry = true;
      refreshing  = true;
      try {
        const nuevo = await refrescarToken();
        flush(null, nuevo);
        orig.headers.Authorization = `Bearer ${nuevo}`;
        return client(orig);
      } catch (e) {
        flush(e, null);
        // El refresh tampoco sirve: no hay forma de recuperar la sesión.
        // El detalle técnico queda en la bitácora del servidor; aquí se le
        // dice a la persona qué pasó y qué hacer.
        clearSession('Tu sesión terminó. Vuelve a iniciar sesión.');
        return Promise.reject(e);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(aApiError(error));
  }
);

/**
 * Canjea el refresh y guarda el par nuevo.
 *
 * El refresh es de un solo uso: si dos pestañas refrescan a la vez con el mismo
 * token, el backend interpreta el segundo como robo y revoca la sesión. Por eso
 * el canje se serializa con `navigator.locks` (entre pestañas del mismo origen)
 * y se relee el token de `localStorage` dentro del bloqueo.
 */
async function refrescarToken(): Promise<string> {
  const canjear = async (): Promise<string> => {
    const rt = localStorage.getItem('refresh_token');
    if (!rt) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);

    try {
      const { data } = await axios.post<ApiResponse<{ access_token: string; refresh_token?: string }>>(
        `${BASE}/auth/refresh`,
        { refresh_token: rt }
      );

      localStorage.setItem('access_token', data.data.access_token);
      if (data.data.refresh_token) localStorage.setItem('refresh_token', data.data.refresh_token);

      return data.data.access_token;
    } catch (e) {
      throw aApiError(e as AxiosError<ApiResponse>);
    }
  };

  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (locks?.request) return locks.request('gcom-refresh', canjear);

  return canjear();
}

function aApiError(error: AxiosError<ApiResponse>): ApiError {
  const payload = error.response?.data as
    | { message?: string; data?: any }
    | undefined;

  return new ApiError(mensajeError(error), error.response?.status, payload?.data);
}

/**
 * Mensaje legible para el usuario.
 *
 * Las validaciones del backend devuelven `data.errors` con un mensaje por
 * campo. Mostrar solo "Error de validación" obliga al usuario a adivinar qué
 * corregir, así que se prioriza el primer error concreto.
 */
function mensajeError(error: AxiosError<ApiResponse>): string {
  const payload = error.response?.data as
    | { message?: string; data?: { errors?: Record<string, string> } }
    | undefined;

  const errores = payload?.data?.errors;
  if (errores && typeof errores === 'object') {
    const primero = Object.values(errores).find(
      (mensaje): mensaje is string => typeof mensaje === 'string' && mensaje !== ''
    );
    if (primero) return primero;
  }

  if (payload?.message) return payload.message;
  if (error.code === 'ECONNABORTED') return 'La operación tardó demasiado. Intenta de nuevo.';
  if (!error.response) return 'No hay conexión con el servidor.';
  return error.message || 'Error de conexión';
}

/**
 * Borra la sesión local y vuelve al login.
 *
 * `motivo` viaja en `sessionStorage` para que la pantalla de acceso explique
 * qué pasó en vez de aparecer vacía (y para no repetir el mensaje técnico del
 * backend, que habla de tokens y no de personas).
 */
function clearSession(motivo?: string) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  if (motivo) sessionStorage.setItem('sesion_expirada', motivo);
  window.location.href = '/login';
}

export default client;
