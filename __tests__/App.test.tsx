import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

import App from "../App";

// The real App wires AsyncStorage + fetch; the test environment provides
// neither. A storage double + a sender stub keep the flow honest.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: async () => null,
  setItem: async () => undefined,
}));

describe("App", () => {
  it("renders the shift dashboard", () => {
    render(<App />);
    expect(screen.getByText("CrewOps")).toBeTruthy();
    expect(screen.getByLabelText("Check in on site")).toBeTruthy();
  });

  it("checking in queues a mutation and shows it as pending", () => {
    render(<App />);
    fireEvent.press(screen.getByLabelText("Check in on site"));

    expect(screen.getByText("On site")).toBeTruthy();
    expect(screen.getByText("pending")).toBeTruthy();
  });

  it("incident form validates and reports offline", () => {
    render(<App />);
    fireEvent.press(screen.getByText("Incidents"));

    const title = screen.getByLabelText("Incident title");
    fireEvent.changeText(title, "Missing railing");
    fireEvent.press(screen.getByLabelText("Report incident"));

    expect(screen.getByLabelText("Queued offline note")).toBeTruthy();
  });
});
