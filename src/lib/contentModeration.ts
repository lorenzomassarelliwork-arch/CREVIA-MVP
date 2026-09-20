const DISALLOWED_PATTERNS = [
  /(^|[^a-z0-9])(cazzo|cazzi|cazzone|cazzata)([^a-z0-9]|$)/i,
  /(^|[^a-z0-9])(merda|merde)([^a-z0-9]|$)/i,
  /(^|[^a-z0-9])(stronzo|stronza|stronzi|stronze)([^a-z0-9]|$)/i,
  /(^|[^a-z0-9])(vaffanculo|fanculo)([^a-z0-9]|$)/i,
  /(^|[^a-z0-9])(coglione|cogliona|coglioni)([^a-z0-9]|$)/i,
  /(^|[^a-z0-9])(puttana|puttane|troia|troie)([^a-z0-9]|$)/i,
  /(^|[^a-z0-9])(bastardo|bastarda|bastardi|bastarde)([^a-z0-9]|$)/i,
  /figlio\s+di\s+puttana/i,
  /porco\s+dio/i,
  /dio\s+porco/i,
  /dio\s+cane/i,
  /dio\s+boia/i,
  /madonna\s+puttana/i,
];

export function containsDisallowedContent(value: string | null | undefined): boolean {
  const text = value?.trim() ?? '';
  if (!text) return false;
  return DISALLOWED_PATTERNS.some((pattern) => pattern.test(text));
}

export function assertAllowedContent(
  values: Array<string | null | undefined>,
  message = 'Il contenuto contiene termini non consentiti. Modificalo prima di continuare.'
): void {
  if (values.some(containsDisallowedContent)) {
    throw new Error(message);
  }
}

export function normalizeModerationError(message: string): string {
  return message.includes('CONTENT_NOT_ALLOWED')
    ? 'Il contenuto contiene termini non consentiti. Modificalo prima di continuare.'
    : message;
}
