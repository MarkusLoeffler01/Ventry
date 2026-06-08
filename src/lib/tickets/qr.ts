const TICKET_QR_PREFIX = "ventry:ticket:v1";

export type TicketQrPayload = {
  eventId: number;
  ticketId: number;
};

export function formatTicketQrPayload({ eventId, ticketId }: TicketQrPayload) {
  return `${TICKET_QR_PREFIX}:${eventId}:${ticketId}`;
}

export function parseTicketQrPayload(
  value: string,
  options: { allowPlainTicketId?: boolean } = {},
): TicketQrPayload | null {
  const trimmed = value.trim();
  const parts = trimmed.split(":");

  if (parts.length === 5 && parts.slice(0, 3).join(":") === TICKET_QR_PREFIX) {
    const eventId = Number(parts[3]);
    const ticketId = Number(parts[4]);

    if (Number.isInteger(eventId) && eventId > 0 && Number.isInteger(ticketId) && ticketId > 0) {
      return { eventId, ticketId };
    }
  }

  if (options.allowPlainTicketId && /^\d+$/.test(trimmed)) {
    return { eventId: 0, ticketId: Number(trimmed) };
  }

  return null;
}
