# Attori del Sistema e Permessi (AGENTS)

Questo documento definisce i ruoli (Actors/Agents) previsti all'interno del sistema Calendario. In ottica YAGNI per l'MVP, il sistema di permessi è binario: non autenticato vs autenticato.

## 1. Studente (Utente Non Autenticato)
Rappresenta l'utente finale primario che consulta il calendario. Non ha alcun account nel sistema.

**Permessi / Capacità:**
* Visualizzare la griglia del calendario settimanale.
* Cliccare su una lezione per leggerne i dettagli completi (Materia, Docente, Aula, Orario).
* Navigare tra le settimane (Avanti/Indietro).
* **Accesso API:** Solo endpoint GET.

## 2. Segreteria / Admin (Utente Autenticato)
Rappresenta l'operatore che gestisce l'inserimento dei dati.

**Implementazione:**
Le credenziali di "Segreteria" (e dei futuri account admin) risiedono in una tabella `users` del database. L'utente storico "segreteria" è di base nel sistema e non può essere rimosso, garantendo un accesso garantito.

**Permessi / Capacità:**
* Tutte le capacità dello Studente.
* Effettuare il login (ricevendo un JWT).
* Cliccare "+ Aggiungi Lezione" per inserire un nuovo blocco.
* Cliccare su una lezione esistente per aprire il modale in modalità modifica.
* Salvare o eliminare una lezione.
* **Accesso API:** Accesso completo agli endpoint POST, PUT, DELETE.

---

## 3. Future System Agents (Backlog Architetturale)
Idee per agenti automatizzati o ruoli futuri (Da NON sviluppare ora).

* **Parser Excel (Worker Agent)**: Un servizio di background (es. uno script Python triggerato manualmente) che carica il file Excel malformato della scuola, ne normalizza i dati ed effettua chiamate POST alle API per popolare massivamente il calendario.
* **Docente (Ruolo Parziale)**: In futuro si potrebbe creare un ruolo che può modificare *solo* le proprie lezioni. Attualmente scartato (YAGNI).
