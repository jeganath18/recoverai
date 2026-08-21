import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";

export async function testRoutes(app: FastifyInstance) {
  app.post("/test/customer", async (request, reply) => {
    const body = request.body as {
      name: string;
      email: string;
    };

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        email: body.email,
      },
    });

    return reply.code(201).send(customer);
  });

  app.get("/test/customers", async () => {
    return prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  });
}