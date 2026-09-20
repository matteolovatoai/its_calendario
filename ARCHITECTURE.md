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

**Contesto MVP (v1.0):** Il sistema gestisce il calendario di **una singola classe**. 

Per minimizzare la probabilità di inconsistenze, il modello implementa la normalizzazione delle entità (già presente in `models.py`). 

**Tabelle Anagrafiche:**
* `teachers` (id, name)
* `rooms` (id, name)
* `subjects` (id, name)
* `users` (id, username, password_hash, role)

**Tabella Principale: `lessons`**
| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | UUID / Integer (PK) | Identificativo univoco |
| `start_time` | Timestamp (UTC) | Data e ora di inizio |
| `end_time` | Timestamp (UTC) | Data e ora di fine |
| `subject_id` | UUID (FK) | Riferimento alla materia |
| `teacher_id` | UUID (FK) | Riferimento al docente |
| `room_id` | UUID (FK) | Riferimento all'aula |

> **Evoluzione prevista per la v2.0:** 
> 1. Supporto a classi multiple (aggiunta di `class_id`).
> 2. Creazione di un pannello Admin frontend dedicato per la gestione CRUD delle anagrafiche. Nella v1.0, le entità vengono create dinamicamente ("just-in-time") dal frontend durante l'inserimento della lezione.

---

## API Endpoints (FastAPI)

Tutti gli endpoint (eccetto GET /lessons e POST /token) sono protetti da autenticazione (richiedono header `Authorization: Bearer <token>`). Il token JWT include un claim `role`.
L'API pubblica è protetta da un rate limiter di base per prevenire abusi.

1. **Autenticazione**
   * `POST /api/token` -> Riceve username/password, restituisce token JWT.
2. **Lezioni**
   * `GET /api/lessons` -> Restituisce le lezioni. **Richiede** parametri query `start_date` e `end_date`.
   * `POST /api/lessons` -> Crea una lezione. Include logica anti-sovrapposizione **globale** (essendo v1.0 per classe singola). *Protetto.*
   * `PUT /api/lessons/{id}` -> Modifica lezione (con anti-sovrapposizione). *Protetto.*
   * `DELETE /api/lessons/{id}` -> Elimina lezione. *Protetto.*
3. **Anagrafiche (Accesso Protetto)**
   * `GET / POST /api/teachers`, `rooms`, `subjects` -> API già implementate. Il frontend (tramite combobox intelligenti) invoca la POST per creare nuove voci "on the fly" se non esistono, rimandando la necessità di un pannello amministrativo dedicato alla v2.0.

## Design Pattern del Calendario (Frontend)
Il frontend mostrerà una griglia CSS Grid, sfruttando idealmente i React Server Components per il fetch iniziale e abbattere il tempo di caricamento.
* **Asse X (Colonne)**: 5 giorni (Lunedì - Venerdì).
* **Asse Y (Righe)**: Orari dalle 08:00 alle 18:00. Il sistema utilizzerà slot **logici** da 15 minuti per posizionare le lezioni in modo preciso. Visivamente, le righe divisorie appariranno **solo ad ogni ora piena** (08:00, 09:00, ecc.). L'ingombro verticale totale del calendario rimarrà invariato (non si allungherà rispetto alla versione a slot orari).
* **Posizionamento**: Le lezioni vengono posizionate sulla griglia calcolando la loro durata e orario di inizio usando le proprietà `grid-row-start` e `grid-row-end` di CSS.
* **Timezones**: Il frontend si assicurerà di formattare e renderizzare gli orari UTC (forniti dal backend) nel corretto fuso orario locale (es. Europe/Rome).
