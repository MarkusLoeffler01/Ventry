import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

export const ensureSessionKey: Prisma.Middleware = async (params, next) => {
    // Check if the operation is an update on the User model
    if (params.model === "User" && params.action === "create") {
        // Check if the sessionKey field is being updated to null or undefined
        if (params.data.sessionKey === null || params.data.sessionKey === undefined) {
            // Generate a new UUID for sessionKey
            params.data.sessionKey = randomUUID();
        }
    }
    // Proceed with the next middleware or the actual database operation
    return next(params);
}