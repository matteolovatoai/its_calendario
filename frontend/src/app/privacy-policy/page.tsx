import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informativa sulla Privacy | ITS Calendario",
  description: "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR).",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna al Calendario
            </Button>
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Informativa sulla Privacy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Titolare del Trattamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            La presente informativa descrive le modalità di trattamento dei dati personali raccolti attraverso
            l&apos;applicazione <strong>ITS Calendario</strong>, destinata alla consultazione e gestione dell&apos;orario delle lezioni.
            Il trattamento è svolto nel rispetto del Regolamento Europeo (UE) 2016/679 (GDPR) e della normativa nazionale vigente.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Per qualsiasi chiarimento o richiesta relativa al trattamento dei dati personali, è possibile contattare il titolare all&apos;indirizzo email:{" "}
            <a
              href="mailto:matteolovatoai@gmail.com"
              className="text-primary underline font-medium hover:opacity-80"
            >
              matteolovatoai@gmail.com
            </a>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Dati Personali Raccolti</h2>
          <p className="text-muted-foreground leading-relaxed">
            L&apos;applicazione raccoglie e tratta unicamente i dati strettamente necessari all&apos;erogazione del servizio (principio di minimizzazione):
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong>Utenti non autenticati (Visitatori):</strong> Nessun dato personale identificativo viene raccolto. 
              Ai fini di tutela della privacy (GDPR), per gli utenti anonimi i nominativi dei docenti e le informazioni sensibili delle lezioni non vengono mostrati.
            </li>
            <li>
              <strong>Utenti autenticati (Studenti e Personale scolastico):</strong> L&apos;accesso avviene tramite Single Sign-On 
              con <em>Google Workspace</em> istituzionale (domini <code>@allievi.itsdigitalacademy.com</code> o <code>@itsdigitalacademy.com</code>). 
              I dati acquisiti da Google sono limitati a:
              <ul className="list-circle pl-5 mt-1 space-y-1">
                <li>Nome e cognome</li>
                <li>Indirizzo email istituzionale</li>
                <li>Immagine del profilo (se presente su Google Workspace)</li>
              </ul>
              <strong>Nessuna password o credenziale personale viene memorizzata</strong> nei nostri database o server.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Finalità e Base Giuridica del Trattamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            I dati personali sono trattati esclusivamente per:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Consentire l&apos;accesso sicuro e autenticato al calendario scolastico.</li>
            <li>Distinguere i ruoli di accesso (consultazione protetta per gli studenti, gestione e modifica lezioni per la segreteria autorizzata).</li>
            <li>Garantire il corretto funzionamento tecnico e la sicurezza del servizio.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            La base giuridica del trattamento è costituita dall&apos;esecuzione dei compiti connessi all&apos;attività didattica e formativa 
            e dal legittimo interesse alla gestione organizzativa interna.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Cookie e Tecnologie di Tracciamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            L&apos;applicazione <strong>non utilizza cookie di profilazione o di terze parti a fini pubblicitari</strong>. 
            Vengono utilizzati esclusivamente cookie tecnici necessari a mantenere attiva la sessione dell&apos;utente autenticato durante la navigazione.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Conservazione dei Dati</h2>
          <p className="text-muted-foreground leading-relaxed">
            I dati di autorizzazione (email per l&apos;elenco degli amministratori) sono conservati esclusivamente per la durata del servizio.
            I token di sessione scadono automaticamente e non vengono conservati storici di navigazione personale.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Diritti dell&apos;Interessato</h2>
          <p className="text-muted-foreground leading-relaxed">
            In ogni momento, gli utenti possono esercitare i diritti previsti dagli articoli 15 e seguenti del GDPR (accesso, rettifica, 
            cancellazione, limitazione del trattamento o opposizione) inviando una comunicazione via email a:{" "}
            <a
              href="mailto:matteolovatoai@gmail.com"
              className="text-primary underline font-medium hover:opacity-80"
            >
              matteolovatoai@gmail.com
            </a>.
          </p>
        </section>

        <div className="pt-6 border-t border-border">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna al Calendario
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
