type Props = { active: 'find' | 'map' | 'archive'; isLoggedIn: boolean; displayName?: string | null };

export default function Topbar({ active, isLoggedIn, displayName }: Props) {
  return (
    <header className="topbar">
      <a href="/" className="topbar-brand">
        감정 어휘 지도
      </a>
      <div className="topbar-right">
        <nav className="topbar-nav">
          <a href="/" className={active === 'find' ? 'active' : ''}>
            감정 찾기
          </a>
          <a href="/map" className={active === 'map' ? 'active' : ''}>
            감정 지도
          </a>
          <a href="/archive" className={active === 'archive' ? 'active' : ''}>
            감정 서고
          </a>
        </nav>
        {isLoggedIn ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="user-chip" style={{ cursor: 'pointer' }}>
              <span className="avatar">{(displayName || '나')[0]}</span>
              <span className="text-[13px] text-taupe hidden md:inline">{displayName || '로그아웃'}</span>
              <span className="status-dot" aria-hidden="true" />
            </button>
          </form>
        ) : (
          <a href="/login" className="user-chip user-chip-solo">
            <span className="text-[13px] text-taupe md:hidden">로그인</span>
            <span className="text-[13px] text-taupe hidden md:inline">로그인하면 기록이 쌓여요</span>
          </a>
        )}
      </div>
    </header>
  );
}
