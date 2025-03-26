/**
 * Types related to the pattern detector functionality
 */

/**
 * Pattern data interface matching the pattern-detector service
 */
export interface DetectedPattern {
  type: string;
  confidence: number;
  description: string;
  occurrences: number;
  relatedItems: string[];
  details: Record<string, unknown>;
  firstDetected: string;
  lastDetected: string;
}
