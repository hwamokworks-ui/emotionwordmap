import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '감정 어휘 지도',
  verification: {
    // 옛 정적 index.html에 있던 Google Search Console 소유권 확인 태그를 그대로 옮겨왔다.
    google: 'nrEWr6_NaDwPdvYxjokilh-GjF36wr2PrPcKYeiBGMg',
  },
};

// 정적 HTML 프로토타입에서 쓰던 Tailwind CDN + 커스텀 토큰 설정을 시각적 일관성을 위해 그대로 가져왔다.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = { theme: { extend: {
                colors: { base:'#E8E6D2', elevated:'#FFFFFF', elevated2:'#E3E1DA', parchment:'#262420', taupe:'#77746C', dim:'#A6A296',
                  amber:{ DEFAULT:'#8F5A12', strong:'#703F0A', glow:'#E0BD75' },
                  region:{ anger:'#D1503A', emptiness:'#A79A85', loneliness:'#3D8657', excitement:'#E87792', anxiety:'#4779A8', joy:'#E8A93A', sadness:'#5B72B8', shame:'#BE6D97', calm:'#3FA495' } },
                fontFamily: { serif:['Pretendard','-apple-system','sans-serif'], sans:['Pretendard','-apple-system','sans-serif'], mono:['"IBM Plex Mono"','monospace'] },
                borderRadius: { sm:'10px', md:'20px', lg:'28px' },
                boxShadow: { card:'0 1px 2px rgba(38,36,32,.06), 0 8px 20px -8px rgba(38,36,32,.14)', glow:'0 1px 2px rgba(38,36,32,.15), 0 0 20px rgba(224,189,117,.35)' },
              } } };
            `,
          }}
        />
        <link rel="stylesheet" href="/design-system/tokens.css" />
      </head>
      <body className="bg-base text-parchment">{children}</body>
    </html>
  );
}
