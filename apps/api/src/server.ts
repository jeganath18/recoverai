import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "./db/prisma";
import { testRoutes } from "./routes/test.routes";

const app = Fastify({
  logger: true,
});

const start = async (): Promise<void> => {
  try {
    await app.register(cors, {
      origin: true,
    });

    await app.register(testRoutes);

    app.get("/health", async () => {
      await prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        service: "recoverai-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    });

    await app.listen({
      port: 3000,
      host: "0.0.0.0",
    });

    console.log("RecoverAI API running on http://localhost:5000");
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();