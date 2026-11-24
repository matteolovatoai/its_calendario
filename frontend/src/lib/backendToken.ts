// Il token del backend viene emesso una sola volta al login e ha una scadenza fissa,
// mentre la sessione NextAuth si rinnova a ogni utilizzo. Queste funzioni permettono
// di chiudere la sessione quando il token del backend non è più valido.

/** Margine di sicurezza: considera scaduto il token un minuto prima della scadenza reale. */
const EXPIRY_MARGIN_MS = 60 * 1000;

/** Legge il payload di un JWT senza verificarne la firma (la verifica la fa il backend). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/** true se il token del backend è scaduto (o sta per scadere). Un token senza `exp` leggibile non è considerato scaduto. */
export function isBackendTokenExpired(token: string, now: number = Date.now()): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== 'number') return false;
  return now >= exp * 1000 - EXPIRY_MARGIN_MS;
}
