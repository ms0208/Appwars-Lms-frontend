export function getCompletionPercentage(completed, total) {
  if (!total || total < 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}
