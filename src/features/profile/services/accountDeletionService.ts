import { supabase } from '../../../lib/supabase';

export async function deleteCurrentAccount(password: string): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    throw new Error('Sessione utente non disponibile.');
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (reauthError) {
    throw new Error('Password non corretta.');
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });

  if (error) {
    throw new Error(
      'Non è stato possibile eliminare l’account. Riprova tra poco.'
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.retryable
        ? 'L’account è stato preparato per l’eliminazione, ma la chiusura non è stata completata. Riprova.'
        : 'Non è stato possibile eliminare l’account.'
    );
  }

  await supabase.auth.signOut({ scope: 'local' });
}
