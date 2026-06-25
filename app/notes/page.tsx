'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppData, genId } from '@/lib/storage';
import type { Note } from '@/lib/types';

export default function NotesPage() {
  const { data, updateData, loaded } = useAppData();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  if (!loaded) return <div style={{ padding: 40, color: 'var(--muted)' }}>Yükleniyor...</div>;

  const allTags = Array.from(new Set(data.notes.flatMap(n => n.tags))).sort();

  const q = search.toLowerCase();
  const notes = data.notes.filter(n => {
    const matchesSearch =
      search === '' ||
      n.title.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q)) ||
      n.blocks.some(b => b.content.toLowerCase().includes(q));
    const matchesTag = !activeTag || n.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

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

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            onClick={() => setActiveTag(null)}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', background: activeTag === null ? 'var(--accent)' : 'var(--surface)', color: activeTag === null ? '#fff' : 'var(--muted)' }}
          >Tümü</button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', background: activeTag === tag ? 'var(--accent)' : 'var(--surface)', color: activeTag === tag ? '#fff' : 'var(--muted)' }}
            >#{tag}</button>
          ))}
        </div>
      )}

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
                {note.cover && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: note.cover, borderRadius: '10px 10px 0 0' }} />}
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {note.icon && <span style={{ fontSize: 16 }}>{note.icon}</span>}
                    {note.title || 'Başlıksız'}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {getExcerpt(note)}
                  </p>
                  {note.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                      {note.tags.slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--border)', padding: '1px 6px', borderRadius: 8 }}>#{t}</span>
                      ))}
                    </div>
                  )}
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
