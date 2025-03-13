/**
 * Represents a token value that can be a string, number, null, or undefined
 */
export type TokenValue = string | number | null | undefined;

/**
 * Represents a storage of tokens with string keys and token values
 */
export type TokenStorage = Record<string, TokenValue>;
