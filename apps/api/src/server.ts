import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({
  logger: true,
});

const start = async (): Promise<void> => {
  try {
    await app.register(cors, {
      origin: true,
    });

    app.get("/health", async () => {
      return {
        status: "ok",
        service: "recoverai-api",
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
    process.exit(1);
  }
};

start();