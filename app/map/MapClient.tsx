'use client';

import { useEffect, useRef } from 'react';
import { discoverWordAction, setSaveAction, addNoteAction } from './actions';
import Topbar from '../Topbar';
import type { MapData } from './types';

const MAPW = 3156;
const MAPH = 2588;
const INTENSITY_LABEL: Record<number, string> = { 1: '매우 약함', 2: '약함', 3: '보통', 4: '강함', 5: '매우 강함' };
const STORE_KEY = 'ewm_store_v1';
const PANEL_WIDTH = 422;

// 정의가 "~을 예스럽게 이르는 말"인 단어들 — 예문에 억지로 끼워 넣으면 부자연스러워서,
// 대신 요즘 표현으로 이렇게 말한다는 걸 상세 패널에 따로 알려준다.
const ARCHAIC_MODERN: Record<string, string> = { hui: '기쁨', ae: '정 · 사랑' };

type Word = {
  id: string;
  w: string;
  n: string;
  r: string;
  i: number;
  pos: string;
  prop: string;
  def: string;
  say: string;
  scene: string;
  _x: number;
  _y: number;
};

type LocalNote = { wordId: string; at: number; text: string };

type Store = {
  discovered: string[];
  saved: string[];
  notes: LocalNote[];
};

export default function MapClient({
  regions,
  words,
  relations,
  isLoggedIn,
  initialDiscovered,
  initialSaved,
  initialNotes,
}: MapData) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const regionLayerRef = useRef<SVGGElement>(null);
  const regionBorderLayerRef = useRef<SVGGElement>(null);
  const regionLabelLayerRef = useRef<SVGGElement>(null);
  const edgeLayerRef = useRef<SVGGElement>(null);
  const nodeLayerRef = useRef<SVGGElement>(null);
  const focusPanelRef = useRef<HTMLElement>(null);
  const focusHeaderRef = useRef<HTMLDivElement>(null);
  const focusBodyRef = useRef<HTMLDivElement>(null);
  const hereWordRef = useRef<HTMLParagraphElement>(null);
  const hereHintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const REGION_BY_ID = Object.fromEntries(regions.map((r) => [r.id, r]));
    const REGION_MOOD = Object.fromEntries(regions.map((r) => [r.id, r.mood]));

    const WORDS: Record<string, Word> = {};
    words.forEach((row) => {
      WORDS[row.id] = {
        id: row.id,
        w: row.word_form,
        n: row.noun_form,
        r: row.region_id,
        i: row.intensity,
        pos: row.pos,
        prop: row.prop,
        def: row.definition,
        say: row.example_sentence,
        scene: row.scene_description,
        _x: 0,
        _y: 0,
      };
    });

    const ADJ: Record<string, string[]> = {};
    relations.forEach(({ word_a_id: a, word_b_id: b }) => {
      (ADJ[a] = ADJ[a] || []).push(b);
      (ADJ[b] = ADJ[b] || []).push(a);
    });

    const WORDS_BY_REGION: Record<string, Word[]> = {};
    Object.values(WORDS).forEach((w) => (WORDS_BY_REGION[w.r] = WORDS_BY_REGION[w.r] || []).push(w));

    const EDGE_BIAS: Record<string, string> = {};
    words.forEach((row) => {
      if (row.edge_bias_region_id) EDGE_BIAS[row.id] = row.edge_bias_region_id;
    });

    // 골든 앵글 스파이럴 — DESIGN.md §3.1.1 참고
    Object.keys(WORDS_BY_REGION).forEach((rid) => {
      const region = REGION_BY_ID[rid];
      const regionWords = WORDS_BY_REGION[rid];
      const n = regionWords.length;
      regionWords.forEach((w, i) => {
        const biasRegionId = EDGE_BIAS[w.id];
        if (biasRegionId && REGION_BY_ID[biasRegionId]) {
          const target = REGION_BY_ID[biasRegionId];
          const dirAngle = Math.atan2(target.cy - region.cy, target.cx - region.cx);
          const edgeT = 1.1;
          w._x = region.cx + region.rx * edgeT * Math.cos(dirAngle);
          w._y = region.cy + region.ry * edgeT * Math.sin(dirAngle);
          return;
        }
        const t = Math.sqrt((i + 0.55) / n);
        const angle = i * 2.39996323;
        w._x = region.cx + region.rx * t * Math.cos(angle) * 0.82;
        w._y = region.cy + region.ry * t * Math.sin(angle) * 0.82;
      });
    });

    /* ── 저장소: 로그인 시 서버(Supabase)가 원본, 비로그인 시 localStorage가 원본 ── */
    function loadGuestStore(): Store {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s && Array.isArray(s.discovered)) return s;
        }
      } catch {
        // 무시하고 기본값 사용
      }
      const seed = ['heotal', 'oeropda', 'seulpeu'].filter((id) => WORDS[id]);
      return {
        discovered: seed,
        saved: [],
        notes: [],
      };
    }

    const store: Store = isLoggedIn
      ? {
          discovered: [...initialDiscovered],
          saved: [...initialSaved],
          notes: initialNotes.map((n) => ({ wordId: n.word_id, at: new Date(n.created_at).getTime(), text: n.content })),
        }
      : loadGuestStore();

    function persistGuest() {
      if (isLoggedIn) return;
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    }
    function isDiscovered(id: string) {
      return store.discovered.includes(id);
    }
    function tierOf(id: string): 0 | 1 | 2 {
      if (isDiscovered(id)) return 2;
      const nbs = ADJ[id] || [];
      if (nbs.some(isDiscovered)) return 1;
      return 0;
    }
    function discover(id: string) {
      if (isDiscovered(id)) return;
      store.discovered.push(id);
      persistGuest();
      if (isLoggedIn) void discoverWordAction(id);
    }
    function toggleSave(id: string) {
      const idx = store.saved.indexOf(id);
      if (idx >= 0) store.saved.splice(idx, 1);
      else store.saved.push(id);
      persistGuest();
      if (isLoggedIn) void setSaveAction(id, idx < 0);
      openWord(id);
    }
    async function saveNote(id: string) {
      const ta = document.getElementById('noteInput') as HTMLTextAreaElement | null;
      const text = ta?.value.trim();
      if (!text) return;
      if (isLoggedIn) {
        const res = await addNoteAction(id, text);
        if (res.ok) store.notes.unshift({ wordId: id, at: new Date(res.note.created_at).getTime(), text: res.note.content });
      } else {
        store.notes.push({ wordId: id, at: Date.now(), text });
      }
      persistGuest();
      openWord(id);
    }

    /* ── 렌더링 ── */
    function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
      const e = document.createElementNS(svgNS, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
      return e;
    }

    function renderRegions() {
      const regionLayer = regionLayerRef.current!;
      const regionBorderLayer = regionBorderLayerRef.current!;
      const regionLabelLayer = regionLabelLayerRef.current!;
      regionLayer.innerHTML = '';
      regionBorderLayer.innerHTML = '';
      regionLabelLayer.innerHTML = '';
      regions.forEach((r) => {
        const regionWords = WORDS_BY_REGION[r.id] || [];
        const found = regionWords.filter((w) => isDiscovered(w.id)).length;
        regionLayer.appendChild(
          el('ellipse', { cx: r.cx, cy: r.cy, rx: r.rx, ry: r.ry, fill: r.area_color, 'fill-opacity': found > 0 ? 0.09 : 0.05, stroke: 'none' })
        );
        regionBorderLayer.appendChild(
          el('ellipse', {
            cx: r.cx,
            cy: r.cy,
            rx: r.rx,
            ry: r.ry,
            fill: 'none',
            stroke: r.area_color,
            'stroke-opacity': 0.65,
            'stroke-width': 1.25,
            'stroke-dasharray': '7 6',
          })
        );
        const label = el('text', {
          x: r.cx,
          // 경계 방향으로 치우친(edge_bias) 단어는 ry*1.1만큼 바깥으로 나가는데, 예전 -16 오프셋은
          // 그 지점과 겹쳐서(예: "고적함"이 forest→room 방향 위로 튀어나와 지역 제목과 포개짐) 제목이
          // 안 보였다. 그 최대 돌출 지점(ry*0.1)보다 확실히 더 바깥에 놓이도록 -50으로 늘렸다.
          y: r.cy - r.ry - 50,
          'text-anchor': 'middle',
          fill: r.text_color || r.color,
          'font-family': 'Pretendard',
          'font-weight': 700,
          'font-size': 26,
          opacity: found > 0 ? 0.9 : 0.6,
        });
        label.textContent = `${r.name} · ${found}/${regionWords.length}`;
        regionLabelLayer.appendChild(label);
      });
    }

    function renderEdgesAndNodes() {
      const edgeLayer = edgeLayerRef.current!;
      const nodeLayer = nodeLayerRef.current!;
      edgeLayer.innerHTML = '';
      nodeLayer.innerHTML = '';
      relations.forEach(({ word_a_id: a, word_b_id: b }) => {
        const ta = tierOf(a);
        const tb = tierOf(b);
        if (ta === 0 && tb === 0) return;
        const wa = WORDS[a];
        const wb = WORDS[b];
        const solid = ta === 2 && tb === 2;
        edgeLayer.appendChild(
          el('line', { x1: wa._x, y1: wa._y, x2: wb._x, y2: wb._y, class: 'edge-line ' + (solid ? 'edge-solid' : 'edge-dashed') })
        );
      });
      Object.values(WORDS).forEach((w) => {
        const tier = tierOf(w.id);
        const g = el('g', { class: 'node-group', 'data-tier': String(tier), 'data-id': w.id });
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => openWord(w.id));
        g.appendChild(el('circle', { cx: w._x, cy: w._y, r: 22, fill: 'transparent', 'pointer-events': 'all' }));
        const r = tier === 2 ? 9 : tier === 1 ? 8 : 5;
        g.appendChild(
          el('circle', {
            class: 'node-fill',
            cx: w._x,
            cy: w._y,
            r,
            fill: tier === 1 ? 'none' : REGION_BY_ID[w.r].color,
            stroke: REGION_BY_ID[w.r].color,
          })
        );
        if (w.id === focusId) {
          const ring = el('circle', { cx: w._x, cy: w._y, r: 16, fill: REGION_BY_ID[w.r].color, class: 'node-focus-ring' });
          nodeLayer.appendChild(ring);
        }
        const label = el('text', {
          class: 'node-label',
          x: w._x + (tier === 0 ? 10 : 13),
          y: w._y + 5,
          'font-size': tier === 2 ? 16 : tier === 1 ? 14 : 12,
          fill: '#262420',
        });
        label.textContent = w.n;
        g.appendChild(label);
        nodeLayer.appendChild(g);
      });
    }

    function renderHereCard() {
      const hw = hereWordRef.current!;
      const hh = hereHintRef.current!;
      if (!focusId) {
        hw.textContent = '—';
        hh.textContent = '감정 찾기에서 감정을 찾거나 현재 지도에서 노드를 클릭해서 단어를 발견해보세요.';
        return;
      }
      const w = WORDS[focusId];
      const r = REGION_BY_ID[w.r];
      hw.textContent = w.n;
      const nCount = (ADJ[focusId] || []).length;
      hh.textContent = `${r.name} · 이웃 감정 ${nCount}곳`;
    }

    function renderAll() {
      renderRegions();
      renderEdgesAndNodes();
      renderHereCard();
    }

    /* ── 관계 · 경로 ── */
    function hopDistancesFrom(id: string) {
      const dist: Record<string, number> = { [id]: 0 };
      const queue = [id];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const nb of ADJ[cur] || []) {
          if (dist[nb] === undefined) {
            dist[nb] = dist[cur] + 1;
            queue.push(nb);
          }
        }
      }
      return dist;
    }
    function hopToPercent(h: number) {
      return h === 1 ? 92 : h === 2 ? 74 : h === 3 ? 56 : h === 4 ? 40 : 25;
    }
    function nearOf(id: string) {
      const dist = hopDistancesFrom(id);
      return Object.entries(dist)
        .filter(([nid, h]) => nid !== id && h <= 3)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 4)
        .map(([nid, h]) => ({ ...WORDS[nid], pct: hopToPercent(h) }));
    }
    function antonymOf(id: string) {
      const w = WORDS[id];
      let best: Word | null = null;
      let bestScore = -1;
      for (const cand of Object.values(WORDS)) {
        if (cand.r === w.r) continue;
        const score = Math.abs(cand.i - w.i);
        if (score > bestScore || (score === bestScore && best && cand.id < best.id)) {
          bestScore = score;
          best = cand;
        }
      }
      return best;
    }
    function farOf(id: string, excludeId?: string) {
      const w = WORDS[id];
      const out: Word[] = [];
      for (const cand of Object.values(WORDS)) {
        if (out.length >= 2) break;
        if (cand.id === id || cand.id === excludeId) continue;
        if (cand.r === w.r) continue;
        if (Math.abs(cand.i - w.i) >= 1) out.push(cand);
      }
      return out;
    }
    function breadcrumb(id: string) {
      const w = WORDS[id];
      const root = REGION_BY_ID[w.r].root_word_id;
      if (id === root) return [id];
      const allowed = new Set(store.discovered);
      allowed.add(id);
      allowed.add(root);
      const queue = [[root]];
      const visited = new Set([root]);
      while (queue.length) {
        const path = queue.shift()!;
        const last = path[path.length - 1];
        if (last === id) return path;
        for (const nb of ADJ[last] || []) {
          if (!allowed.has(nb) || visited.has(nb)) continue;
          visited.add(nb);
          queue.push([...path, nb]);
        }
      }
      return [id];
    }

    /* ── 감정 캐릭터 일러스트 ── */
    function characterSVG(color: string, prop: string, mood: string) {
      const mouth = mood === 'smile' ? 'M28 62q10 8 20 0' : mood === 'frown' ? 'M28 66q10 -8 20 0' : 'M28 63h20';
      let propSvg = '';
      if (prop === 'book' || prop === 'letter' || prop === 'map') {
        propSvg = `<rect x="46" y="38" width="20" height="15" rx="1.5" fill="#FFFBF3" stroke="#262420" stroke-width="1.4" transform="rotate(-8 56 45)"/>`;
      } else if (prop === 'flower') {
        propSvg = `<g opacity="0.9"><circle cx="58" cy="30" r="4" fill="${color}"/><circle cx="64" cy="24" r="2.6" fill="${color}" opacity=".7"/><circle cx="52" cy="24" r="2" fill="${color}" opacity=".5"/></g>`;
      }
      return `<svg viewBox="0 0 76 88" width="76" height="88" style="display:block">
        <ellipse cx="38" cy="83" rx="18" ry="3" fill="#262420" opacity=".12"/>
        <path d="M23 80V44c0-8.3 6.7-15 15-15s15 6.7 15 15v36Z" fill="${color}" opacity=".92"/>
        <circle cx="32" cy="44" r="2.1" fill="#FFFBF3"/><circle cx="44" cy="44" r="2.1" fill="#FFFBF3"/>
        <path d="${mouth}" fill="none" stroke="#FFFBF3" stroke-width="2" stroke-linecap="round"/>
        ${propSvg}
      </svg>`;
    }

    /* ── 상세 패널 ── */
    let focusId: string | null = null;

    function openWord(id: string) {
      if (tierOf(id) !== 2) discover(id);
      focusId = id;
      renderAll();
      const w = WORDS[id];
      const r = REGION_BY_ID[w.r];
      const saved = store.saved.includes(id);

      focusHeaderRef.current!.innerHTML = `
        <div>
          <p class="label-eyebrow text-[10px]" style="color:${r.color}">${r.name}</p>
          <h2 class="font-serif-kr text-[30px] leading-tight mt-1">${w.n}<span class="text-[12px] text-dim label-eyebrow ml-2">${w.pos}</span></h2>
        </div>
        <button onclick="closeFocus()" aria-label="닫기" class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-elevated2 text-dim shrink-0">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5l10 10M15 5L5 15"/></svg>
        </button>`;

      const path = breadcrumb(id);
      const nearChips = nearOf(id)
        .map(
          (x) =>
            `<button onclick="openWord('${x.id}')" class="chip text-[13px] items-center gap-1.5" style="background:${REGION_BY_ID[x.r].color}22; color:${REGION_BY_ID[x.r].color};">${x.n}<span class="font-mono-coord text-[9px] opacity-70">${x.pct}%</span></button>`
        )
        .join('');
      const antonym = antonymOf(id);
      const antonymChip = antonym
        ? `<button onclick="openWord('${antonym.id}')" class="chip text-[13px]" style="background:transparent; border:1.5px solid ${REGION_BY_ID[antonym.r].color}; color:${REGION_BY_ID[antonym.r].color}; font-weight:600;">${antonym.n} · ${REGION_BY_ID[antonym.r].name}</button>`
        : '<span class="text-dim text-xs">없음</span>';
      const farChips = farOf(id, antonym?.id)
        .map(
          (x) =>
            `<button onclick="openWord('${x.id}')" class="chip text-[13px]" style="background:transparent; border:1px dashed ${REGION_BY_ID[x.r].color}88; color:${REGION_BY_ID[x.r].color};">${x.n}</button>`
        )
        .join('');
      const pathHtml = path
        .map(
          (pid, i) =>
            `<span class="flex items-center gap-1"><span class="font-serif-kr text-[14px]" style="color:${pid === id ? r.color : 'var(--text-secondary)'}">${WORDS[pid].n}</span>${i < path.length - 1 ? '<span class="text-dim text-xs">→</span>' : ''}</span>`
        )
        .join('');
      const notesForWord = store.notes.filter((n) => n.wordId === id).slice().reverse();

      focusBodyRef.current!.innerHTML = `
        <div class="flex gap-4 items-start p-3.5 rounded-md" style="background:${r.color}14; border:1px solid ${r.color}44;">
          ${characterSVG(r.color, w.prop, REGION_MOOD[w.r])}
          <div>
            <p class="text-[10px] label-eyebrow mb-1" style="color:${r.color}">감정 캐릭터</p>
            <p class="text-[13px] text-taupe leading-relaxed">${w.scene}</p>
          </div>
        </div>

        <p class="font-serif-kr text-[17px] leading-relaxed mt-4 pl-3" style="border-left:2px solid var(--border-hairline-strong);">${w.def}</p>
        ${
          ARCHAIC_MODERN[id]
            ? `<p class="text-[11.5px] text-dim mt-2 pl-3">옛말 표현이에요 · 요즘엔 <b class="text-taupe">'${ARCHAIC_MODERN[id]}'</b>처럼 표현해요.</p>`
            : ''
        }

        <div class="flex items-center gap-3 mt-4">
          <span class="text-xs text-taupe label-eyebrow">감정 강도</span>
          <div class="flex gap-1 flex-1">${[1, 2, 3, 4, 5].map((n) => `<span class="flex-1 h-1.5 rounded-full" style="background:${n <= w.i ? r.color : 'var(--bg-elevated2)'}"></span>`).join('')}</div>
          <span class="text-[11px] text-taupe">${INTENSITY_LABEL[w.i]}</span>
        </div>

        <p class="text-xs text-taupe label-eyebrow mt-5 mb-2">가까운 감정 <span class="text-dim font-normal">· 유의어, 거리 순</span></p>
        <div class="flex flex-wrap gap-2">${nearChips || '<span class="text-dim text-xs">아직 없어요</span>'}</div>

        <p class="text-xs text-taupe label-eyebrow mt-4 mb-2">반의어</p>
        <div class="flex flex-wrap gap-2">${antonymChip}</div>

        <p class="text-xs text-taupe label-eyebrow mt-4 mb-2">조금 다른 감정</p>
        <div class="flex flex-wrap gap-2">${farChips}</div>

        <p class="text-xs text-taupe label-eyebrow mt-4 mb-2">감정의 위치</p>
        <div class="flex flex-wrap items-center gap-2 p-3 rounded-md" style="background:var(--bg-elevated2); border:1px dashed var(--border-hairline-strong);">${pathHtml}</div>
        ${EDGE_BIAS[id] ? `<div class="mt-3 p-3 rounded-md text-[12px] leading-relaxed" style="background:${r.color}14; border:1px dashed ${r.color}66; color:var(--text-secondary);">🗺️ 이 감정은 <b style="color:${r.color}">${r.name}</b> 소속이지만, <b>${REGION_BY_ID[EDGE_BIAS[id]].name}</b> 쪽 경계에 걸쳐 있어요.</div>` : ''}

        <p class="text-xs text-amber label-eyebrow mt-5 mb-2">이렇게 표현할 수 있어요</p>
        <blockquote class="font-serif-kr text-[16px] leading-relaxed p-4 rounded-md" style="background:var(--bg-elevated2);">"${w.say}"</blockquote>
        <button onclick="copySay('${id}', this)" class="btn-secondary w-full mt-2 text-[13px]">문장 복사</button>

        <p class="text-xs text-taupe label-eyebrow mt-5 mb-2">마음 기록${isLoggedIn ? '' : ' <span class="text-dim font-normal">· 로그인하면 날짜를 넘겨서도 남아요</span>'}</p>
        <textarea id="noteInput" rows="3" placeholder="이 감정을 느낀 순간을 적어두면 감정 서고에 남아요." class="field w-full px-3 py-2.5 text-[13px] placeholder:text-dim"></textarea>
        <button onclick="saveNoteHandler('${id}')" class="btn-secondary w-full mt-2 text-[13px]">기록 저장</button>
        ${
          notesForWord.length
            ? `<div class="mt-3 space-y-2">${notesForWord
                .map(
                  (n) => `
          <div class="index-card p-3" style="border-left:2px solid ${r.color};">
            <p class="text-[10px] text-dim font-mono-coord">${new Date(n.at).toLocaleDateString('ko-KR')}</p>
            <p class="text-[13px] text-parchment/90 mt-1 leading-relaxed">${n.text}</p>
          </div>`
                )
                .join('')}</div>`
            : ''
        }

        <button onclick="toggleSaveHandler('${id}')" class="btn-save mt-6 ${saved ? 'saved' : ''}">${saved ? '저장됨 · 취소하기' : '이 단어 저장하기'}</button>
      `;
      focusPanelRef.current!.style.display = 'flex';
      centerOn(w._x, w._y, true);
    }

    function closeFocus() {
      focusId = null;
      focusPanelRef.current!.style.display = 'none';
      renderAll();
    }

    function copySay(id: string, btn: HTMLButtonElement) {
      if (navigator.clipboard) navigator.clipboard.writeText(WORDS[id].say).catch(() => {});
      const t = btn.textContent;
      btn.textContent = '복사됨';
      setTimeout(() => (btn.textContent = t), 1300);
    }

    /* ── 팬 · 줌 ── */
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    let zoom = 0.58;
    let panX = 0;
    let panY = 0;
    let dragging = false;
    let dragStart = { x: 0, y: 0 };
    let panStart = { x: 0, y: 0 };

    function applyTransform(animate: boolean) {
      canvas.style.transition = animate ? 'transform .4s ease' : 'none';
      canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
    function centerOn(cx: number, cy: number, avoidPanel?: boolean) {
      const rect = wrap.getBoundingClientRect();
      const dodgePanel = avoidPanel && rect.width > 760;
      const usableWidth = dodgePanel ? Math.max(200, rect.width - PANEL_WIDTH) : rect.width;
      panX = usableWidth / 2 - cx * zoom;
      panY = rect.height / 2 - cy * zoom;
      applyTransform(true);
    }
    function zoomBy(f: number) {
      zoom = Math.min(1.3, Math.max(0.16, zoom * f));
      applyTransform(true);
    }
    function recenter() {
      if (focusId) centerOn(WORDS[focusId]._x, WORDS[focusId]._y, true);
      else centerOn(MAPW / 2, MAPH / 2);
    }

    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      wrap.classList.add('dragging');
      dragStart = { x: e.clientX, y: e.clientY };
      panStart = { x: panX, y: panY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      panX = panStart.x + (e.clientX - dragStart.x);
      panY = panStart.y + (e.clientY - dragStart.y);
      applyTransform(false);
    };
    const onMouseUp = () => {
      dragging = false;
      wrap.classList.remove('dragging');
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasX = (mouseX - panX) / zoom;
      const canvasY = (mouseY - panY) / zoom;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoom = Math.min(1.3, Math.max(0.16, zoom * factor));
      panX = mouseX - canvasX * zoom;
      panY = mouseY - canvasY * zoom;
      applyTransform(false);
    };

    wrap.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });

    /* ── 터치 팬 · 핀치 줌 ── */
    let touchMode: 'pan' | 'pinch' | null = null;
    let pinchStartDist = 0;
    let pinchStartZoom = 1;
    let pinchMid = { x: 0, y: 0, canvasX: 0, canvasY: 0 };
    function touchDist(t0: Touch, t1: Touch) {
      return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    }
    const onTouchStart = (e: TouchEvent) => {
      const rect = wrap.getBoundingClientRect();
      if (e.touches.length === 1) {
        touchMode = 'pan';
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStart = { x: panX, y: panY };
      } else if (e.touches.length === 2) {
        touchMode = 'pinch';
        pinchStartDist = touchDist(e.touches[0], e.touches[1]);
        pinchStartZoom = zoom;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        pinchMid = { x: midX, y: midY, canvasX: (midX - panX) / zoom, canvasY: (midY - panY) / zoom };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchMode === 'pan' && e.touches.length === 1) {
        e.preventDefault();
        panX = panStart.x + (e.touches[0].clientX - dragStart.x);
        panY = panStart.y + (e.touches[0].clientY - dragStart.y);
        applyTransform(false);
      } else if (touchMode === 'pinch' && e.touches.length === 2) {
        e.preventDefault();
        const dist = touchDist(e.touches[0], e.touches[1]);
        zoom = Math.min(1.3, Math.max(0.16, pinchStartZoom * (dist / pinchStartDist)));
        panX = pinchMid.x - pinchMid.canvasX * zoom;
        panY = pinchMid.y - pinchMid.canvasY * zoom;
        applyTransform(false);
      }
    };
    const onTouchEnd = () => {
      touchMode = null;
    };
    wrap.addEventListener('touchstart', onTouchStart, { passive: true });
    wrap.addEventListener('touchmove', onTouchMove, { passive: false });
    wrap.addEventListener('touchend', onTouchEnd, { passive: true });
    wrap.addEventListener('touchcancel', onTouchEnd, { passive: true });

    /* ── innerHTML의 onclick="..."이 참조할 수 있게 전역에 노출 ── */
    const w = window as unknown as Record<string, unknown>;
    w.openWord = openWord;
    w.closeFocus = closeFocus;
    w.copySay = copySay;
    w.saveNoteHandler = (id: string) => void saveNote(id);
    w.toggleSaveHandler = toggleSave;
    w.zoomBy = zoomBy;
    w.recenter = recenter;

    /* ── 초기화 ── */
    const urlWord = new URLSearchParams(window.location.search).get('w');
    renderAll();
    if (urlWord && WORDS[urlWord]) {
      zoom = 0.85;
      openWord(urlWord);
    } else {
      centerOn(MAPW / 2, MAPH / 2);
    }

    return () => {
      wrap.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('touchstart', onTouchStart);
      wrap.removeEventListener('touchmove', onTouchMove);
      wrap.removeEventListener('touchend', onTouchEnd);
      wrap.removeEventListener('touchcancel', onTouchEnd);
      delete w.openWord;
      delete w.closeFocus;
      delete w.copySay;
      delete w.saveNoteHandler;
      delete w.toggleSaveHandler;
      delete w.zoomBy;
      delete w.recenter;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-wrap">
      <Topbar active="map" isLoggedIn={isLoggedIn} />

      <div className="map-full">
        <div className="map-canvas-wrap" id="mapWrap" ref={wrapRef}>
          <div className="map-canvas" id="mapCanvas" ref={canvasRef}>
            <svg id="mapSvg" width={MAPW} height={MAPH} style={{ display: 'block', overflow: 'visible' }}>
              <defs>
                <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <pattern id="mapGrid" width="90" height="90" patternUnits="userSpaceOnUse">
                  <path d="M 90 0 L 0 0 0 90" fill="none" stroke="#6B6153" strokeWidth="1.2" strokeOpacity="0.2" />
                </pattern>
              </defs>
              <rect x="-15000" y="-15000" width="35000" height="35000" fill="url(#mapGrid)" opacity="0.7" />
              <g ref={regionLayerRef} filter="url(#soft)" style={{ mixBlendMode: 'multiply' }} />
              <g ref={regionBorderLayerRef} />
              <g ref={regionLabelLayerRef} />
              <g ref={edgeLayerRef} stroke="#262420" />
              <g ref={nodeLayerRef} fontFamily="Pretendard" fontWeight={600} />
            </svg>
          </div>
        </div>

        <div className="map-float map-hud p-4 enter">
          <p className="label-eyebrow text-[10px] text-amber mb-1">현재 위치</p>
          <p id="hereWord" ref={hereWordRef} className="font-serif-kr text-[20px] leading-tight">
            —
          </p>
          <p id="hereHint" ref={hereHintRef} className="text-[11px] text-taupe mt-1 leading-relaxed">
            감정 찾기에서 감정을 찾거나 현재 지도에서 노드를 클릭해서 단어를 발견해보세요.
          </p>
          <div className="mt-3 pt-3 text-[11px] leading-relaxed text-taupe" style={{ borderTop: '1px dashed var(--border-hairline-strong)' }}>
            <b className="text-parchment">지도 읽는 법</b>
            <ul className="mt-1.5 space-y-1.5 list-none pl-0">
              <li className="flex items-center gap-1.5">
                <svg width="8" height="8" viewBox="0 0 8 8" style={{ width: 8, height: 8 }} className="shrink-0" aria-hidden="true">
                  <circle cx="4" cy="4" r="3.5" fill="var(--text-secondary)" />
                </svg>
                <span>이미 발견한 감정</span>
              </li>
              <li className="flex items-center gap-1.5">
                <svg width="8" height="8" viewBox="0 0 8 8" style={{ width: 8, height: 8 }} className="shrink-0" aria-hidden="true">
                  <circle cx="4" cy="4" r="3.2" fill="none" stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="1.4 1.6" />
                </svg>
                <span>발견한 감정과 이어져 있지만 아직 못 본 이웃</span>
              </li>
              <li className="flex items-center gap-1.5">
                <svg width="8" height="8" viewBox="0 0 8 8" style={{ width: 8, height: 8 }} className="shrink-0" aria-hidden="true">
                  <circle cx="4" cy="4" r="3.5" fill="var(--text-secondary)" opacity="0.32" />
                </svg>
                <span>아직 어디와도 안 이어진 감정</span>
              </li>
            </ul>
            <p className="mt-2">
              점을 누르면 그 자리에서 바로 발견돼요. 상세 패널의 <b>가까운 감정</b>·<b>반의어</b>를 눌러도 이동하면서 발견되고, 둘 다
              발견하면 사이의 점선이 실선으로 바뀌어요.
            </p>
            <p className="mt-2">드래그로 지도를 옮기고, 마우스 휠(위로 확대·아래로 축소)이나 좌하단 버튼으로 크기를 조절하세요.</p>
          </div>
        </div>

        <div className="absolute pointer-events-none opacity-70" style={{ right: 26, bottom: 112 }}>
          <svg width="72" height="72" viewBox="0 0 92 92">
            <circle cx="46" cy="46" r="40" fill="none" stroke="var(--text-secondary)" strokeWidth="1" />
            <circle cx="46" cy="46" r="31" fill="none" stroke="var(--text-secondary)" strokeWidth=".5" strokeDasharray="2 5" />
            <path d="M46 12 52 46 46 80 40 46Z" fill="var(--accent-amber)" opacity=".85" />
            <path d="M12 46 46 40 80 46 46 52Z" fill="var(--text-secondary)" opacity=".35" />
            <text x="46" y="10" textAnchor="middle" fontSize="10" fontFamily="Pretendard" fontWeight={700} fill="var(--text-secondary)">
              N
            </text>
          </svg>
        </div>

        <div className="absolute flex flex-col gap-1.5" style={{ left: 26, bottom: 24 }}>
          <button onClick={() => (window as unknown as { zoomBy: (f: number) => void }).zoomBy(1.25)} className="map-tool-btn text-[15px]" aria-label="확대">
            ＋
          </button>
          <button onClick={() => (window as unknown as { zoomBy: (f: number) => void }).zoomBy(0.8)} className="map-tool-btn text-[15px]" aria-label="축소">
            －
          </button>
          <button onClick={() => (window as unknown as { recenter: () => void }).recenter()} className="map-tool-btn text-[15px]" aria-label="원래 크기로">
            ◦
          </button>
        </div>
      </div>

      <aside id="focusPanel" className="focus-panel" ref={focusPanelRef as React.RefObject<HTMLElement>}>
        <div id="focusHeader" ref={focusHeaderRef} className="flex items-start justify-between gap-3 p-5" style={{ borderBottom: '2px solid var(--border-hairline)' }} />
        <div id="focusBody" ref={focusBodyRef} className="flex-1 overflow-y-auto p-5" />
      </aside>
    </div>
  );
}
