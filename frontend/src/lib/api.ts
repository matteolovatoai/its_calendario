import { getSession } from 'next-auth/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Errore HTTP dell'API; `detail` è il messaggio leggibile restituito da FastAPI, se presente. */
export class ApiError extends Error {
  constructor(
    public status: number,
    statusText: string,
    public detail: string | null
  ) {
    super(`API error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let token: string | null = null;

  if (typeof window !== 'undefined') {
    const session = await getSession();
    token =
      (session as unknown as { accessToken?: string })?.accessToken ||
      localStorage.getItem('token') ||
      null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail: string | null = null;
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      // corpo non JSON: nessun dettaglio
    }
    throw new ApiError(response.status, response.statusText, detail);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
