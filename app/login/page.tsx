import { signIn, signUp } from './actions';
import Topbar from '../Topbar';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const { error, tab } = await searchParams;
  const activeTab = tab === 'signup' ? 'signup' : 'signin';

  return (
    <div className="page-wrap">
      <Topbar active="find" isLoggedIn={false} />

      <main className="content-inner max-w-[420px] mx-auto">
        <div className="mt-12">
          <p className="font-mono-coord text-[10px] text-amber">ACCOUNT</p>
          <h1 className="font-serif-kr text-[30px] leading-tight mt-2">로그인 없이도 오늘 하루는 기록돼요</h1>
          <p className="text-taupe text-[13.5px] mt-2 leading-relaxed">
            지도에서 발견하고 저장하는 건 로그인 없이도 바로 됩니다. 계정을 만들면 그 기록이 날짜를 넘겨서도
            남고, 일별·월별·연별 리포트를 볼 수 있어요.
          </p>
        </div>

        {error && (
          <p className="mt-5 text-[13px] p-3 rounded-md" style={{ background: '#D1503A18', color: '#D1503A' }}>
            {decodeURIComponent(error)}
          </p>
        )}

        <div className="flex gap-6 mt-8" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
          <a
            href="/login?tab=signin"
            className={`pb-3 text-[14.5px] transition-colors ${activeTab === 'signin' ? 'text-parchment' : 'text-taupe'}`}
            style={{
              fontWeight: activeTab === 'signin' ? 600 : 400,
              borderBottom: `2px solid ${activeTab === 'signin' ? 'var(--accent-amber-strong)' : 'transparent'}`,
              marginBottom: '-1px',
            }}
          >
            로그인
          </a>
          <a
            href="/login?tab=signup"
            className={`pb-3 text-[14.5px] transition-colors ${activeTab === 'signup' ? 'text-parchment' : 'text-taupe'}`}
            style={{
              fontWeight: activeTab === 'signup' ? 600 : 400,
              borderBottom: `2px solid ${activeTab === 'signup' ? 'var(--accent-amber-strong)' : 'transparent'}`,
              marginBottom: '-1px',
            }}
          >
            회원가입
          </a>
        </div>

        {activeTab === 'signin' ? (
          <form
            action={signIn}
            className="mt-4 p-5 flex flex-col gap-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '20px' }}
          >
            <label className="text-xs text-taupe label-eyebrow">이메일</label>
            <input name="email" type="email" required className="field px-3 py-2.5 text-[14px]" />
            <label className="text-xs text-taupe label-eyebrow mt-1">비밀번호</label>
            <input name="password" type="password" required minLength={6} className="field px-3 py-2.5 text-[14px]" />
            <button type="submit" className="btn-primary mt-3 text-[14px]">
              로그인
            </button>
          </form>
        ) : (
          <form
            action={signUp}
            className="mt-4 p-5 flex flex-col gap-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '20px' }}
          >
            <p className="text-xs text-taupe label-eyebrow">처음 오셨나요?</p>
            <label className="text-xs text-taupe label-eyebrow mt-1">닉네임 (선택)</label>
            <input name="displayName" type="text" className="field px-3 py-2.5 text-[14px]" />
            <label className="text-xs text-taupe label-eyebrow mt-1">이메일</label>
            <input name="email" type="email" required className="field px-3 py-2.5 text-[14px]" />
            <label className="text-xs text-taupe label-eyebrow mt-1">비밀번호 (6자 이상)</label>
            <input name="password" type="password" required minLength={6} className="field px-3 py-2.5 text-[14px]" />
            <button type="submit" className="btn-secondary mt-3 text-[14px]">
              계정 만들기
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
