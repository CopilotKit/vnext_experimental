export type MaybePromise<T> = T | Promise<T>;

/**
 * More specific utility for records with at least one key
 */
export type NonEmptyRecord<T> =
  T extends Record<string, unknown>
    ? keyof T extends never
      ? never
      : T
    : never;
