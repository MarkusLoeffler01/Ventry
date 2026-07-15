import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EventList from "./EventList";
import type { SerializedEvent } from "@/types/event";

function makeEvent(overrides: Partial<SerializedEvent> = {}): SerializedEvent {
  return {
    id: 1,
    name: "Event One",
    description: "d",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    imageUrl: null,
    status: "PUBLISHED",
    stayPolicy: {
      version: 2,
      mainLocationIsAccommodation: false,
      allowOverflowHotels: false,
      samePolicyAcrossHotels: true,
      hotels: [],
    },
    schedule: [],
    products: [],
    ...overrides,
  };
}

describe("EventList", () => {
  it("picks up a newly created event after the server component re-renders with fresh props", () => {
    const eventOne = makeEvent({ id: 1, name: "Event One" });
    const { rerender } = render(<EventList initialEvents={[eventOne]} />);

    expect(screen.getByText("Event One")).toBeInTheDocument();
    expect(screen.queryByText("Event Two")).not.toBeInTheDocument();

    const eventTwo = makeEvent({ id: 2, name: "Event Two" });
    // Simulates router.refresh(): the parent Server Component re-runs and
    // passes a new initialEvents array, without EventList remounting.
    rerender(<EventList initialEvents={[eventOne, eventTwo]} />);

    expect(screen.getByText("Event One")).toBeInTheDocument();
    expect(screen.getByText("Event Two")).toBeInTheDocument();
  });
});
