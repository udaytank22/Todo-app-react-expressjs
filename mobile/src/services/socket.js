import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './api';
import { encrypt, decrypt } from '../utils/encryption';

let socket = null;
const listeners = new Map();

/**
 * Initialize Socket.IO connection
 */
export const initSocket = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    console.log('[Socket Client] Cannot initialize socket. No auth token found.');
    return null;
  }

  if (socket) {
    socket.disconnect();
  }

  console.log('[Socket Client] Initializing WebSocket connection to', BASE_URL);
  socket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token, device: 'mobile' },
  });

  socket.on('connect', () => {
    console.log('[Socket Client] Connected to Socket.IO server. ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket Client] Disconnected. Reason:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket Client] Connection error:', err.message);
  });

  return socket;
};

/**
 * Get active socket instance
 */
export const getSocket = () => socket;

/**
 * Subscribe to a Socket.IO event with automatic payload decryption.
 * @param {string} event - Event name
 * @param {function} callback - Callback function receiving decrypted payload
 */
export const onSocketEvent = (event, callback) => {
  if (!socket) {
    console.warn(`[Socket Client] Cannot listen to "${event}". Socket is not initialized.`);
    return;
  }

  const wrappedCallback = (data) => {
    let decryptedPayload = data;
    if (data && data.encryptedData) {
      const decryptedStr = decrypt(data.encryptedData);
      if (decryptedStr) {
        try {
          decryptedPayload = JSON.parse(decryptedStr);
        } catch (err) {
          decryptedPayload = decryptedStr; // Fallback to raw string
        }
      } else {
        console.error(`[Socket Client] Decryption failed for event: ${event}`);
        return; // Drop packet if decryption failed
      }
    }
    callback(decryptedPayload);
  };

  // Keep track of mapping for unsubscribe
  if (!listeners.has(event)) {
    listeners.set(event, []);
  }
  listeners.get(event).push({ original: callback, wrapped: wrappedCallback });

  socket.on(event, wrappedCallback);
};

/**
 * Unsubscribe from a Socket.IO event.
 * @param {string} event - Event name
 * @param {function} callback - Original callback function
 */
export const offSocketEvent = (event, callback) => {
  if (!socket) return;

  if (listeners.has(event)) {
    const list = listeners.get(event);
    const index = list.findIndex((item) => item.original === callback);
    if (index !== -1) {
      const { wrapped } = list[index];
      socket.off(event, wrapped);
      list.splice(index, 1);
    }
  }
};

/**
 * Emit an encrypted message payload to the Socket.IO server.
 * @param {string} event - Event name
 * @param {object|string} data - Payload data
 */
export const emitSocketEvent = (event, data) => {
  if (!socket) {
    console.warn(`[Socket Client] Cannot emit "${event}". Socket is not initialized.`);
    return;
  }

  try {
    const payloadStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const encryptedData = encrypt(payloadStr);
    socket.emit(event, { encryptedData });
  } catch (err) {
    console.error(`[Socket Client] Failed to encrypt outgoing event "${event}":`, err.message);
  }
};

/**
 * Disconnect socket and clear listeners
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners.clear();
    console.log('[Socket Client] Socket disconnected and listeners cleared.');
  }
};
