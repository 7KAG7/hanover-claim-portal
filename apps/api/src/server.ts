import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);
const prisma = new PrismaClient();
const app = buildApp(prisma as any);
await app.listen({ port: PORT, host: "0.0.0.0" });
