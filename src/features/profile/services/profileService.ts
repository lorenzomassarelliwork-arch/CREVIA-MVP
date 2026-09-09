import type { UserProfile } from '../../../domain/models';
import { CURRENT_USER_ID } from '../../../core/session';
import { supabase } from '../../../lib/supabase';

const now = '2026-09-01T09:00:00.000Z';

let profiles: UserProfile[] = [
  {
    id: CURRENT_USER_ID,
    firstName: 'Builder',
    lastName: 'Crevia',
    avatarUrl: null,
    city: null,
    bio: null,
    headline: 'Builder',
    skills: [],
    availability: null,
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

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  headline: string | null;
  skills: string[] | null;
  availability: string | null;
  created_at: string;
  updated_at: string;
};

function mapProfileRow(row: ProfileRow, id: string = row.id): UserProfile {
  return {
    id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    city: row.city,
    bio: row.bio,
    headline: row.headline,
    skills: row.skills ?? [],
    availability: row.availability,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function cacheCurrentProfile(profile: UserProfile) {
  profiles = profiles.map((item) =>
    item.id === CURRENT_USER_ID ? { ...profile, id: CURRENT_USER_ID } : item
  );
}

export function getProfileSnapshot(userId: string): UserProfile | null {
  return profiles.find((profile) => profile.id === userId) ?? null;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (userId === CURRENT_USER_ID) {
    const authUserId = await getAuthenticatedUserId();
    if (!authUserId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUserId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const profile = mapProfileRow(data as ProfileRow, CURRENT_USER_ID);
    cacheCurrentProfile(profile);
    return profile;
  }

  const seeded = getProfileSnapshot(userId);
  if (seeded) return seeded;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapProfileRow(data as ProfileRow) : null;
}

export async function listProfiles(): Promise<UserProfile[]> {
  return [...profiles];
}

export async function updateCurrentProfile(
  input: UpdateProfileInput
): Promise<UserProfile> {
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

  const authUserId = await getAuthenticatedUserId();
  if (!authUserId) throw new Error('Sessione utente non disponibile.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      headline,
      city,
      bio,
      availability,
      skills,
      avatar_url: avatarUrl,
    })
    .eq('id', authUserId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const updated = mapProfileRow(data as ProfileRow, CURRENT_USER_ID);
  cacheCurrentProfile(updated);
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
