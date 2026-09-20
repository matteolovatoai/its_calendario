# Attori del Sistema e Permessi (AGENTS)

Questo documento definisce i ruoli (Actors/Agents) previsti all'interno del sistema Calendario. In ottica YAGNI e GDPR, il sistema di permessi divide l'accesso in visualizzazione anonima, visualizzazione protetta e gestione.

## 1. Visitatore Anonimo (Non Autenticato)
Rappresenta un utente che naviga sul calendario senza effettuare il login.

**Permessi / Capacità:**
* Visualizzare la griglia del calendario settimanale.
* Cliccare su una lezione per leggerne i dettagli di base (Materia, Aula, Orario).
* Navigare tra le settimane (Avanti/Indietro).
* **Accesso API:** Solo endpoint GET. L'API maschera i dati sensibili (es. nome del docente) restituendoli nulli o oscurati in ottemperanza al GDPR.

## 2. Studente (Utente Autenticato - Sola Lettura)
Rappresenta uno studente che effettua il login tramite l'account Google Workspace della scuola (dominio `@allievi.scuola.com`).

**Permessi / Capacità:**
* Tutte le capacità del Visitatore Anonimo.
* **Visualizzazione Completa:** Essendo parte del perimetro scolastico, vede in chiaro anche i dati sensibili (nome del docente).
* **Nessun potere di modifica.**
* **Accesso API:** Solo endpoint GET completi.

## 3. Segreteria / Admin (Utente Autenticato - Lettura/Scrittura)
Rappresenta l'operatore che gestisce l'inserimento dei dati (dominio `@scuola.com`).

**Implementazione:**
Le autorizzazioni di "Segreteria" risiedono in una tabella `users` del database (Whitelist). Quando un utente del dominio corretto effettua il login con Google OAuth, il backend verifica la presenza della sua email nel database per concedere i privilegi di amministratore.

**Permessi / Capacità:**
* Tutte le capacità dello Studente.
* Cliccare "+ Aggiungi Lezione" per inserire un nuovo blocco.
* Creare "on the fly" nuove anagrafiche (Docenti, Aule, Materie).
* Cliccare su una lezione esistente per aprire il modale in modalità modifica.
* Salvare o eliminare una lezione.
* **Accesso API:** Accesso completo agli endpoint POST, PUT, DELETE.

---

## 4. Future System Agents (Backlog Architetturale)
Idee per agenti automatizzati o ruoli futuri (Da NON sviluppare ora).

* **Parser Excel (Worker Agent)**: Un servizio di background che carica il file Excel della scuola, ne normalizza i dati ed effettua chiamate POST per popolare massivamente il calendario.
* **Docente (Ruolo Parziale)**: In futuro si potrebbe creare un ruolo intermedio (es. per chi ha `@scuola.com` ma non è admin) che può modificare *solo* le proprie lezioni. Attualmente scartato (YAGNI).
