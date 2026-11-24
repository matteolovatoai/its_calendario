import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { decodeJwtPayload, isBackendTokenExpired } from "@/lib/backendToken";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 60 * 60, // 60 giorni
    updateAge: 24 * 60 * 60, // rinnovo token ogni 24 ore
  },
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "google" && account.id_token) {
        try {
          const apiUrl =
            process.env.INTERNAL_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://127.0.0.1:8000";

          const res = await fetch(`${apiUrl}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: account.id_token }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(
              `[NextAuth signIn] Backend rifiutato: status=${res.status}, body=${errText}`
            );
            return false;
          }
          return true;
        } catch (err) {
          console.error("[NextAuth signIn] Eccezione chiamata backend:", err);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      // Al primo login con Google, scambia il token con il backend
      if (account?.id_token) {
        try {
          const apiUrl =
            process.env.INTERNAL_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://127.0.0.1:8000";

          const res = await fetch(`${apiUrl}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: account.id_token }),
          });

          if (res.ok) {
            const data = await res.json();
            token.accessToken = data.access_token;
            const payload = decodeJwtPayload(data.access_token);
            if (payload) {
              token.role = payload.role;
            } else {
              console.error("Errore nel decodificare il token backend");
            }
          } else {
            console.error(
              "Errore dal backend /api/auth/google:",
              res.status,
              await res.text()
            );
          }
        } catch (error) {
          console.error("Richiesta di scambio token al backend fallita:", error);
        }
      }
      // La sessione NextAuth si rinnova da sola, il token del backend no: se è scaduto
      // chiudiamo la sessione, così l'utente rifà il login invece di trovarsi
      // "loggato" ma con tutte le chiamate al backend rifiutate (401).
      if (
        typeof token.accessToken === "string" &&
        isBackendTokenExpired(token.accessToken)
      ) {
        return null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as unknown as { accessToken?: string }).accessToken =
          token.accessToken as string;
        if (session.user) {
          (session.user as unknown as { role?: string }).role =
            token.role as string;
        }
      }
      return session;
    },
  },
});
