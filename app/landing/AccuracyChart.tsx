const STAGES = [
  '임베딩',
  'LLM 단일추측',
  '후보 3개',
  '후보 5개',
  '개수 강제방지',
  '중립→긍정→부정',
  '재시도+폴백',
  '폴백 제거',
  '후보 7개',
  'gpt-4o 실험',
  '복합 감정 지원(최종)',
  '복합 감정 + gpt-4o',
];

const SERIES: { key: string; label: string; color: string; values: (number | null)[] }[] = [
  { key: 'top1', label: '1순위 정확도', color: '#8F5A12', values: [23.3, 30.0, 36.7, 36.7, 36.7, 43.3, 36.7, 33.3, 40.0, 53.3, 43.3, 66.7] },
  { key: 'hit', label: '정답 포함 확률', color: '#1D6FD1', values: [null, 30.0, 50.0, 66.7, 60.0, 60.0, 56.7, 63.3, 60.0, 83.3, 70.0, 90.0] },
  { key: 'region', label: '지역 정확도', color: '#B8467A', values: [36.7, 43.3, 50.0, 53.3, 53.3, 53.3, 53.3, 50.0, 50.0, 63.3, 53.3, 76.7] },
];

const W = 640;
const H = 260;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 34;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const N = STAGES.length;

const xAt = (i: number) => PAD_L + (i / (N - 1)) * PLOT_W;
const yAt = (v: number) => PAD_T + (1 - v / 100) * PLOT_H;

function pathFor(values: (number | null)[]) {
  const segments: string[] = [];
  let drawing = false;
  values.forEach((v, i) => {
    if (v == null) {
      drawing = false;
      return;
    }
    const cmd = drawing ? 'L' : 'M';
    segments.push(`${cmd}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
    drawing = true;
  });
  return segments.join(' ');
}

// AI 의미 검색이 임베딩 → LLM 분류로 바뀌며 거친 7단계의 실측 정확도.
// docs/AI_의미검색_구현기록.md §4의 표를 그대로 옮긴 것 — 지어낸 수치가 아니다.
export default function AccuracyChart() {
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="AI 의미 검색 7단계 정확도 변화 그래프">
        {gridLines.map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yAt(g)} y2={yAt(g)} stroke="var(--border-hairline)" strokeWidth={1} />
            <text x={PAD_L - 8} y={yAt(g) + 3} textAnchor="end" fontSize={9} fill="var(--text-secondary)">
              {g}
            </text>
          </g>
        ))}

        {STAGES.map((s, i) => (
          <text key={s} x={xAt(i)} y={H - 10} textAnchor="middle" fontSize={8.5} fill="var(--text-secondary)">
            {s}
          </text>
        ))}

        {SERIES.map((s) => (
          <g key={s.key}>
            <path d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) =>
              v == null ? null : <circle key={i} cx={xAt(i)} cy={yAt(v)} r={3.5} fill={s.color} stroke="var(--bg-elevated)" strokeWidth={1.2} />
            )}
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-taupe">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-[11.5px] border-collapse" style={{ minWidth: 520 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-hairline-strong)' }}>
              <th className="text-left py-2 pr-3 text-dim font-normal">단계</th>
              {SERIES.map((s) => (
                <th key={s.key} className="text-right py-2 pl-3 font-normal" style={{ color: s.color }}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAGES.map((stage, i) => (
              <tr key={stage} style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td className="text-left py-2 pr-3 text-taupe">{stage}</td>
                {SERIES.map((s) => (
                  <td key={s.key} className="text-right py-2 pl-3 text-parchment" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
                    {s.values[i] == null ? '—' : `${s.values[i]}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 pt-5 max-w-[560px] mx-auto text-left" style={{ borderTop: '1px solid var(--border-hairline)' }}>
        <p className="label-eyebrow text-[10.5px] text-amber mb-2">용어 설명</p>
        <div className="text-[11.5px] text-taupe leading-relaxed space-y-1.5">
          <p><b className="text-parchment">1순위 정확도</b> — AI가 맨 처음 고른 단어가 정답일 확률.</p>
          <p><b className="text-parchment">정답 포함 확률</b> — 정답이 후보 목록 안에 들어있을 확률.</p>
          <p><b className="text-parchment">지역 정확도</b> — 정확한 단어까지는 아니어도 같은 감정 영역을 맞힌 확률.</p>
          <p><b className="text-parchment">임베딩</b> — 문장을 숫자로 바꿔 얼마나 비슷한지 계산한 초기 방식(지금은 쓰지 않음).</p>
          <p><b className="text-parchment">LLM 단일추측</b> — AI가 후보 없이 "이거다" 하나만 바로 고르는 방식.</p>
          <p><b className="text-parchment">후보 3개·5개</b> — AI가 가까운 순서로 여러 개를 보여주고 사용자가 고르게 하는 방식.</p>
          <p><b className="text-parchment">개수 강제방지</b> — 확신이 없을 땐 후보 개수를 억지로 채우지 않도록 한 조정.</p>
          <p><b className="text-parchment">중립→긍정→부정</b> — 후보 목록 순서를 감정 성격별로 다시 배열한 조정.</p>
          <p><b className="text-parchment">재시도+폴백</b> — AI가 후보를 하나도 못 고르면 한 번 더 요청하고, 그래도 안 되면 코드가 무작위로 하나를 정해 결과가 비지 않게 했던 안전장치. 정확도를 오히려 떨어뜨려 결국 제거했다.</p>
          <p><b className="text-parchment">폴백 제거</b> — 억지로 답을 만들지 않고, 정말 애매하면 빈 결과를 그대로 두고 사용자에게 문장을 더 자세히 적어달라고 요청해본 방식.</p>
          <p><b className="text-parchment">후보 7개</b> — 다시 무조건 채우는 방식으로 돌아가되, 개수를 5개에서 7개로 늘려 그물을 넓힌 방식.</p>
          <p><b className="text-parchment">gpt-4o 실험</b> — 지금 쓰는 모델(gpt-4o-mini)보다 더 큰 모델로 같은 30문장을 다시 돌려본 실험. 정확도는 더 높았지만 비용이 훨씬 비싸 아직 도입은 보류 중.</p>
          <p><b className="text-parchment">복합 감정 지원(최종)</b> — "아쉽다와 기쁘다, 근데 슬프다"처럼 한 문장에 여러 감정이 섞여 있으면 하나만 고르지 않고 각각을 찾아 보여주도록 한 지금의 최종 방식.</p>
          <p><b className="text-parchment">복합 감정 + gpt-4o</b> — 복합 감정 지원을 그대로 두고 모델만 gpt-4o로 바꿔본 실험. 세 지표 모두 가장 높았지만 비용 문제로 도입은 보류 중.</p>
        </div>
      </div>
    </div>
  );
}
