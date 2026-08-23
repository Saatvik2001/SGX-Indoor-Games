const DB_UNAVAILABLE_PATTERNS = [
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'password authentication failed',
  'database_unavailable',
  'no_pool',
  'pool',
  'connection terminated',
  'connect ECONNREFUSED',
  'connect ENOTFOUND',
  'connect ETIMEDOUT',
];

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return DB_UNAVAILABLE_PATTERNS.some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()));
}

export async function withDatabaseFallback<T>(
  databaseOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>
): Promise<T> {
  try {
    return await databaseOperation();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return fallbackOperation();
    }
    throw error;
  }
}
