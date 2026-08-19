'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveWordAction, type WordCandidate } from './actions';

export default function SearchBox() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const cancelledRef = useRef(false);
  const [candidates, setCandidates] = useState<WordCandidate[] | null>(null);
  const [confident, setConfident] = useState(true);
  const [notFound, setNotFound] = useState(false);

  function submit() {
    const text = ref.current?.value ?? '';
    cancelledRef.current = false;
    setCandidates(null);
    setNotFound(false);
    setIsSearching(true);
    resolveWordAction(text).then((result) => {
      if (cancelledRef.current) return; // 중지를 눌렀으면 뒤늦게 온 결과는 무시한다.
      setIsSearching(false);
      if (result.type === 'candidates') {
        setCandidates(result.candidates);
        setConfident(result.confident);
      } else {
        setNotFound(true);
      }
    });
  }

  // 진행 중인 Server Action 요청 자체를 끊을 방법은 없어서(브라우저 fetch를 직접 제어할 수 없음),
  // 대신 결과가 와도 무시하고 화면을 바로 되돌려 "중지됐다"는 체감을 준다.
  function cancelSearch() {
    cancelledRef.current = true;
    setIsSearching(false);
  }

  return (
    <section
      className="paper-card p-8 md:p-10 mt-9 enter enter-delay-1 relative overflow-hidden"
      style={{
        background: 'linear-gradient(165deg, rgba(224,189,117,.28), var(--bg-elevated) 45%)',
        border: '2px solid rgba(143,90,18,.55)',
        boxShadow: '0 2px 4px rgba(38,36,32,.08), 0 14px 32px -10px rgba(143,90,18,.22)',
      }}
    >
      <textarea
        ref={ref}
        rows={2}
        placeholder="지금 어떤 마음인지 적어보세요."
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="font-display-serif w-full bg-transparent border-0 outline-none resize-none text-[22px] md:text-[27px] leading-snug placeholder:text-dim/60"
      />
      <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: '1px solid var(--border-hairline)' }}>
        <span className="text-[11.5px] text-dim" style={{ letterSpacing: '.02em' }}>
          Enter · 줄바꿈은 Shift + Enter
        </span>
        <button onClick={isSearching ? cancelSearch : submit} className="btn-primary text-[15px] inline-flex items-center gap-2">
          {isSearching ? (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <rect x="5" y="5" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="M17 17l-4-4" />
            </svg>
          )}
          {isSearching ? '찾기 중지' : '내 마음의 위치 찾기'}
        </button>
      </div>

      {isSearching && (
        <div className="mt-5 pt-5 flex flex-col items-center gap-3" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <div className="flex items-end gap-2" style={{ height: 22 }}>
            {[
              { color: '#D1503A', delay: '0ms' },
              { color: '#E8A93A', delay: '120ms' },
              { color: '#3FA495', delay: '240ms' },
              { color: '#5B72B8', delay: '360ms' },
            ].map((d) => (
              <span
                key={d.color}
                className="rounded-full animate-bounce"
                style={{ width: 9, height: 9, background: d.color, animationDelay: d.delay, animationDuration: '900ms' }}
              />
            ))}
          </div>
          <p className="text-[12.5px] text-taupe">마음이 놓일 자리를 찾고 있어요…</p>
        </div>
      )}

      {candidates && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <p className="text-[12.5px] text-taupe mb-3">
            가장 가까운 감정을 골라주세요{!confident && '. 적당한 감정이 없다면, 조금 더 상세하게 감정을 적어주세요.'}
          </p>
          <div className="divide-y" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '14px', overflow: 'hidden' }}>
            {candidates.map((c, i) => (
              <button
                key={c.id}
                onClick={() => router.push(`/map?w=${c.id}`)}
                className="w-full text-left flex items-center gap-3 py-3 px-3.5 hover:bg-elevated2 transition-colors"
                style={i === candidates.length - 1 ? undefined : { borderBottom: '1px solid var(--border-hairline)' }}
              >
                <span className="font-display-serif text-[16px] text-parchment shrink-0">{c.noun_form}</span>
                <span className="text-[12.5px] text-taupe leading-relaxed">{c.definition}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {notFound && (
        <p className="text-[12.5px] text-taupe mt-5 pt-5" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          아직 이 마음에 꼭 맞는 단어를 찾지 못했어요. 문장을 조금 더 자세히 적어주시겠어요?
        </p>
      )}
    </section>
  );
}
