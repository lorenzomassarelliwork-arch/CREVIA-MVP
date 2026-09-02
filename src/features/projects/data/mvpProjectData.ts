import type { Project, ProjectRole } from '../../../domain/models';

export const MVP_PROJECTS: Project[] = [
  {
    id: 'project-1', ownerId: 'current-user', title: 'GreenTrack',
    description: 'Una piattaforma per aiutare le persone a monitorare e ridurre il proprio impatto ambientale.',
    goal: 'Realizzare un prototipo mobile funzionante e validarlo con un primo gruppo di utenti.',
    deliverable: 'Prototipo mobile navigabile con i principali flussi.', category: 'Tech', coverUrl: null,
    type: 'startup', locationMode: 'hybrid', city: 'Milano', expectedDuration: '3 mesi', weeklyCommitmentHours: 5,
    compensationType: 'unpaid', compensationNotes: 'Collaborazione non retribuita nella fase MVP del progetto.',
    status: 'recruiting', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'project-2', ownerId: 'user-founder-2', title: 'UniConnect',
    description: 'Un progetto pensato per connettere studenti con competenze complementari e idee da sviluppare insieme.',
    goal: 'Creare una prima esperienza di matching tra studenti di facoltà diverse.',
    deliverable: 'MVP mobile con onboarding, profili e matching base.', category: 'Education', coverUrl: null,
    type: 'university', locationMode: 'onsite', city: 'Milano', expectedDuration: '2 mesi', weeklyCommitmentHours: 4,
    compensationType: 'unpaid', compensationNotes: 'Progetto collaborativo universitario non retribuito.',
    status: 'recruiting', createdAt: '2026-09-01T11:00:00.000Z', updatedAt: '2026-09-01T11:00:00.000Z',
  },
  {
    id: 'project-3', ownerId: 'user-founder-3', title: 'LocalUp',
    description: 'Strumenti digitali semplici per dare maggiore visibilità alle attività indipendenti di quartiere.',
    goal: 'Costruire un prototipo web e testarlo con attività locali di Milano.',
    deliverable: 'Landing e dashboard prototipale validate con almeno 5 attività.', category: 'Startup', coverUrl: null,
    type: 'startup', locationMode: 'hybrid', city: 'Milano', expectedDuration: '10 settimane', weeklyCommitmentHours: 6,
    compensationType: 'paid_to_agree', compensationNotes: 'Eventuale compenso da concordare direttamente tra le parti. Crevia non gestisce pagamenti.',
    status: 'recruiting', createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-09-01T12:00:00.000Z',
  },
];

export const MVP_PROJECT_ROLES: ProjectRole[] = [
  { id: 'role-1', projectId: 'project-1', title: 'Frontend Developer', description: 'Sviluppo delle schermate principali e integrazione con le API del progetto.', requiredSkills: ['React Native', 'TypeScript'], seats: 2, createdAt: '2026-09-01T10:00:00.000Z' },
  { id: 'role-2', projectId: 'project-1', title: 'UI Designer', description: 'Definizione dei flussi e rifinitura dell’interfaccia del prototipo.', requiredSkills: ['Figma', 'UI Design'], seats: 1, createdAt: '2026-09-01T10:00:00.000Z' },
  { id: 'role-3', projectId: 'project-2', title: 'Mobile Developer', description: 'Sviluppo del prototipo mobile per il matching tra studenti.', requiredSkills: ['React Native'], seats: 1, createdAt: '2026-09-01T11:00:00.000Z' },
  { id: 'role-4', projectId: 'project-2', title: 'Marketing', description: 'Test del posizionamento e acquisizione dei primi utenti universitari.', requiredSkills: ['Marketing', 'Social Media'], seats: 1, createdAt: '2026-09-01T11:00:00.000Z' },
  { id: 'role-5', projectId: 'project-3', title: 'UX Designer', description: 'Ricerca con le attività locali e progettazione dei principali flussi utente.', requiredSkills: ['UX Research', 'Figma'], seats: 1, createdAt: '2026-09-01T12:00:00.000Z' },
  { id: 'role-6', projectId: 'project-3', title: 'Backend Developer', description: 'Definizione delle API e del modello dati del prototipo.', requiredSkills: ['Node.js', 'PostgreSQL'], seats: 1, createdAt: '2026-09-01T12:00:00.000Z' },
];
