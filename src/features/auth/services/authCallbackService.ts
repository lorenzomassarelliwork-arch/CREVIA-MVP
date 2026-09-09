import { supabase } from '../../../lib/supabase';

function parseParams(url: string): URLSearchParams {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const parts: string[] = [];

  if (queryIndex >= 0) {
    const end = hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : url.length;
    parts.push(url.slice(queryIndex + 1, end));
  }

  if (hashIndex >= 0) {
    parts.push(url.slice(hashIndex + 1));
  }

  return new URLSearchParams(parts.filter(Boolean).join('&'));
}

export async function handleSupabaseAuthCallback(url: string): Promise<void> {
  if (!url.startsWith('crevia://auth/callback')) return;

  const params = parseParams(url);
  const errorDescription =
    params.get('error_description') ?? params.get('error');

  if (errorDescription) {
    throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) throw error;
  }
}
