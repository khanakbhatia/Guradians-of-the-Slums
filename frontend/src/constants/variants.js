/**
 * Maps a severity or priority level to a StatusChip variant. Used
 * anywhere an incident/task/alert shows a critical→low scale — was
 * previously copy-pasted identically across 7 components.
 */
export const SEVERITY_VARIANT = {
  critical: "destructive",
  high: "warning",
  medium: "primary",
  low: "neutral",
};
