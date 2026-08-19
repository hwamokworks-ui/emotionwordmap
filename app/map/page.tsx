import { createClient } from '@/lib/supabase/server';
import MapClient from './MapClient';
import type { Region, WordRow, Relation, NoteRow } from './types';

export const dynamic = 'force-dynamic'; // 로그인 세션에 따라 결과가 달라지므로 캐시하지 않는다.

export default async function MapPage() {
  const supabase = await createClient();

  const [{ data: regions }, { data: words }, { data: relations }] = await Promise.all([
    supabase.from('emotion_regions').select('*'),
    supabase.from('emotion_words').select('*').order('display_order'),
    supabase.from('emotion_word_relations').select('*'),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialDiscovered: string[] = [];
  let initialSaved: string[] = [];
  let initialNotes: NoteRow[] = [];

  if (user) {
    const [{ data: discoveries }, { data: saves }, { data: notes }] = await Promise.all([
      supabase.from('user_word_discoveries').select('word_id'),
      supabase.from('user_word_saves').select('word_id'),
      supabase.from('user_notes').select('id, word_id, content, created_at').order('created_at', { ascending: false }),
    ]);
    initialDiscovered = (discoveries ?? []).map((d) => d.word_id);
    initialSaved = (saves ?? []).map((s) => s.word_id);
    initialNotes = notes ?? [];
  }

  return (
    <MapClient
      regions={(regions ?? []) as Region[]}
      words={(words ?? []) as WordRow[]}
      relations={(relations ?? []) as Relation[]}
      isLoggedIn={!!user}
      initialDiscovered={initialDiscovered}
      initialSaved={initialSaved}
      initialNotes={initialNotes}
    />
  );
}
