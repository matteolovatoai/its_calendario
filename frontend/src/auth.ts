import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
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

          return res.ok;
        } catch {
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
            try {
              const base64Url = data.access_token.split(".")[1];
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              const payload = JSON.parse(
                Buffer.from(base64, "base64").toString("utf-8")
              );
              token.role = payload.role;
            } catch (e) {
              console.error("Errore nel decodificare il token backend", e);
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
