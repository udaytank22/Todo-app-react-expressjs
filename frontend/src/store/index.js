import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './tasksSlice';
import notificationsReducer from './notificationsSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    notifications: notificationsReducer,
  },
  // Enable devTools in development mode
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
