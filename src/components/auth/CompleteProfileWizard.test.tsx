import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CompleteProfileWizard from "./CompleteProfileWizard";

async function fillAttendeeFlow() {
  fireEvent.change(screen.getByLabelText(/^Username/), { target: { value: "attendee-user" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  fireEvent.click(screen.getByRole("button", { name: /Attendee/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  fireEvent.change(screen.getByLabelText(/^Legal name/), { target: { value: "Jane Doe" } });
  fireEvent.change(screen.getByLabelText(/^Address \*/), { target: { value: "Main Street 1" } });
  fireEvent.change(screen.getByLabelText(/^City/), { target: { value: "Berlin" } });
  fireEvent.change(screen.getByLabelText(/^Postal code/), { target: { value: "10115" } });

  const countryInput = screen.getByLabelText(/^Country/);
  fireEvent.change(countryInput, { target: { value: "Germany" } });
  await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
  fireEvent.click(within(screen.getByRole("listbox")).getByText("Germany"));

  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
}

describe("CompleteProfileWizard post-submit navigation", () => {
  let hrefSetter: (v: string) => void;

  beforeEach(() => {
    hrefSetter = vi.fn<(v: string) => void>();
    // jsdom throws "Not implemented: navigation" on a real location.href
    // assignment - stub the setter so we can assert on it instead.
    Object.defineProperty(window, "location", {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      writable: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true, pictureImported: false }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does a hard navigation (not a client-side router transition) after a successful submit", async () => {
    render(<CompleteProfileWizard callbackUrl="/" />);

    await fillAttendeeFlow();

    await waitFor(() => expect(hrefSetter).toHaveBeenCalledWith("/"));
  });

  it("navigates to the given callbackUrl", async () => {
    render(<CompleteProfileWizard callbackUrl="/events/42" />);

    await fillAttendeeFlow();

    await waitFor(() => expect(hrefSetter).toHaveBeenCalledWith("/events/42"));
  });

  it("does not navigate away when the submit request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Username already taken" }), { status: 409 })),
    );

    render(<CompleteProfileWizard callbackUrl="/" />);

    await fillAttendeeFlow();

    await screen.findByText("Username already taken");
    expect(hrefSetter).not.toHaveBeenCalled();
  });
});
