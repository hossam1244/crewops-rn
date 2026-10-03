import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Local-first state: the UI reflects what the crew did; sync is the queue's
 *  job, not the screen's. */
export interface CheckIn {
  id: string;
  site: string;
  note: string;
  at: number;
  synced: boolean;
}

interface CheckInsState {
  items: CheckIn[];
}

const initialState: CheckInsState = { items: [] };

const checkinsSlice = createSlice({
  name: "checkins",
  initialState,
  reducers: {
    checkInRecorded(
      state,
      action: PayloadAction<{ id: string; site: string; note: string; at: number }>,
    ) {
      state.items.unshift({ ...action.payload, synced: false });
    },
    checkInSynced(state, action: PayloadAction<string>) {
      const found = state.items.find((item) => item.id === action.payload);
      if (found) found.synced = true;
    },
  },
});

export const { checkInRecorded, checkInSynced } = checkinsSlice.actions;
export default checkinsSlice.reducer;
