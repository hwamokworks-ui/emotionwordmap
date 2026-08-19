import { createClient } from '@/lib/supabase/server';
import Topbar from '../Topbar';
import ArchiveClient from './ArchiveClient';
import type { Region, WordRow, Relation } from '../map/types';

export const dynamic = 'force-dynamic';

export type DiscLogEntry = { id: string; at: number };
export type SaveLogEntry = { id: string; at: number };
export type NoteEntry = { id: string; wordId: string; at: number; text: string };

export default async function ArchivePage() {
  const supabase = await createClient();

  const [{ data: regions }, { data: words }, { data: relations }] = await Promise.all([
    supabase.from('emotion_regions').select('*'),
    supabase.from('emotion_words').select('*'),
    supabase.from('emotion_word_relations').select('*'),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let disclog: DiscLogEntry[] = [];
  let savelog: SaveLogEntry[] = [];
  let notes: NoteEntry[] = [];

  if (user) {
    const [{ data: discoveries }, { data: saves }, { data: noteRows }] = await Promise.all([
      supabase.from('user_word_discoveries').select('word_id, discovered_at'),
      supabase.from('user_word_saves').select('word_id, saved_at'),
      supabase.from('user_notes').select('id, word_id, content, created_at'),
    ]);
    disclog = (discoveries ?? []).map((d) => ({ id: d.word_id, at: new Date(d.discovered_at).getTime() }));
    savelog = (saves ?? []).map((s) => ({ id: s.word_id, at: new Date(s.saved_at).getTime() }));
    notes = (noteRows ?? []).map((n) => ({ id: n.id, wordId: n.word_id, at: new Date(n.created_at).getTime(), text: n.content }));
  }

  return (
    <div className="page-wrap">
      <Topbar active="archive" isLoggedIn={!!user} displayName={(user?.user_metadata?.display_name as string) || null} />
      <ArchiveClient
        regions={(regions ?? []) as Region[]}
        words={(words ?? []) as WordRow[]}
        relations={(relations ?? []) as Relation[]}
        isLoggedIn={!!user}
        initialDisclog={disclog}
        initialSavelog={savelog}
        initialNotes={notes}
      />
    </div>
  );
}
