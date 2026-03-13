export function parseApiResult(raw) {
  if (raw && typeof raw === 'object' && 'ok' in raw) {
    return {
      ok: Boolean(raw.ok),
      message:
        typeof raw.message === 'string' ? raw.message : raw.ok ? 'Success' : 'Request failed',
      code: typeof raw.code === 'string' ? raw.code : '',
      data: raw.data,
      raw,
    };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('success')) {
      return { ok: true, message: trimmed, code: '', data: undefined, raw };
    }
    if (lower.startsWith('error')) {
      return { ok: false, message: trimmed, code: 'LEGACY_ERROR', data: undefined, raw };
    }
    return { ok: true, message: trimmed || 'Success', code: '', data: undefined, raw };
  }

  if (raw === null || raw === undefined) {
    return {
      ok: false,
      message: 'No response received',
      code: 'NO_RESPONSE',
      data: undefined,
      raw,
    };
  }

  return { ok: true, message: String(raw), code: '', data: undefined, raw };
}
