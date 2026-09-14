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
* **Database Engine**: PostgreSQL hostato su **Neon** (Serverless, scalabile, facile migrazione locale).
* **Autenticazione**: `PyJWT` (Licenza MIT) e `passlib` (con `bcrypt`) per JWT e hashing password. Autenticazione basata su tabella `users` nel database (con un utente base di amministrazione pre-inserito).

### Frontend (TypeScript / React)
* **Framework**: Next.js (App Router) (Licenza MIT).
* **Styling**: Tailwind CSS (Licenza MIT).
* **Componenti UI**: shadcn/ui (Licenza MIT) - Componenti copiati localmente, nessuna dipendenza pesante aggiunta. Non useremo librerie di calendari esterne pesanti (es. react-big-calendar), ma una semplice griglia CSS (CSS Grid).
* **Data Fetching**: Fetch API nativa di Next.js o SWR/React Query se strettamente necessario.

---

## Modello Dati (Database Schema)

Per minimizzare la complessità ci sono le tabelle essenziali per gestire lezioni, anagrafiche e utenti.

**Tabella: `lessons`**
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | UUID / Integer (PK) | Identificativo univoco |
| `start_time` | Timestamp (UTC) | Data e ora di inizio (es. 2023-10-23T08:00:00Z) |
| `end_time` | Timestamp (UTC) | Data e ora di fine (es. 2023-10-23T10:00:00Z) |
| `subject` | String | Materia (es. "Analisi Matematica") |
| `teacher` | String | Nome del docente |
| `room` | String | Aula (es. "Aula Magna") |

---

## API Endpoints (FastAPI)

Tutti gli endpoint (eccetto GET /lessons e POST /token) sono protetti da autenticazione (richiedono header `Authorization: Bearer <token>`).

1. **Autenticazione**
   * `POST /api/token` -> Riceve username/password, restituisce token JWT.
2. **Lezioni**
   * `GET /api/lessons` -> Restituisce tutte le lezioni (opzionalmente filtrate per range di date). *Pubblico.*
   * `POST /api/lessons` -> Crea una nuova lezione. *Protetto.*
   * `PUT /api/lessons/{id}` -> Modifica una lezione esistente. *Protetto.*
   * `DELETE /api/lessons/{id}` -> Elimina una lezione. *Protetto.*

## Design Pattern del Calendario (Frontend)
Il frontend mostrerà una griglia statica CSS Grid.
* **Asse X (Colonne)**: 5 giorni (Lunedì - Venerdì).
* **Asse Y (Righe)**: Orari dalle 08:00 alle 18:00 (divisi in slot da 1 ora).
* **Posizionamento**: Le lezioni vengono posizionate sulla griglia calcolando la loro durata e orario di inizio usando le proprietà `grid-row-start` e `grid-row-end` di CSS, senza pesanti librerie esterne.
