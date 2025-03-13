/**
 * Tailwind CSS Utility Functions
 *
 * This module provides utility functions for working with Tailwind CSS classes.
 * It combines clsx and tailwind-merge to create a powerful class name management solution.
 *
 * The 'cn' function:
 * 1. Takes any number of class arguments (strings, objects, arrays)
 * 2. Uses clsx to conditionally join them together
 * 3. Uses tailwind-merge to resolve conflicting Tailwind classes
 *
 * This is particularly useful for component libraries where you want to:
 * - Allow consumers to override default classes
 * - Handle conditional classes elegantly
 * - Resolve Tailwind class conflicts properly
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class values into a single string and resolves Tailwind class conflicts
 *
 * @param inputs - Any number of class values (strings, objects, arrays)
 * @returns A merged string of class names with Tailwind conflicts resolved
 *
 * @example
 * // Basic usage
 * cn('text-red-500', 'bg-blue-500')
 *
 * @example
 * // With conditional classes
 * cn('text-lg', { 'text-blue-500': isActive, 'text-gray-500': !isActive })
 *
 * @example
 * // Resolving conflicts (last one wins)
 * cn('text-red-500', 'text-blue-500') // Results in just 'text-blue-500'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
