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

/** Resolves an image URL, prepending the backend host for local relative uploads if necessary. */
export function getImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
  const backendBase = apiBase.replace(/\/api\/v1\/?$/, "");
  return `${backendBase}${url}`;
}

/**
 * Absolute URL for the backend's unversioned /api/health endpoint, built
 * the same defensive way as getImageUrl (strip /api/v1 off the configured
 * base) rather than relying on axios resolving a relative "../health"
 * against baseURL, which breaks if baseURL's shape ever changes.
 */
export function getHealthUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
  const backendBase = apiBase.replace(/\/api\/v1\/?$/, "");
  return `${backendBase}/api/health`;
}

