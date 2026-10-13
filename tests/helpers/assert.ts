/** Narrows a value the test has just found, failing loudly when it is missing. */
export function defined<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what} to be defined`);
  return value;
}
