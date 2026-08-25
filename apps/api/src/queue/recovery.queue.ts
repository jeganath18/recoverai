import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const recoveryDecisionQueue = new Queue(
  "recovery-decision",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: false,
    },
  },
);

export const retryExecutionQueue = new Queue(
  "retry-execution",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: false,
    },
  },
);

export const outreachExecutionQueue = new Queue(
  "outreach-execution",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: false,
    },
  },
);