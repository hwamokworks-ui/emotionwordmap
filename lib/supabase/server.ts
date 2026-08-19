import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 서버 전용. Route Handler / Server Action / Server Component에서만 사용한다.
// 로그인 세션 쿠키를 그대로 읽어 RLS가 auth.uid() 기준으로 자동 적용된다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component에서 호출되면 쓰기가 막혀 있다 — middleware가 세션 갱신을 대신 처리하므로 무시해도 된다.
        }
      },
    },
  });
}
