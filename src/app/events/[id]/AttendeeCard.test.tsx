import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Importing page.tsx pulls in its module-scope dependencies even though this
// test only exercises the AttendeeCard sub-component - stub out the ones
// that would otherwise throw/hit real infra outside a request context.
vi.mock("@/lib/prisma/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

const { AttendeeCard } = await import("./page");

describe("AttendeeCard country display", () => {
  it("renders a flag and the full country name instead of the raw ISO code", () => {
    render(<AttendeeCard attendee={{ id: "1", name: "Jane Doe", country: "DE", imageUrl: null }} />);

    expect(screen.queryByText("DE")).not.toBeInTheDocument();
    expect(screen.getByText(/Germany/)).toBeInTheDocument();
    expect(screen.getByText(/🇩🇪/)).toBeInTheDocument();
  });

  it("falls back to a placeholder when no country is set", () => {
    render(<AttendeeCard attendee={{ id: "1", name: "Jane Doe", country: null, imageUrl: null }} />);

    expect(screen.getByText("Country not shared")).toBeInTheDocument();
  });

  it("falls back to a placeholder for an unrecognized country code", () => {
    render(<AttendeeCard attendee={{ id: "1", name: "Jane Doe", country: "ZZ", imageUrl: null }} />);

    expect(screen.getByText("Country not shared")).toBeInTheDocument();
  });
});
