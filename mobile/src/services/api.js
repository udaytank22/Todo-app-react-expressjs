import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encrypt, decrypt } from '../utils/encryption';

// Set base URL depending on platform (10.0.2.2 for Android emulator)
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request Interceptor: Inject Auth Token and Encrypt payloads
api.interceptors.request.use(
  async (config) => {
    // 1. Inject auth token from AsyncStorage
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('[API Client] Error reading auth token:', err.message);
    }

    // 2. Set client device header to identify as mobile
    config.headers['x-client-device'] = 'mobile';

    // 3. Encrypt request body if present
    if (config.data && !(config.data instanceof FormData)) {
      try {
        const jsonString = JSON.stringify(config.data);
        const encryptedData = encrypt(jsonString);
        config.data = { encryptedData };
        config.headers['Content-Type'] = 'application/json';
      } catch (err) {
        console.error('[API Client] Payload encryption failed:', err.message);
        return Promise.reject(err);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Decrypt payloads and handle token refresh
api.interceptors.response.use(
  (response) => {
    // Check if the response body is encrypted
    if (response.data && response.data.encryptedData) {
      try {
        const decryptedStr = decrypt(response.data.encryptedData);
        if (decryptedStr) {
          response.data = JSON.parse(decryptedStr);
        } else {
          console.error('[API Client] Decryption returned null.');
          return Promise.reject(new Error('Response decryption failed.'));
        }
      } catch (err) {
        console.error('[API Client] Response decryption failed:', err.message);
        return Promise.reject(err);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh on 401 Unauthorized
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('[API Client] Attempting token refresh...');
          // Make direct request to avoid standard interceptor encryption if endpoint expects raw,
          // but wait: does the auth routes have encryption enabled?
          // Since our encryption middleware checks for 'x-client-device: mobile',
          // and we call through axios instance, it will be encrypted. That's fine because the backend
          // middleware will decrypt it. Let's run it through a standard post request:
          const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refreshToken
          }, {
            headers: {
              'x-client-device': 'mobile',
              'Content-Type': 'application/json'
            }
          });

          // Wait, the refresh endpoint response is encrypted because the backend middleware intercepts it!
          // We must decrypt the response if it is encrypted.
          let responseData = response.data;
          if (responseData && responseData.encryptedData) {
            const decryptedStr = decrypt(responseData.encryptedData);
            responseData = JSON.parse(decryptedStr);
          }

          if (responseData && responseData.token) {
            console.log('[API Client] Token refresh successful.');
            await AsyncStorage.setItem('token', responseData.token);
            await AsyncStorage.setItem('refreshToken', responseData.refreshToken);

            // Update auth header and retry original request
            originalRequest.headers['Authorization'] = `Bearer ${responseData.token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.error('[API Client] Token refresh failed:', refreshErr.message);
        // Clear tokens and let application handle redirect to Login
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
      }
    }

    // Try decrypting error responses if they are encrypted
    if (error.response && error.response.data && error.response.data.encryptedData) {
      try {
        const decryptedStr = decrypt(error.response.data.encryptedData);
        if (decryptedStr) {
          error.response.data = JSON.parse(decryptedStr);
        }
      } catch (err) {
        console.error('[API Client] Error decrypting error response:', err.message);
      }
    }

    return Promise.reject(error);
  }
);

export { BASE_URL };
export default api;
