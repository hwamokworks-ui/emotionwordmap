'use client';

import { useEffect, useState } from 'react';

const HEADLINES = [
  { from: 0, to: 5, text: '고요한 새벽의 책상에<br/>감정의 지도를 펼쳐 두었어요.' },
  { from: 5, to: 8, text: '이른 아침 빛이 드는 책상에<br/>감정의 지도를 펼쳐 두었어요.' },
  { from: 8, to: 12, text: '아침 햇살 드는 책상에<br/>감정의 지도를 펼쳐 두었어요.' },
  { from: 12, to: 18, text: '햇살 드는 오후의 책상에<br/>감정의 지도를 펼쳐 두었어요.' },
  { from: 18, to: 21, text: '노을 지는 저녁의 책상에<br/>감정의 지도를 펼쳐 두었어요.' },
  { from: 21, to: 24, text: '고요한 밤의 책상에<br/>감정의 지도를 펼쳐 두었어요.' },
];
const DEFAULT_TEXT = HEADLINES[3].text;

export default function HeroHeadline() {
  const [text, setText] = useState(DEFAULT_TEXT); // 서버 렌더와 동일한 값으로 시작해 hydration 불일치를 피한다.

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      const match = HEADLINES.find((b) => h >= b.from && h < b.to);
      if (match) setText(match.text);
    };
    update();
    const timer = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <h1
      className="font-display-serif text-[32px] md:text-[42px] leading-[1.4]"
      style={{ letterSpacing: '-.01em' }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}
