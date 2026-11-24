// Preferenza della classe selezionata: cookie tecnico di funzionalità, letto dal server
// (page.tsx) così la pagina viene disegnata subito con la classe giusta.

export const CLASS_COOKIE_NAME = 'calendario_classe';
export const CLASS_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 anno

/** Vecchia chiave localStorage (usata brevemente prima del cookie): va rimossa dai browser. */
const LEGACY_STORAGE_KEY = 'calendario:classe';

/**
 * Classe da mostrare: quella del link (?classe=) se esiste, altrimenti quella salvata
 * nel cookie se esiste ancora, altrimenti la prima in ordine alfabetico.
 */
export function pickSelectedClassId(
  classIds: string[],
  fromUrl?: string | null,
  fromCookie?: string | null
): string | null {
  if (fromUrl && classIds.includes(fromUrl)) return fromUrl;
  if (fromCookie && classIds.includes(fromCookie)) return fromCookie;
  return classIds[0] ?? null;
}

/** Salva la classe scelta (solo lato browser). */
export function saveClassPreference(classId: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${CLASS_COOKIE_NAME}=${encodeURIComponent(classId)}; Path=/; ` +
    `Max-Age=${CLASS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Rimuove la vecchia preferenza in localStorage, se presente (solo lato browser). */
export function removeLegacyClassPreference() {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // storage non disponibile: niente da rimuovere
  }
}
