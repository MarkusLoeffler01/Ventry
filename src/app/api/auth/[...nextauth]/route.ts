import { handlers } from "../auth";

// Force Node.js runtime for NextAuth to use bcrypt
export const runtime = 'nodejs';

export const { GET, POST } = handlers;