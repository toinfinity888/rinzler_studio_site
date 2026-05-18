/**
 * OpenTelemetry tracing helpers for BullMQ worker jobs (T030).
 *
 * Activated when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. No PII in span
 * attributes — call sites pass only structural IDs (project_id, scan_id).
 *
 * For now this is a shim with the public surface a worker would call. Full
 * OTel SDK bring-up is gated on the deploy bundle (server-side only).
 */

export interface SpanContext {
  end(): void;
  setAttribute(key: string, value: string | number | boolean): void;
  recordException(err: unknown): void;
}

class NoopSpan implements SpanContext {
  end() {}
  setAttribute() {}
  recordException() {}
}

export function startSpan(name: string, _attrs?: Record<string, string>): SpanContext {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return new NoopSpan();
  // Deferred: real otel-sdk-node hookup at deploy time.
  return new NoopSpan();
}

export async function withSpan<T>(
  name: string,
  fn: (span: SpanContext) => Promise<T>,
  attrs?: Record<string, string>,
): Promise<T> {
  const span = startSpan(name, attrs);
  try {
    return await fn(span);
  } catch (err) {
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
