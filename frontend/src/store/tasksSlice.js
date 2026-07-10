import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../services/taskService';

// 1. Async Thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await taskService.getTasks(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tasks.');
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await taskService.updateTaskStatus(id, status);
      return { id, status: data.status };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update status.');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await taskService.updateTask(id, payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update task.');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete task.');
    }
  }
);

export const addComment = createAsyncThunk(
  'tasks/addComment',
  async ({ id, content }, { rejectWithValue }) => {
    try {
      const data = await taskService.addComment(id, content);
      return { taskId: id, comment: data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to save comment.');
    }
  }
);

// 2. Tasks Slice
const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    tasks: [],
    pagination: null,
    isLoading: false,
    error: null,
    lastFetched: null,
  },
  reducers: {
    // Real-time Web Socket Reducers
    addInquiryLocal: (state, action) => {
      const exists = state.tasks.some(t => t.id === action.payload.id);
      if (!exists) {
        state.tasks.unshift(action.payload);
      }
    },
    updateStatusLocal: (state, action) => {
      const { id, status } = action.payload;
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.status = status;
      }
    },
    updateTaskLocal: (state, action) => {
      const index = state.tasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...action.payload };
      }
    },
    removeTaskLocal: (state, action) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    },
    addCommentLocal: (state, action) => {
      const { taskId, comment } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        if (!task.comments) task.comments = [];
        const exists = task.comments.some(c => c.id === comment.id);
        if (!exists) {
          task.comments.push(comment);
          if (task._count) {
            task._count.comments = task.comments.length;
          }
        }
      }
    },
    clearTasksError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tasks
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = state.tasks.length === 0; // Only set loading if list is empty
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.tasks = action.payload.data || action.payload;
        state.pagination = action.payload.pagination || null;
        state.isLoading = false;
        state.lastFetched = Date.now();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Task Status (Kanban / Inline Dropdowns)
      .addCase(updateTaskStatus.pending, (state, action) => {
        // Optimistic UI updates
        const { id, status } = action.meta.arg;
        const task = state.tasks.find(t => t.id === id);
        if (task) {
          task.status = status;
        }
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const task = state.tasks.find(t => t.id === id);
        if (task) {
          task.status = status;
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        // Rollback optimistic update if API failed
        // Since we don't have the original status in the action payload, we force reload
        state.error = action.payload;
      })

      // Update Task Details
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Delete Task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Add Comment
      .addCase(addComment.fulfilled, (state, action) => {
        const { taskId, comment } = action.payload;
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
          if (!task.comments) task.comments = [];
          const exists = task.comments.some(c => c.id === comment.id);
          if (!exists) {
            task.comments.push(comment);
            if (task._count) {
              task._count.comments = task.comments.length;
            }
          }
        }
      });
  },
});

export const { addInquiryLocal, updateStatusLocal, updateTaskLocal, removeTaskLocal, addCommentLocal, clearTasksError } = tasksSlice.actions;
export default tasksSlice.reducer;
