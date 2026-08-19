'use server';

import { createClient } from '@/lib/supabase/server';

export async function resetAllAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  await Promise.all([
    supabase.from('user_word_discoveries').delete().eq('user_id', user.id),
    supabase.from('user_word_saves').delete().eq('user_id', user.id),
    supabase.from('user_notes').delete().eq('user_id', user.id),
  ]);
  return { ok: true as const };
}
