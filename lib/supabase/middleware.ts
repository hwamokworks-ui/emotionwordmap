import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Supabase 세션 쿠키는 만료 전에 주기적으로 갱신해줘야 한다. 이 갱신은 Server Component에서 할 수 없어서
// (쿠키 쓰기가 막혀 있음) 모든 요청에 앞서 middleware에서 처리한다.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // 세션 갱신을 트리거하기 위해 반드시 호출 — 결과를 안 써도 이 호출 자체가 필요하다.
  await supabase.auth.getUser();

  return response;
}
