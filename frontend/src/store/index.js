import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './tasksSlice';
import notificationsReducer from './notificationsSlice';
import groupsReducer from './groupsSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    notifications: notificationsReducer,
    groups: groupsReducer,
  },
  // Enable devTools in development mode
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
