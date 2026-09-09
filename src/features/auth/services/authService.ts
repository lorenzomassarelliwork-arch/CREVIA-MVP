import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

function normalizeAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Email o password non corretti.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Conferma prima il tuo indirizzo email.';
  }
  if (lower.includes('user already registered')) {
    return 'Esiste già un account con questa email.';
  }
  if (lower.includes('password should be at least')) {
    return 'La password non rispetta i requisiti minimi.';
  }
  if (lower.includes('rate limit')) {
    return 'Troppi tentativi. Riprova tra qualche minuto.';
  }

  return message;
}

export async function handleUserLogin(
  email: string,
  password: string
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw new Error(normalizeAuthError(error.message));
  if (!data.session) throw new Error('Sessione non disponibile.');

  return data.session;
}

export async function registerUser(
  input: RegisterInput
): Promise<{ requiresEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: 'crevia://auth/callback',
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
      },
    },
  });

  if (error) throw new Error(normalizeAuthError(error.message));

  return {
    requiresEmailConfirmation: !data.session,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: 'crevia://auth/callback' }
  );

  if (error) throw new Error(normalizeAuthError(error.message));
}

export async function logoutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(normalizeAuthError(error.message));
}
