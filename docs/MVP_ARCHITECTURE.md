# CREVIA MVP — Architettura

## Obiettivo
Validare il flusso reale:

`Project → Role → Application → Member → Completion → Verified Experience`

## Vincoli
- Expo SDK 54.
- TypeScript/TSX per il codice applicativo.
- L'identità visiva della repository CREVIA originale viene mantenuta.
- Nessun redesign durante la migrazione MVP.
- La repository CREVIA originale non viene modificata.
- Supabase sarà introdotto dietro interfacce repository, evitando dipendenze dirette del frontend dal provider.

## Moduli MVP
1. Auth
2. Profile
3. Projects
4. Project Roles
5. Applications
6. Project Members
7. Basic Chat
8. Completion
9. Verified Experience
10. Operational Notifications
11. Reports/Blocking essenziali

## Esclusi dalla prima validazione
- Feed social generico
- Stories
- Social graph avanzato
- Premium/pagamenti
- Recruiter portal
- University dashboard
- AI matching
- Project management avanzato
- Gamification avanzata

## Struttura prevista

```text
src/
  domain/            # modelli e contratti indipendenti dal backend
  infrastructure/    # Supabase e implementazioni concrete
  features/
    auth/
    profile/
    projects/
    applications/
    chat/
    notifications/
  navigation/
  theme/
  i18n/
```

## Regola architetturale
Le schermate e gli hook non devono contenere query Supabase dirette. La UI usa servizi/use-case; i servizi dipendono da contratti in `src/domain`; Supabase viene implementato in `src/infrastructure`.

In questo modo il frontend rimane testabile e il backend può essere sostituito o simulato senza riscrivere le schermate.
