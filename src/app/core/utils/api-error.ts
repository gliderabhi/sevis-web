import { HttpErrorResponse } from '@angular/common/http';

// Backend errors (via sevis-common's GlobalExceptionHandler) come back as
// { status, error, messages? } — the reason lives in `error`, and field
// validation errors land in `messages` as a string array. Neither is the
// `message` field, so a naive `err?.error?.message` lookup silently misses
// the real reason and falls back to a generic string.
export function apiErrorMessage(err: HttpErrorResponse | any, fallback: string): string {
  const body = err?.error;
  if (body?.messages?.length) return body.messages.join(', ');
  return body?.error ?? body?.message ?? fallback;
}
