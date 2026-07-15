import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttendeeCard } from "./AttendeeCard";

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
