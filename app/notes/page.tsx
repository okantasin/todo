'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppData, genId } from '@/lib/storage';
import type { Note } from '@/lib/types';

export default function NotesPage() {
  const { data, updateData, loaded } = useAppData();
  const [search, setSearch] = useState('');

  if (!loaded) return <div style={{ padding: 40, color: 'var(--muted)' }}>Yükleniyor...</div>;

  const notes = data.notes.filter(n =>
    search === '' ||
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.blocks.some(b => b.content.toLowerCase().includes(search.toLowerCase()))
  );

  function createNote() {
    const note: Note = {
      id: genId(),
      title: 'Yeni Not',
      blocks: [{ id: genId(), type: 'paragraph', content: '' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };
    updateData('notes', prev => [note, ...prev]);
    // Navigate to note
    window.location.href = `/notes/${note.id}`;
  }

  function deleteNote(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Bu notu silmek istiyor musun?')) {
      updateData('notes', prev => prev.filter(n => n.id !== id));
    }
  }

  function getExcerpt(note: Note): string {
    for (const block of note.blocks) {
      if (block.content.trim()) return block.content.slice(0, 120);
    }
    return 'Boş not';
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Notlar</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{data.notes.length} not</p>
        </div>
        <button
          onClick={createNote}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          + Yeni Not
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <svg
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          placeholder="Notlarda ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px 9px 36px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            fontSize: 13,
            color: 'var(--dark)',
          }}
        />
      </div>

      {/* Notes grid */}
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13 }}>
          {search ? 'Arama sonucu bulunamadı.' : 'Henüz not yok. Yukarıdan ekleyebilirsin.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {notes.map(note => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 18,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  height: 160,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.title || 'Başlıksız'}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {getExcerpt(note)}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    onClick={e => deleteNote(note.id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, opacity: 0.5, padding: '2px 6px' }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
