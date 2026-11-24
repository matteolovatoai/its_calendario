# Architettura del Sistema: Calendario Lezioni

## Principi Fondamentali
1. **YAGNI (You Aren't Gonna Need It)**: Nessuna feature, tabella o endpoint è stato inserito se non strettamente necessario per il primo rilascio (MVP).
2. **Strict AGILE**: Sviluppo iterativo. Il primo rilascio si concentra unicamente sul far vedere un calendario e permettere a un amministratore di gestirlo.
3. **Zero Bloat & No Copyleft**: Utilizzo minimo di librerie esterne. Tutte le dipendenze devono avere licenze permissive (MIT, Apache 2.0, BSD). Nessuna licenza GPL/AGPL.

## Stack Tecnologico

### Backend (Python)
* **Framework**: FastAPI (Licenza MIT) - Veloce, type-safe, auto-documentato.
* **Configurazione**: `pydantic-settings` (Licenza MIT) - Gestione tipizzata delle variabili d'ambiente.
* **Database ORM & Migrations**: `SQLAlchemy` (ORM) + `Alembic` (Migrazioni) + `psycopg` (Licenze MIT).
* **Database Engine**: PostgreSQL hostato su **Neon** (Serverless, scalabile).
  * *Flusso di Sviluppo (Database as Code)*: Sfruttiamo la funzionalità "Copy-on-Write" di Neon per creare **Branch** isolati del database di produzione (es. per dev/test). Lo sviluppo e la generazione delle migrazioni avvengono sul branch tramite Alembic (`alembic revision --autogenerate`). L'obiettivo (vedi AGENTS.md) è che la pipeline esegua `alembic upgrade head` sul DB di produzione durante il deploy. **Stato attuale:** questo passo non è ancora configurato (`backend/vercel.json` pubblica solo il codice), quindi finché non viene automatizzato la migrazione va eseguita a mano sul DB di produzione (connessione diretta, non pooler), **prima** del merge su `main`, dopo averla provata su un branch Neon copia della produzione e verificato con `alembic current` la revisione attesa.
* **Autenticazione**: Delegata a **Google OAuth / NextAuth** sul frontend. Il backend riceve e valida il JWT, verificando il dominio dell'email e i ruoli nel DB (RBAC). Nessuna gestione locale delle password.

### Frontend (TypeScript / React)
* **Framework**: Next.js (App Router) (Licenza MIT).
* **Autenticazione**: Auth.js / NextAuth (Provider Google Workspace).
* **Styling**: Tailwind CSS (Licenza MIT).
* **Componenti UI**: shadcn/ui (Licenza MIT) - Componenti copiati localmente. Griglia CSS nativa per il calendario (nessuna libreria esterna pesante).
* **Data Fetching**: Fetch API nativa di Next.js o SWR/React Query.

---

## Modello Dati (Database Schema)

**Contesto:** Il sistema gestisce il calendario di **più classi**. Ogni lezione appartiene a **una sola classe** (una lezione comune a più classi si inserisce una volta per classe).

**Tabelle Anagrafiche:**
* `teachers` (id, name)
* `rooms` (id, name)
* `subjects` (id, name)
* `school_classes` (id, name) - Classi (es. `lambda`). Come le altre anagrafiche, il nome è salvato in minuscolo.
* `users` (id, email, role) - **Whitelist Amministratori**: Contiene solo le email del personale autorizzato a modificare il calendario (nessuna password).

**Tabella Principale: `lessons`**
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | UUID / Integer (PK) | Identificativo univoco |
| `start_time` | Timestamp (UTC) | Data e ora di inizio |
| `end_time` | Timestamp (UTC) | Data e ora di fine |
| `subject_id` | UUID (FK) | Riferimento alla materia |
| `teacher_id` | UUID (FK) | Riferimento al docente |
| `room_id` | UUID (FK) | Riferimento all'aula |
| `class_id` | UUID (FK, obbligatorio, `ON DELETE RESTRICT`) | Riferimento alla classe |

**Regola anti-sovrapposizione:** una lezione non può essere salvata se, nello stesso intervallo, la **stessa classe**, la **stessa aula** o lo **stesso docente** sono già impegnati. Classi diverse possono avere lezioni in contemporanea con aule e docenti diversi. Lezioni adiacenti (fine = inizio) sono consentite.

> **Evoluzione prevista:** 
> 1. Creazione di un pannello Admin frontend dedicato per la gestione CRUD delle anagrafiche.

---

## API Endpoints (FastAPI)

Le API implementano un controllo degli accessi basato sui ruoli (RBAC) e logiche di anonimizzazione dei dati (GDPR).

1. **Autenticazione**
   * `POST /api/auth/google` -> Riceve il token di Google, controlla i domini/DB e restituisce il JWT interno (con ruolo `student` o `admin`).
2. **Lezioni**
   * `GET /api/lessons?start_date=...&end_date=...[&class_id=...]` -> Restituisce le lezioni nell'intervallo temporale (filtri `start_date` e `end_date` obbligatori; `class_id` facoltativo, senza di esso restituisce le lezioni di tutte le classi). **Endpoint ibrido**: Se chiamato senza token, oscura i dati sensibili (GDPR). Se chiamato con token valido, restituisce l'anagrafica completa.
   * `POST /api/lessons` -> Crea una lezione (`class_id` obbligatorio, regola anti-sovrapposizione per classe/aula/docente). *Protetto (solo admin).*
   * `PUT /api/lessons/{id}` -> Modifica lezione. *Protetto (solo admin).*
   * `DELETE /api/lessons/{id}` -> Elimina lezione. *Protetto (solo admin).*
3. **Anagrafiche**
   * `GET / POST /api/teachers`, `rooms`, `subjects` -> Gestite dal frontend tramite combobox per la creazione "on the fly". Le rotte POST sono protette (`admin`).
   * `GET /api/classes` -> **Pubblico** (serve anche ai visitatori anonimi per scegliere la classe). `POST` / `DELETE /api/classes/{id}` -> *Protetti (solo admin)*; una classe con lezioni non può essere eliminata.

## Design Pattern del Calendario (Frontend)
Il frontend mostrerà una griglia CSS Grid:
* **Asse X (Colonne)**: 5 giorni (Lunedì - Venerdì).
* **Asse Y (Righe)**: Orari dalle 08:00 alle 18:00 (slot logici da 15 minuti, linee visive orarie).
* **Posizionamento**: Calcolato tramite le proprietà `grid-row-start` e `grid-row-end` di CSS.
* **Selezione classe**: Selettore nella barra della settimana, salvato nell'URL (`/?week=YYYY-MM-DD&classe=<id>`) così il link è condivisibile. Se `classe` manca o non è valida si usa la prima classe in ordine alfabetico.
* **Timezones**: Rendering degli orari UTC formattati per il fuso locale (`Europe/Rome`).
* **Mobile UX**: Gli eventi mostrano il testo troncato su due righe per massimizzare la leggibilità. Il click sull'evento apre un modale in sola lettura per gli utenti privi di poteri di modifica.
