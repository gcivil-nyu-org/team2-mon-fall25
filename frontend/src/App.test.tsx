import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders app successfully", () => {
  render(<App />);
  expect(screen.getByText(/CollabDesk/i)).toBeInTheDocument();
});
