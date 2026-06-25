import React from 'react';

// Satır-içi markdown'ı React düğümlerine çevirir (HTML enjeksiyonu YOK, güvenli).
// Destekler: **kalın**, *italik* / _italik_, ~~üstü çizili~~, `kod`, [metin](url)
// Link'ler sadece http(s) ve mailto için tıklanabilir olur.

const RULES: { regex: RegExp; build: (inner: React.ReactNode, m: RegExpMatchArray, key: number) => React.ReactNode }[] = [
  // [metin](url)
  {
    regex: /\[([^\]]+)\]\(([^)\s]+)\)/,
    build: (_inner, m, key) => {
      const href = m[2];
      const safe = /^(https?:|mailto:)/i.test(href) ? href : '#';
      return (
        <a key={key} href={safe} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          {renderInline(m[1], key * 1000)}
        </a>
      );
    },
  },
  // **kalın**
  { regex: /\*\*([^*]+)\*\*/, build: (_i, m, key) => <strong key={key}>{renderInline(m[1], key * 1000)}</strong> },
  // ~~üstü çizili~~
  { regex: /~~([^~]+)~~/, build: (_i, m, key) => <span key={key} style={{ textDecoration: 'line-through', opacity: 0.7 }}>{renderInline(m[1], key * 1000)}</span> },
  // `kod`
  { regex: /`([^`]+)`/, build: (_i, m, key) => <code key={key} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9em', background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>{m[1]}</code> },
  // *italik* veya _italik_
  { regex: /\*([^*]+)\*|_([^_]+)_/, build: (_i, m, key) => <em key={key}>{renderInline(m[1] ?? m[2], key * 1000)}</em> },
];

export function renderInline(text: string, keyBase = 0): React.ReactNode {
  if (!text) return text;

  // En erken eşleşen kuralı bul
  let earliest: { idx: number; len: number; node: React.ReactNode } | null = null;
  for (const rule of RULES) {
    const m = rule.regex.exec(text);
    if (m && m.index !== undefined) {
      if (!earliest || m.index < earliest.idx) {
        earliest = { idx: m.index, len: m[0].length, node: rule.build(null, m, keyBase + m.index) };
      }
    }
  }

  if (!earliest) return text;

  const before = text.slice(0, earliest.idx);
  const after = text.slice(earliest.idx + earliest.len);
  return (
    <>
      {before}
      {earliest.node}
      {renderInline(after, keyBase + earliest.idx + earliest.len)}
    </>
  );
}
