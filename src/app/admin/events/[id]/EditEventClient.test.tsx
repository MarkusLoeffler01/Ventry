import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditEventClient from "./EditEventClient";
import type { AdminCreateEventInput } from "@/types/schemas/event/admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

let submittedData: AdminCreateEventInput;

vi.mock("@/components/admin/events/EventForm", () => ({
  default: ({ onSubmit }: { onSubmit: (data: AdminCreateEventInput) => Promise<void> }) => (
    <button type="button" onClick={() => onSubmit(submittedData)}>
      submit
    </button>
  ),
}));

const BASE_EVENT = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Original Name",
  description: "Original description",
  startDate: "2026-08-01T00:00:00.000Z",
  endDate: "2026-08-03T00:00:00.000Z",
  publishAt: null,
  registrationOpensAt: null,
  maxRegistrations: 100,
  requiresHotel: false,
  requireApproval: false,
  scanOnce: false,
  communityEnabled: false,
  communityOpenAfterEnd: true,
  communityModerated: true,
  communityModerateComments: false,
  communityAttendeesOnly: true,
  paymentDeadline: null,
  status: "PUBLISHED",
  imageUrl: null,
  location: { name: "Venue", address: "Street 1", city: "City", state: "State", country: "US", postalCode: "12345" },
  stayPolicy: { version: 2, hotels: [] },
  products: [{ id: "p1", name: "Ticket", description: null, price: 10, type: "TICKET", capacity: 50, order: 0 }],
  customFields: [],
  schedule: [],
  // biome-ignore lint: test fixture cast, mirrors real EditEventClient's cast of the loosely-typed SerializedEvent prop
} as any;

function setupFetch() {
  const mock = vi.fn(async (_url: string, _options?: RequestInit) => new Response(JSON.stringify({ event: {} }), { status: 200 }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("EditEventClient PATCH diffing", () => {
  it("only sends changed scalar fields, leaving unchanged ones out", async () => {
    const fetchMock = setupFetch();
    submittedData = {
      ...BASE_EVENT,
      name: "Updated Name", // changed
    };

    render(<EditEventClient event={BASE_EVENT} />);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/admin/event/${BASE_EVENT.id}`);
    const body = JSON.parse((options as RequestInit).body as string);

    expect(body.name).toBe("Updated Name");
    expect(body.description).toBeUndefined();
    expect(body.maxRegistrations).toBeUndefined();
    expect(body.status).toBeUndefined();
  });

  it("always includes structural fields even when unchanged, since they're rebuilt fresh on every submit", async () => {
    const fetchMock = setupFetch();
    submittedData = { ...BASE_EVENT }; // nothing changed at all

    render(<EditEventClient event={BASE_EVENT} />);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);

    expect(body.location).toEqual(BASE_EVENT.location);
    expect(body.products).toEqual(BASE_EVENT.products);
    expect(body.stayPolicy).toEqual(BASE_EVENT.stayPolicy);
    expect(body.customFields).toEqual(BASE_EVENT.customFields);
    expect(body.schedule).toEqual(BASE_EVENT.schedule);
    expect(body.name).toBeUndefined();
  });

  it("does not silently revert status when it is unchanged and omitted from the diff", async () => {
    const fetchMock = setupFetch();
    submittedData = { ...BASE_EVENT, name: "Another Update" };

    render(<EditEventClient event={{ ...BASE_EVENT, status: "PUBLISHED" }} />);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.status).toBeUndefined();
  });
});
