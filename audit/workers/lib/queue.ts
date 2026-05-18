/**
 * BullMQ queue + worker factory (T027 — worker-jobs.md cross-cutting section).
 *
 * Per-queue defaults are encoded here so the call site only declares the
 * payload shape. Concurrency caps and rate-limits are owned by this module.
 */
import { Queue, Worker, type Processor, type WorkerOptions } from "bullmq";
import IORedis, { type Redis } from "ioredis";

let _connection: Redis | null = null;
function getConnection(): Redis {
  if (_connection) return _connection;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  _connection = new IORedis(url, {
    // BullMQ requirement.
    maxRetriesPerRequest: null,
  });
  return _connection;
}

export interface QueueConfig {
  concurrency: number;
  /** Per-queue rate limit (max jobs per duration ms). Optional. */
  limiter?: { max: number; duration: number };
  attempts?: number;
}

export const QUEUE_CONFIGS = {
  scan: { concurrency: 4, attempts: 2 },
  ai: { concurrency: 8, attempts: 3 },
  enrichment: { concurrency: 4, attempts: 2 },
  learning: { concurrency: 1, attempts: 1 },
  report: { concurrency: 2, attempts: 3 },
  purge: { concurrency: 1, attempts: 1 },
} as const satisfies Record<string, QueueConfig>;

export type QueueName = keyof typeof QUEUE_CONFIGS;

const _queues = new Map<QueueName, Queue>();

export function getQueue<TPayload = unknown>(name: QueueName): Queue<TPayload> {
  let q = _queues.get(name) as Queue<TPayload> | undefined;
  if (!q) {
    q = new Queue<TPayload>(name, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: QUEUE_CONFIGS[name].attempts,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    _queues.set(name, q as Queue);
  }
  return q;
}

export function createWorker<TPayload>(
  name: QueueName,
  processor: Processor<TPayload>,
  overrides?: Partial<WorkerOptions>,
): Worker<TPayload> {
  const config: QueueConfig = QUEUE_CONFIGS[name];
  return new Worker<TPayload>(name, processor, {
    connection: getConnection(),
    concurrency: config.concurrency,
    ...(config.limiter ? { limiter: config.limiter } : {}),
    ...overrides,
  });
}

export async function closeAllQueues(): Promise<void> {
  for (const q of _queues.values()) await q.close();
  _queues.clear();
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
