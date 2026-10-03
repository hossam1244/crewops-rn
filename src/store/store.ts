import { configureStore } from "@reduxjs/toolkit";

import checkinsReducer from "./checkinsSlice";

export const store = configureStore({
  reducer: { checkins: checkinsReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
