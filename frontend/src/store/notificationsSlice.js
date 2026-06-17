import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// 1. Async Thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', params.page);
      if (params.limit) query.set('limit', params.limit);
      const response = await axios.get(`/api/notifications?${query.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch notifications.');
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to mark notification as read.');
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.patch('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to mark all notifications as read.');
    }
  }
);

// 2. Slice Definition
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    pagination: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    // Real-time socket events
    addNotificationLocal: (state, action) => {
      const exists = state.notifications.some(n => n.id === action.payload.id);
      if (!exists) {
        state.notifications.unshift(action.payload);
      }
    },
    markReadLocal: (state, action) => {
      const notif = state.notifications.find(n => n.id === action.payload);
      if (notif) {
        notif.isRead = true;
      }
    },
    markAllReadLocal: (state) => {
      state.notifications.forEach(n => {
        n.isRead = true;
      });
    },
    clearNotificationsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.data || action.payload;
        state.pagination = action.payload.pagination || null;
        state.isLoading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Mark Individual Read
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Mark All Read
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications.forEach(n => {
          n.isRead = true;
        });
      })
      .addCase(markAllNotificationsRead.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  addNotificationLocal,
  markReadLocal,
  markAllReadLocal,
  clearNotificationsError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
