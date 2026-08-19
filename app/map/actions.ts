'use server';

import { createClient } from '@/lib/supabase/server';

// 로그인 안 한 사용자는 localStorage로만 동작하므로, 이 액션들은 로그인한 사용자에게만 의미가 있다.
// 로그인 여부는 매번 서버에서 세션으로 다시 확인한다 — 클라이언트가 보낸 로그인 상태를 신뢰하지 않는다.

export async function discoverWordAction(wordId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const { error } = await supabase
    .from('user_word_discoveries')
    .upsert({ user_id: user.id, word_id: wordId }, { onConflict: 'user_id,word_id', ignoreDuplicates: true });
  return { ok: !error };
}

export async function setSaveAction(wordId: string, saved: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  if (saved) {
    const { error } = await supabase
      .from('user_word_saves')
      .upsert({ user_id: user.id, word_id: wordId }, { onConflict: 'user_id,word_id', ignoreDuplicates: true });
    return { ok: !error };
  }
  const { error } = await supabase
    .from('user_word_saves')
    .delete()
    .eq('user_id', user.id)
    .eq('word_id', wordId);
  return { ok: !error };
}

export async function addNoteAction(wordId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const { data, error } = await supabase
    .from('user_notes')
    .insert({ user_id: user.id, word_id: wordId, content })
    .select('id, word_id, content, created_at')
    .single();
  if (error || !data) return { ok: false as const };
  return { ok: true as const, note: data };
}
