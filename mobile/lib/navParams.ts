// Route params can arrive via repsearch:// deep links, so treat them as
// attacker-influencable before they reach navigation or API paths.

// Allow only app-internal paths ("/x", not "//host" or schemes) for
// returnTo-style navigation targets.
export function internalPath(path?: string): string | undefined {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : undefined;
}
