'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppData, genId } from '@/lib/storage';
import type { Block, BlockType } from '@/lib/types';

const BLOCK_PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Yazmaya başla... '/' ile blok ekle",
  heading1: 'Başlık 1',
  heading2: 'Başlık 2',
  heading3: 'Başlık 3',
  bullet: 'Liste öğesi',
  todo: 'Yapılacak iş',
  quote: 'Alıntı',
  code: 'Kod',
};

const BLOCK_STYLES: Partial<Record<BlockType, React.CSSProperties>> = {
  heading1: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' },
  heading2: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' },
  heading3: { fontSize: 16, fontWeight: 600 },
  quote: { borderLeft: '3px solid var(--accent)', paddingLeft: 16, color: 'var(--muted)', fontStyle: 'italic' },
  code: { fontFamily: 'var(--font-mono)', fontSize: 13, background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: 4 },
};

function BlockEditor({ block, onUpdate, onKeyDown, onFocus, autoFocus }: {
  block: Block;
  onUpdate: (id: string, partial: Partial<Block>) => void;
  onKeyDown: (id: string, e: React.KeyboardEvent) => void;
  onFocus: (id: string) => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  // auto-resize
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [block.content]);

  const style: React.CSSProperties = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    resize: 'none',
    outline: 'none',
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--dark)',
    padding: 0,
    minHeight: 28,
    overflow: 'hidden',
    ...BLOCK_STYLES[block.type],
  };

  if (block.type === 'todo') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <input
          type="checkbox"
          checked={block.checked ?? false}
          onChange={e => onUpdate(block.id, { checked: e.target.checked })}
          style={{ marginTop: 6, accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
        <textarea
          ref={ref}
          value={block.content}
          placeholder={BLOCK_PLACEHOLDERS[block.type]}
          onChange={e => onUpdate(block.id, { content: e.target.value })}
          onKeyDown={e => onKeyDown(block.id, e)}
          onFocus={() => onFocus(block.id)}
          rows={1}
          style={{ ...style, textDecoration: block.checked ? 'line-through' : 'none', color: block.checked ? 'var(--muted)' : 'var(--dark)' }}
        />
      </div>
    );
  }

  if (block.type === 'bullet') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ color: 'var(--accent)', marginTop: 6, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>•</span>
        <textarea
          ref={ref}
          value={block.content}
          placeholder={BLOCK_PLACEHOLDERS[block.type]}
          onChange={e => onUpdate(block.id, { content: e.target.value })}
          onKeyDown={e => onKeyDown(block.id, e)}
          onFocus={() => onFocus(block.id)}
          rows={1}
          style={style}
        />
      </div>
    );
  }

  return (
    <textarea
      ref={ref}
      value={block.content}
      placeholder={BLOCK_PLACEHOLDERS[block.type]}
      onChange={e => onUpdate(block.id, { content: e.target.value })}
      onKeyDown={e => onKeyDown(block.id, e)}
      onFocus={() => onFocus(block.id)}
      rows={1}
      style={style}
    />
  );
}

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data, updateData, loaded } = useAppData();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [newBlockId, setNewBlockId] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [menuForId, setMenuForId] = useState<string | null>(null);

  if (!loaded) return <div style={{ padding: 40, color: 'var(--muted)' }}>Yükleniyor...</div>;

  const note = data.notes.find(n => n.id === id);
  if (!note) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Not bulunamadı.</p>
        <button onClick={() => router.push('/notes')} style={{ marginTop: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ← Notlara dön
        </button>
      </div>
    );
  }

  function updateNote(partial: { title?: string; blocks?: Block[] }) {
    updateData('notes', prev => prev.map(n => n.id === id ? { ...n, ...partial, updatedAt: new Date().toISOString() } : n));
  }

  function updateBlock(blockId: string, partial: Partial<Block>) {
    const blocks = note!.blocks.map(b => b.id === blockId ? { ...b, ...partial } : b);
    updateNote({ blocks });
  }

  function handleBlockKeyDown(blockId: string, e: React.KeyboardEvent) {
    const idx = note!.blocks.findIndex(b => b.id === blockId);
    const block = note!.blocks[idx];

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // Check for slash commands
      if (block.content.startsWith('/')) {
        setMenuForId(blockId);
        setShowBlockMenu(true);
        return;
      }

      // New block after current
      const newId = genId();
      const blocks = [...note!.blocks];
      blocks.splice(idx + 1, 0, { id: newId, type: block.type === 'bullet' || block.type === 'todo' ? block.type : 'paragraph', content: '' });
      updateNote({ blocks });
      setNewBlockId(newId);
    }

    if (e.key === 'Backspace' && block.content === '' && note!.blocks.length > 1) {
      e.preventDefault();
      const blocks = note!.blocks.filter(b => b.id !== blockId);
      updateNote({ blocks });
      if (idx > 0) setNewBlockId(note!.blocks[idx - 1].id);
    }
  }

  function changeBlockType(blockId: string, type: BlockType) {
    updateBlock(blockId, { type, content: '', checked: false });
    setShowBlockMenu(false);
    setMenuForId(null);
    setNewBlockId(blockId);
  }

  const BLOCK_TYPE_OPTIONS: { type: BlockType; label: string; icon: string }[] = [
    { type: 'paragraph', label: 'Paragraf', icon: '¶' },
    { type: 'heading1', label: 'Başlık 1', icon: 'H1' },
    { type: 'heading2', label: 'Başlık 2', icon: 'H2' },
    { type: 'heading3', label: 'Başlık 3', icon: 'H3' },
    { type: 'bullet', label: 'Liste', icon: '•' },
    { type: 'todo', label: 'Yapılacak', icon: '☐' },
    { type: 'quote', label: 'Alıntı', icon: '"' },
    { type: 'code', label: 'Kod', icon: '</>' },
  ];

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px' }}>
      {/* Back */}
      <button
        onClick={() => router.push('/notes')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Notlar
      </button>

      {/* Title */}
      <input
        value={note.title}
        onChange={e => updateNote({ title: e.target.value })}
        placeholder="Başlıksız"
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          marginBottom: 4,
          color: 'var(--dark)',
          outline: 'none',
        }}
      />
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>
        Son güncelleme: {new Date(note.updatedAt).toLocaleString('tr-TR')}
      </div>

      {/* Blocks */}
      <div>
        {note.blocks.map((block, idx) => (
          <div key={block.id} style={{ position: 'relative', marginBottom: 4 }}>
            {/* Block menu for slash commands */}
            {showBlockMenu && menuForId === block.id && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  minWidth: 200,
                  overflow: 'hidden',
                }}
              >
                {BLOCK_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.type}
                    onMouseDown={() => changeBlockType(block.id, opt.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      textAlign: 'left',
                      color: 'var(--dark)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(154,123,79,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ width: 24, textAlign: 'center', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <BlockEditor
              block={block}
              onUpdate={updateBlock}
              onKeyDown={handleBlockKeyDown}
              onFocus={id => { setFocusedId(id); setShowBlockMenu(false); }}
              autoFocus={block.id === newBlockId}
            />
          </div>
        ))}
      </div>

      {/* Add block button */}
      <button
        onClick={() => {
          const newId = genId();
          updateNote({ blocks: [...note.blocks, { id: newId, type: 'paragraph', content: '' }] });
          setNewBlockId(newId);
        }}
        style={{
          marginTop: 16,
          background: 'none',
          border: '1px dashed var(--border)',
          borderRadius: 6,
          padding: '6px 14px',
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--muted)',
          width: '100%',
          textAlign: 'left',
        }}
      >
        + Blok ekle
      </button>
    </div>
  );
}
