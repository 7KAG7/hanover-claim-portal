import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { z } from "zod";

type PrismaLike = {
  claim: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    findUnique: (args: any) => Promise<any | null>;
  };
};

const createClaimSchema = z.object({
  lob: z.enum(["Personal Auto", "Homeowners", "Commercial"]),
  policyNumber: z.string().min(3).max(50),
  insuredName: z.string().min(2).max(120),
  lossDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  lossType: z.string().min(2).max(60),
  description: z.string().min(5).max(2000),
  contactEmail: z.string().email(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export function buildApp(prisma: PrismaLike) {
  const app = Fastify({ logger: true });

  void app.register(cors, {
    origin: ["http://localhost:5173", "http://localhost:4200"],
  });

  void app.register(swagger, {
    openapi: {
      info: { title: "Hanover Claim API", version: "0.0.1" },
    },
  });

  void app.register(swaggerUI, { routePrefix: "/docs" });

  app.get("/health", async () => ({ ok: true }));

  app.post("/claims", async (req, reply) => {
    const parsed = createClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "VALIDATION_ERROR", issues: parsed.error.issues });
    }

    const d = parsed.data;

    // Insurance-friendly rule: loss date can't be in the future
    const lossDate = new Date(d.lossDate + "T00:00:00Z");
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (lossDate > today) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["lossDate"], message: "Loss date cannot be in the future." }],
      });
    }

    // Claim number generator: CLM-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    const claimNumber = `CLM-${year}-${rand}`;

    const created = await prisma.claim.create({
      data: {
        claimNumber,
        lob: d.lob,
        policyNumber: d.policyNumber,
        insuredName: d.insuredName,
        lossDate,
        lossType: d.lossType,
        description: d.description,
        contactEmail: d.contactEmail,
        priority: d.priority,
        status: "SUBMITTED",
        events: {
          create: { type: "STATUS_CHANGED", message: "Claim submitted" },
        },
      },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });

    return reply.status(201).send(created);
  });

  app.get("/claims", async (req) => {
    const q = req.query as Partial<{
      status: string;
      lob: string;
      assignedTo: string;
      search: string;
      page: string;
      pageSize: string;
    }>;

    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(50, Math.max(5, Number(q.pageSize ?? 20)));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.lob) where.lob = q.lob;
    if (q.assignedTo) where.assignedTo = q.assignedTo;

    if (q.search) {
      where.OR = [
        { claimNumber: { contains: q.search, mode: "insensitive" } },
        { insuredName: { contains: q.search, mode: "insensitive" } },
        { policyNumber: { contains: q.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.claim.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      prisma.claim.count({ where }),
    ]);

    return { page, pageSize, total, items };
  });

  app.get("/claims/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });

    if (!claim) return reply.status(404).send({ error: "NOT_FOUND" });
    return claim;
  });

  return app;
}
