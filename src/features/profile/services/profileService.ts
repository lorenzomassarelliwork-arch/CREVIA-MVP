import type { UserProfile } from '../../../domain/models';
import { CURRENT_USER_ID } from '../../../core/session';

const now = '2026-09-01T09:00:00.000Z';

let profiles: UserProfile[] = [
  {
    id: CURRENT_USER_ID,
    firstName: 'Lorenzo',
    lastName: 'Massarelli',
    avatarUrl: null,
    city: 'Milano',
    bio: 'Builder interessato a prodotti digitali, tecnologia e progetti concreti.',
    headline: 'Builder',
    skills: ['TypeScript', 'React Native'],
    availability: '5-8 ore/settimana',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'builder-1',
    firstName: 'Giulia',
    lastName: 'Bianchi',
    avatarUrl: null,
    city: 'Milano',
    bio: 'UI/UX designer interessata a prodotti digitali ad impatto.',
    headline: 'UI/UX Designer',
    skills: ['Figma', 'UI Design', 'UX Research'],
    availability: '5 ore/settimana',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z',
  },
  {
    id: 'builder-2',
    firstName: 'Marco',
    lastName: 'Riva',
    avatarUrl: null,
    city: 'Milano',
    bio: 'Frontend developer focalizzato su esperienze web e mobile semplici e veloci.',
    headline: 'Frontend Developer',
    skills: ['React', 'TypeScript', 'React Native'],
    availability: '4 ore/settimana',
    createdAt: '2026-08-18T09:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
  },
  {
    id: 'builder-3',
    firstName: 'Sara',
    lastName: 'Conti',
    avatarUrl: null,
    city: 'Milano',
    bio: 'Digital marketer interessata a validazione, community e crescita di prodotti early stage.',
    headline: 'Digital Marketing',
    skills: ['Marketing', 'Content', 'Social Media'],
    availability: '6 ore/settimana',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z',
  },
];

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  headline: string;
  city: string;
  bio: string;
  availability: string;
  skills: string[];
  avatarUrl?: string | null;
};

export function getProfileSnapshot(userId: string): UserProfile | null {
  return profiles.find((profile) => profile.id === userId) ?? null;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  return getProfileSnapshot(userId);
}

export async function listProfiles(): Promise<UserProfile[]> {
  return [...profiles];
}

export async function updateCurrentProfile(
  input: UpdateProfileInput
): Promise<UserProfile> {
  const current = getProfileSnapshot(CURRENT_USER_ID);
  if (!current) throw new Error('Profilo non trovato.');

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const headline = input.headline.trim();
  const city = input.city.trim();
  const bio = input.bio.trim();
  const availability = input.availability.trim();
  const skills = Array.from(
    new Set(input.skills.map((skill) => skill.trim()).filter(Boolean))
  );

  if (firstName.length < 2 || lastName.length < 2) {
    throw new Error('Nome e cognome devono contenere almeno 2 caratteri.');
  }
  if (headline.length < 2) {
    throw new Error('Indica il tuo ruolo o una breve headline.');
  }
  if (city.length < 2) {
    throw new Error('Indica la tua città.');
  }
  if (bio.length < 10) {
    throw new Error('La bio deve contenere almeno 10 caratteri.');
  }
  if (availability.length < 2) {
    throw new Error('Indica la tua disponibilità.');
  }
  if (skills.length === 0) {
    throw new Error('Aggiungi almeno una competenza.');
  }

  const avatarUrl = input.avatarUrl?.trim() || null;
  if (
    avatarUrl &&
    !avatarUrl.toLowerCase().startsWith('https://') &&
    !avatarUrl.toLowerCase().startsWith('http://')
  ) {
    throw new Error('L’URL dell’avatar deve iniziare con http:// o https://.');
  }

  const updated: UserProfile = {
    ...current,
    firstName,
    lastName,
    headline,
    city,
    bio,
    availability,
    skills,
    avatarUrl,
    updatedAt: new Date().toISOString(),
  };

  profiles = profiles.map((profile) =>
    profile.id === CURRENT_USER_ID ? updated : profile
  );

  return updated;
}

export function getProfileDisplayName(profile: UserProfile): string {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

export function getProfileInitials(profile: UserProfile): string {
  return [profile.firstName, profile.lastName]
    .map((part) => part.trim().charAt(0))
    .join('')
    .toUpperCase();
}
