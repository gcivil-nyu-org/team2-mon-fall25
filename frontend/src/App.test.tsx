import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

// Mock Auth0
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isAuthenticated: false,
    isLoading: false,
    loginWithRedirect: vi.fn(),
    getAccessTokenSilently: vi.fn(),
  }),
  Auth0Provider: ({ children }: { children: React.ReactNode }) => children,
}));

test("renders app successfully", () => {
  render(<App />);
  expect(screen.getByText(/CollabDesk/i)).toBeInTheDocument();
});
