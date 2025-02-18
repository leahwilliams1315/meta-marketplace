import { PrismaClient } from "@prisma/client";

// Removed global caching to prevent potential prepared statement conflicts with PgBouncer
const prisma = new PrismaClient({
  log: ["query"],
});

export default prisma;
