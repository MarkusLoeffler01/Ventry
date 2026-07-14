import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePageClient from "./ProfilePageClient";

vi.mock("./ProfilePictureGallery", () => ({ default: () => null }));
vi.mock("./LinkedAccounts", () => ({ default: () => null }));
vi.mock("./MyRegistrations", () => ({ default: () => null }));
vi.mock("@/components/common/CountryAutocomplete", () => ({
  default: () => null,
}));

const BASE_USER = {
  id: "user-1",
  name: "Alice Example",
  username: "alice-example",
  email: "alice@example.com",
  country: "US",
  legalName: null,
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
  profilePictures: [],
  accounts: [],
  bio: "Original bio",
  dateOfBirth: null,
  pronouns: "she/her",
  showAge: true,
  showExactBirthdate: false,
  socialLinks: { telegram: "orig_handle" },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function setupFetch(status = 200) {
  const mock = vi.fn(async (_url: string, _options?: RequestInit) => new Response(JSON.stringify({}), { status }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("ProfilePageClient PATCH diffing", () => {
  it("sends only the changed field on save", async () => {
    const fetchMock = setupFetch();
    render(<ProfilePageClient user={BASE_USER} />);

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Alice Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/user");
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body).toEqual({ id: "user-1", name: "Alice Updated" });
  });

  it("skips the network call entirely when nothing changed", async () => {
    const fetchMock = setupFetch();
    render(<ProfilePageClient user={BASE_USER} />);

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText(/save changes/i)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates the diff baseline after a successful save, so a second unrelated edit only sends the new field", async () => {
    const fetchMock = setupFetch();
    render(<ProfilePageClient user={BASE_USER} />);

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Alice Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Bio"), {
      target: { value: "New bio text" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [, options] = fetchMock.mock.calls[1];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body).toEqual({ id: "user-1", bio: "New bio text" });
  });
});

function setupRoutedFetch(handlers: Record<string, { status: number; body?: unknown }>) {
  const mock = vi.fn(async (url: string, _options?: RequestInit) => {
    const path = new URL(url, "http://localhost").pathname;
    const handler = handlers[path] ?? { status: 200 };
    return new Response(JSON.stringify(handler.body ?? {}), { status: handler.status });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("ProfilePageClient username changes", () => {
  it("calls the dedicated username endpoint before the general profile PATCH", async () => {
    const fetchMock = setupRoutedFetch({
      "/api/user/username": { status: 200 },
      "/api/user": { status: 200 },
    });
    render(<ProfilePageClient user={BASE_USER} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "alice-new" } });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Alice Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [firstUrl, firstOptions] = fetchMock.mock.calls[0];
    expect(new URL(firstUrl as string, "http://localhost").pathname).toBe("/api/user/username");
    expect(JSON.parse((firstOptions as RequestInit).body as string)).toEqual({ username: "alice-new" });

    const [secondUrl] = fetchMock.mock.calls[1];
    expect(new URL(secondUrl as string, "http://localhost").pathname).toBe("/api/user");
  });

  it("skips the username endpoint entirely when the username is unchanged", async () => {
    const fetchMock = setupRoutedFetch({ "/api/user": { status: 200 } });
    render(<ProfilePageClient user={BASE_USER} />);

    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Alice Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(new URL(fetchMock.mock.calls[0][0] as string, "http://localhost").pathname).toBe("/api/user");
  });

  it("surfaces a 409 from the username endpoint and does not proceed to the profile PATCH", async () => {
    const fetchMock = setupRoutedFetch({
      "/api/user/username": { status: 409, body: { error: "Username already taken" } },
    });
    render(<ProfilePageClient user={BASE_USER} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "taken-name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText("Username already taken")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
