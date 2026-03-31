import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A utility function that merges Tailwind CSS classes using `clsx` and `tailwind-merge`.
 * This ensures that conflicting classes are handled correctly and allows for conditional styling.
 * @param inputs A list of class names or conditional class objects.
 * @returns A single string of merged class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
