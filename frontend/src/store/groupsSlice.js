import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Fetch all groups
export const fetchGroups = createAsyncThunk('groups/fetchGroups', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/groups`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch groups');
  }
});

export const createGroup = createAsyncThunk('groups/createGroup', async (name, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/groups`, { name });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to create group');
  }
});

export const updateGroup = createAsyncThunk('groups/updateGroup', async ({ id, name }, { rejectWithValue }) => {
  try {
    const response = await axios.put(`${API_URL}/groups/${id}`, { name });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to update group');
  }
});

export const deleteGroup = createAsyncThunk('groups/deleteGroup', async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${API_URL}/groups/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to delete group');
  }
});

const groupsSlice = createSlice({
  name: 'groups',
  initialState: {
    groups: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload);
        state.groups.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        const index = state.groups.findIndex(g => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
          state.groups.sort((a, b) => a.name.localeCompare(b.name));
        }
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(g => g.id !== action.payload);
      });
  }
});

export default groupsSlice.reducer;
