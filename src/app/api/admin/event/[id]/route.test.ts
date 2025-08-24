import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { testApiHandler } from "next-test-api-route-handler";

// Mocks

vi.mock('@/types/schemas/event/admin', () => ({
  createEventSchema: { parse: vi.fn() },
  updateEventSchema: { parse: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        event: {
            create: vi.fn(),
            update: vi.fn()
        }
    }
}));

vi.mock('@/lib/helpers/prismaErrorHandler', () => ({
  handlePrismaError: vi.fn(),
}));

// Import AFTER mocks so the route picks up the mocked deps
import * as adminRoute from "@/app/api/admin/event/[id]/route";
import { prisma } from "@/lib/prisma";
import { adminCreateEventSchema, adminUpdateEventSchema } from "@/types/schemas/event/admin";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";


const mockedCreateParse = adminCreateEventSchema.parse as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateParse = adminUpdateEventSchema.parse as unknown as ReturnType<typeof vi.fn>;
const mockedCreate = prisma.event.create as unknown as ReturnType<typeof vi.fn>;
const mockedUpdate = prisma.event.update as unknown as ReturnType<typeof vi.fn>;
const mockedHandle = handlePrismaError as unknown as ReturnType<typeof vi.fn>;

describe('App Router: /api/events (route.ts)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('201: creates event', async () => {
      const event = { id: 'e1', title: 'Conf', startsAt: '2025-08-10T10:00:00Z' };
  mockedCreateParse.mockReturnValue(event);
      mockedCreate.mockResolvedValue({ id: event.id });

      await testApiHandler({
        // point to your exported handler
        appHandler: adminRoute,
        // exercise via fetch-like API
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(event),
          });
          expect(res.status).toBe(201);
          expect(await res.json()).toEqual({ message: 'Event created successfully' });

          expect(mockedCreateParse).toHaveBeenCalledWith(event);
          expect(mockedCreate).toHaveBeenCalledWith({ data: event });
        },
      });
    });

    it('422: zod validation error', async () => {
      const zerr = new z.ZodError([
        { code: 'invalid_type', expected: 'string', path: ['title'], message: 'Required' },
      ]);
  mockedCreateParse.mockImplementation(() => { throw zerr; });

      await testApiHandler({
        appHandler: adminRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}), // invalid
          });
          expect(res.status).toBe(422);
          expect(await res.json()).toEqual({ error: zerr.cause });
          expect(mockedCreate).not.toHaveBeenCalled();
        },
      });
    });

    it('409: prisma error handled', async () => {
      const event = { id: 'e1', title: 'Conf', startsAt: '2025-08-10T10:00:00Z' };
  mockedCreateParse.mockReturnValue(event);
      const prismaErr = new Error('Unique constraint failed');
      mockedCreate.mockRejectedValue(prismaErr);
      mockedHandle.mockReturnValue({ statusCode: 409, error: 'Event already exists' });

      await testApiHandler({
        appHandler: adminRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(event),
          });
          expect(res.status).toBe(409);
          expect(await res.json()).toEqual({ error: 'Event already exists' });
          expect(mockedHandle).toHaveBeenCalledWith(prismaErr);
        },
      });
    });
  });

  describe('PUT', () => {
    it('200: updates event', async () => {
      const event = { id: 'e1', title: 'Updated', startsAt: '2025-08-11T10:00:00Z' };
  mockedUpdateParse.mockReturnValue(event);
      mockedUpdate.mockResolvedValue({ id: event.id });

      await testApiHandler({
        appHandler: adminRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(event),
          });
          expect(res.status).toBe(200);
          expect(await res.json()).toEqual({ message: 'Event updated successfully' });

          expect(mockedUpdateParse).toHaveBeenCalledWith(event);
          expect(mockedUpdate).toHaveBeenCalledWith({
            where: { id: event.id },
            data: {
              title: event.title,
              startsAt: event.startsAt,
            },
          });
        },
      });
    });

    it('422: zod error on PUT', async () => {
      const zerr = new z.ZodError([
        { code: 'invalid_type', expected: 'string', path: ['id'], message: 'Required' },
      ]);
  mockedUpdateParse.mockImplementation(() => { throw zerr; });

      await testApiHandler({
        appHandler: adminRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ title: 'No ID' }),
          });
          expect(res.status).toBe(422);
          expect(await res.json()).toEqual({ error: zerr.cause });
          expect(mockedUpdate).not.toHaveBeenCalled();
        },
      });
    });

    it('404: prisma error handled on PUT', async () => {
      const event = { id: 'missing', title: 'x', startsAt: '2025-08-10T10:00:00Z' };
  mockedUpdateParse.mockReturnValue(event);
      const prismaErr = new Error('Record not found');
      mockedUpdate.mockRejectedValue(prismaErr);
      mockedHandle.mockReturnValue({ statusCode: 404, error: 'Event not found' });

      await testApiHandler({
        appHandler: adminRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(event),
          });
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Event not found' });
          expect(mockedHandle).toHaveBeenCalledWith(prismaErr);
        },
      });
    });
  });
});
