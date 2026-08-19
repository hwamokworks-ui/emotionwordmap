export type Region = {
  id: string;
  name: string;
  root_word_id: string;
  color: string;
  area_color: string;
  text_color: string | null;
  mood: 'frown' | 'flat' | 'smile';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export type WordRow = {
  id: string;
  region_id: string;
  word_form: string;
  noun_form: string;
  pos: string;
  prop: string;
  intensity: number;
  definition: string;
  example_sentence: string;
  scene_description: string;
  edge_bias_region_id: string | null;
  display_order: number;
};

export type Relation = { word_a_id: string; word_b_id: string };

export type NoteRow = { id: string; word_id: string; content: string; created_at: string };

export type MapData = {
  regions: Region[];
  words: WordRow[];
  relations: Relation[];
  isLoggedIn: boolean;
  initialDiscovered: string[];
  initialSaved: string[];
  initialNotes: NoteRow[];
};
