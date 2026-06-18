import { describe, expect, it } from "vitest";
import { formatTicketQrPayload, parseTicketQrPayload } from "./qr";

describe("ticket QR payloads", () => {
  it("formats and parses event-scoped ticket payloads", () => {
    const payload = formatTicketQrPayload({ eventId: 12, ticketId: 345 });

    expect(payload).toBe("ventry:ticket:v1:12:345");
    expect(parseTicketQrPayload(payload)).toEqual({ eventId: 12, ticketId: 345 });
  });

  it("parses plain ticket IDs only when manual fallback is enabled", () => {
    expect(parseTicketQrPayload("345")).toBeNull();
    expect(parseTicketQrPayload("345", { allowPlainTicketId: true })).toEqual({ eventId: 0, ticketId: 345 });
  });

  it("rejects invalid payloads", () => {
    expect(parseTicketQrPayload("ventry:ticket:v1:abc:345")).toBeNull();
    expect(parseTicketQrPayload("not-a-ticket")).toBeNull();
  });
});
