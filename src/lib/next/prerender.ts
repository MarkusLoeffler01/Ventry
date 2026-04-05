type ErrorWithMetadata = Error & {
  code?: string;
  digest?: string;
};

const EXPECTED_DIGESTS = new Set([
  "HANGING_PROMISE_REJECTION",
  "NEXT_PRERENDER_INTERRUPTED",
]);

export function isExpectedPrerenderInterruption(error: unknown): error is ErrorWithMetadata {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeError = error as ErrorWithMetadata;

  if (maybeError.digest && EXPECTED_DIGESTS.has(maybeError.digest)) {
    return true;
  }

  if (maybeError.code === "P5010" && maybeError.message.includes("During prerendering")) {
    return true;
  }

  return (
    maybeError.message.includes("During prerendering") ||
    maybeError.message.includes("needs to bail out of prerendering")
  );
}

export function rethrowIfExpectedPrerenderInterruption(error: unknown) {
  if (isExpectedPrerenderInterruption(error)) {
    throw error;
  }
}
