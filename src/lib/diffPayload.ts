/**
 * Shallow top-level diff between two objects sharing a shape, for building
 * PATCH bodies that only carry the fields that actually changed instead of
 * resending the whole payload. Values are compared via JSON.stringify, so
 * Date vs. matching ISO string compare equal, and nested objects/arrays
 * compare by structural equality.
 */
export function diffPayload<T extends Record<string, unknown>>(original: T, updated: T): Partial<T> {
  const diff: Partial<T> = {};
  for (const key of Object.keys(updated) as (keyof T)[]) {
    if (JSON.stringify(updated[key]) !== JSON.stringify(original[key])) {
      diff[key] = updated[key];
    }
  }
  return diff;
}
