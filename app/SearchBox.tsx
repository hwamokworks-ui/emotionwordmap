'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveWordAction, type WordCandidate } from './actions';

export default function SearchBox() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [candidates, setCandidates] = useState<WordCandidate[] | null>(null);
  const [confident, setConfident] = useState(true);
  const [notFound, setNotFound] = useState(false);

  function submit() {
    const text = ref.current?.value ?? '';
    setCandidates(null);
    setNotFound(false);
    startTransition(async () => {
      const result = await resolveWordAction(text);
      if (result.type === 'candidates') {
        setCandidates(result.candidates);
        setConfident(result.confident);
      } else {
        setNotFound(true);
      }
    });
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
        <button onClick={submit} disabled={isPending} className="btn-primary text-[15px] inline-flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="9" cy="9" r="6" />
            <path d="M17 17l-4-4" />
          </svg>
          {isPending ? '찾는 중…' : '내 마음의 위치 찾기'}
        </button>
      </div>

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
          아직 이 마음에 꼭 맞는 단어를 찾지 못했어요. 조금 다르게 표현해보시겠어요?
        </p>
      )}
    </section>
  );
}
