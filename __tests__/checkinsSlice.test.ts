import checkinsReducer, { checkInRecorded, checkInSynced } from "../src/store/checkinsSlice";

describe("checkins slice", () => {
  it("records a check-in as pending sync", () => {
    const state = checkinsReducer(undefined, checkInRecorded({
      id: "local-1",
      site: "Site A",
      note: "On site",
      at: 123,
    }));

    expect(state.items).toHaveLength(1);
    expect(state.items[0].synced).toBe(false);
  });

  it("newest first", () => {
    let state = checkinsReducer(undefined, checkInRecorded({
      id: "a", site: "S", note: "first", at: 1,
    }));
    state = checkinsReducer(state, checkInRecorded({
      id: "b", site: "S", note: "second", at: 2,
    }));

    expect(state.items.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("flips to synced when the queue drains it", () => {
    let state = checkinsReducer(undefined, checkInRecorded({
      id: "local-1", site: "S", note: "x", at: 1,
    }));

    state = checkinsReducer(state, checkInSynced("local-1"));

    expect(state.items[0].synced).toBe(true);
  });
});
