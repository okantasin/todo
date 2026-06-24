'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  {
    href: '/tasks',
    label: 'Görevler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: '/planner',
    label: 'Planlayıcı',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/notes',
    label: 'Notlar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Projeler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', width: '220px', flexShrink: 0 }}
      className="flex flex-col h-full"
    >
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em', color: 'var(--accent)' }}>
          LifeOS
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <nav className="flex-1 overflow-auto" style={{ padding: '12px 8px' }}>
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '2px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'var(--dark)',
                background: active ? 'rgba(154,123,79,0.1)' : 'transparent',
                transition: 'all 0.15s',
              }}
              className="hover:bg-[rgba(154,123,79,0.06)]"
            >
              <span style={{ opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>
        v1.0 &mdash; LocalStorage
      </div>
    </aside>
  );
}
