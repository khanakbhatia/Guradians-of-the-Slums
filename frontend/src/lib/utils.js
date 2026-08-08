import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely (handles conflicting utility classes).
 * Used by every shadcn/ui component.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** First name from a full name string, e.g. "Rahul Mehta" -> "Rahul". Falls back gracefully. */
export function firstName(fullName) {
  if (!fullName) return "there";
  return fullName.trim().split(" ")[0];
}

/** Up to 2 uppercase initials from a full name, e.g. "Rahul Mehta" -> "RM". */
export function initials(fullName = "") {
  return fullName
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
