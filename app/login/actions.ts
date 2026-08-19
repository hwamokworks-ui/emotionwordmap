'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  return { email, password };
}

export async function signIn(formData: FormData): Promise<void> {
  const { email, password } = readCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?tab=signin&error=${encodeURIComponent(error.message)}`);
  }
  redirect('/map');
}

export async function signUp(formData: FormData): Promise<void> {
  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get('displayName') || '').trim() || undefined;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) {
    redirect(`/login?tab=signup&error=${encodeURIComponent(error.message)}`);
  }
  redirect('/map');
}
