import axios from 'axios';

// Helper to extract a cookie by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
});

let authFailureHandler = null;

export const setAuthFailureHandler = (handler) => {
  authFailureHandler = handler;
};

// Request interceptor: attaches CSRF token and client headers
apiClient.interceptors.request.use((config) => {
  // 1. Attach client headers
  config.headers['x-client-device'] = 'web';
  config.headers['x-client-encrypted'] = 'false';

  // 2. Attach CSRF token header for state-changing requests
  const csrfToken = getCookie('csrfToken');
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    config.headers['x-csrf-token'] = csrfToken;
  }

  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, newToken = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(newToken);
    }
  });
  failedQueue = [];
};

// Response interceptor: handles token rotation (401 token_expired)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and we haven't retried this request yet, excluding refresh endpoint
    if (
      error.response &&
      error.response.status === 401 &&
      (!originalRequest.url || !originalRequest.url.includes('/api/auth/refresh')) &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            originalRequest._retry = true;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios
          .post('/api/auth/refresh', {}, { withCredentials: true })
          .then(() => {
            processQueue(null, 'refreshed');
            resolve(apiClient(originalRequest));
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            if (authFailureHandler) {
              authFailureHandler();
            }
            reject(refreshError);
          })
          .then(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
