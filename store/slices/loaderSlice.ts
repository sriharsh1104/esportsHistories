import { createSlice } from '@reduxjs/toolkit';

const loaderSlice = createSlice({
  name: 'loader',
  initialState: { visible: false },
  reducers: {
    showLoader: (state) => {
      state.visible = true;
    },
    hideLoader: (state) => {
      state.visible = false;
    },
  },
});

export const { showLoader, hideLoader } = loaderSlice.actions;
export default loaderSlice.reducer;
