'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppData, genId } from '@/lib/storage';
import { renderInline } from '@/lib/markdown';
import type { Block, BlockType, Note } from '@/lib/types';

const BLOCK_PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Yazmaya başla... '/' ile blok ekle",
  heading1: 'Başlık 1',
  heading2: 'Başlık 2',
  heading3: 'Başlık 3',
  bullet: 'Liste öğesi',
  numbered: 'Numaralı öğe',
  todo: 'Yapılacak iş',
  quote: 'Alıntı',
  code: 'Kod',
  divider: '',
  callout: 'Bilgi notu...',
  toggle: 'Başlık (Enter ile içerik)',
};

const BLOCK_STYLES: Partial<Record<BlockType, React.CSSProperties>> = {
  heading1: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' },
  heading2: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' },
  heading3: { fontSize: 16, fontWeight: 600 },
  quote: { borderLeft: '3px solid var(--accent)', paddingLeft: 16, color: 'var(--muted)', fontStyle: 'italic' },
  code: { fontFamily: 'var(--font-mono)', fontSize: 13 },
};

const EMOJIS = ['📝', '💡', '🎯', '🚀', '📌', '✅', '🔥', '⭐', '📚', '🧠', '💼', '🐛', '⚙️', '🎨', '📅', '❤️'];
const COVERS = ['', '#9a7b4f', '#3498db', '#27ae60', '#e67e22', '#9b59b6', '#c0392b', '#1c1a17'];

const BLOCK_TYPE_OPTIONS: { type: BlockType; label: string; icon: string }[] = [
  { type: 'paragraph', label: 'Paragraf', icon: '¶' },
  { type: 'heading1', label: 'Başlık 1', icon: 'H1' },
  { type: 'heading2', label: 'Başlık 2', icon: 'H2' },
  { type: 'heading3', label: 'Başlık 3', icon: 'H3' },
  { type: 'bullet', label: 'Liste', icon: '•' },
  { type: 'numbered', label: 'Numaralı liste', icon: '1.' },
  { type: 'todo', label: 'Yapılacak', icon: '☐' },
  { type: 'quote', label: 'Alıntı', icon: '"' },
  { type: 'callout', label: 'Bilgi kutusu', icon: '💡' },
  { type: 'toggle', label: 'Katlanabilir', icon: '▸' },
  { type: 'code', label: 'Kod', icon: '</>' },
  { type: 'divider', label: 'Ayraç', icon: '—' },
];

// Metin istatistiği: kelime ve karakter sayısı.
function countStats(text: string): { words: number; chars: number } {
  const trimmed = text.trim();
  const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  return { words, chars: text.length };
}

function noteStats(blocks: Block[]): { words: number; chars: number } {
  return blocks.reduce(
    (acc, b) => {
      const s = countStats(b.content);
      return { words: acc.words + s.words, chars: acc.chars + s.chars };
    },
    { words: 0, chars: 0 },
  );
}

// Numaralı liste sıralarını önceden hesaplar (render içinde mutasyon yapmamak için).
function computeNumbering(blocks: Block[]): number[] {
  let c = 0;
  return blocks.map(b => {
    if (b.type === 'numbered') { c += 1; return c; }
    c = 0;
    return 0;
  });
}

// Yazarken "# ", "- ", "[] " gibi önekleri blok tipine çevirir.
function detectShortcut(text: string): { type: BlockType; content: string } | null {
  const map: [RegExp, BlockType][] = [
    [/^# $/, 'heading1'],
    [/^## $/, 'heading2'],
    [/^### $/, 'heading3'],
    [/^[-*] $/, 'bullet'],
    [/^1\. $/, 'numbered'],
    [/^\[\]? ?$/, 'todo'], // "[] " veya "[ ] "
    [/^\[ \] $/, 'todo'],
    [/^> $/, 'quote'],
    [/^```$/, 'code'],
    [/^--- ?$/, 'divider'],
  ];
  for (const [re, type] of map) {
    if (re.test(text)) return { type, content: '' };
  }
  return null;
}

function BlockTextarea({ block, autoFocus, onUpdate, onKeyDown, onFocus, onBlur }: {
  block: Block;
  autoFocus?: boolean;
  onUpdate: (id: string, partial: Partial<Block>) => void;
  onKeyDown: (id: string, e: React.KeyboardEvent) => void;
  onFocus: (id: string) => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

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
    minHeight: 24,
    overflow: 'hidden',
    ...BLOCK_STYLES[block.type],
  };

  return (
    <textarea
      ref={ref}
      value={block.content}
      placeholder={BLOCK_PLACEHOLDERS[block.type]}
      onChange={e => onUpdate(block.id, { content: e.target.value })}
      onKeyDown={e => onKeyDown(block.id, e)}
      onFocus={() => onFocus(block.id)}
      onBlur={onBlur}
      rows={1}
      style={style}
    />
  );
}

// Odakta değilken bloğu markdown render ederek gösterir.
function BlockRendered({ block, onClick }: { block: Block; onClick: () => void }) {
  const base: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--dark)',
    cursor: 'text',
    minHeight: 24,
    whiteSpace: 'pre-wrap',
    ...BLOCK_STYLES[block.type],
  };

  const empty = !block.content.trim();
  const content = empty
    ? <span style={{ color: 'var(--muted)', opacity: 0.6 }}>{BLOCK_PLACEHOLDERS[block.type]}</span>
    : renderInline(block.content);

  if (block.type === 'heading1') return <h1 style={base} onClick={onClick}>{content}</h1>;
  if (block.type === 'heading2') return <h2 style={base} onClick={onClick}>{content}</h2>;
  if (block.type === 'heading3') return <h3 style={base} onClick={onClick}>{content}</h3>;
  return <div style={base} onClick={onClick}>{content}</div>;
}

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data, updateData, loaded } = useAppData();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);
  const [slashForId, setSlashForId] = useState<string | null>(null);
  const [handleMenuId, setHandleMenuId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const dragIndex = useRef<number | null>(null);

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
  const n = note;

  function updateNote(partial: Partial<Note>) {
    updateData('notes', prev => prev.map(x => x.id === id ? { ...x, ...partial, updatedAt: new Date().toISOString() } : x));
  }

  function setBlocks(blocks: Block[]) {
    updateNote({ blocks });
  }

  function updateBlock(blockId: string, partial: Partial<Block>) {
    // Markdown kısayolu: içerik bir önekle eşleşirse blok tipini değiştir
    if (partial.content !== undefined) {
      const sc = detectShortcut(partial.content);
      if (sc) {
        setBlocks(n.blocks.map(b => b.id === blockId ? { ...b, type: sc.type, content: sc.content } : b));
        return;
      }
    }
    setBlocks(n.blocks.map(b => b.id === blockId ? { ...b, ...partial } : b));
  }

  function addBlockAfter(blockId: string, type: BlockType = 'paragraph') {
    const idx = n.blocks.findIndex(b => b.id === blockId);
    const newId = genId();
    const blocks = [...n.blocks];
    blocks.splice(idx + 1, 0, { id: newId, type, content: '' });
    setBlocks(blocks);
    setAutoFocusId(newId);
    setEditingId(newId);
  }

  function handleBlockKeyDown(blockId: string, e: React.KeyboardEvent) {
    const idx = n.blocks.findIndex(b => b.id === blockId);
    const block = n.blocks[idx];

    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code' && block.type !== 'toggle' && block.type !== 'callout') {
      e.preventDefault();
      if (block.content.startsWith('/')) {
        setSlashForId(blockId);
        return;
      }
      // liste tipinde devam et, değilse paragraf
      const continueType = (block.type === 'bullet' || block.type === 'numbered' || block.type === 'todo') ? block.type : 'paragraph';
      addBlockAfter(blockId, block.content.trim() === '' ? 'paragraph' : continueType);
    }

    if (e.key === 'Backspace' && block.content === '' && n.blocks.length > 1) {
      e.preventDefault();
      const blocks = n.blocks.filter(b => b.id !== blockId);
      setBlocks(blocks);
      if (idx > 0) {
        setAutoFocusId(n.blocks[idx - 1].id);
        setEditingId(n.blocks[idx - 1].id);
      }
    }
  }

  function changeBlockType(blockId: string, type: BlockType) {
    if (type === 'divider') {
      updateBlock(blockId, { type, content: '' });
    } else {
      setBlocks(n.blocks.map(b => b.id === blockId ? { ...b, type, content: '', checked: false } : b));
    }
    setSlashForId(null);
    setHandleMenuId(null);
    setAutoFocusId(blockId);
    setEditingId(type === 'divider' ? null : blockId);
  }

  function moveBlock(blockId: string, dir: -1 | 1) {
    const idx = n.blocks.findIndex(b => b.id === blockId);
    const to = idx + dir;
    if (to < 0 || to >= n.blocks.length) return;
    const blocks = [...n.blocks];
    [blocks[idx], blocks[to]] = [blocks[to], blocks[idx]];
    setBlocks(blocks);
    setHandleMenuId(null);
  }

  function duplicateBlock(blockId: string) {
    const idx = n.blocks.findIndex(b => b.id === blockId);
    const copy = { ...n.blocks[idx], id: genId() };
    const blocks = [...n.blocks];
    blocks.splice(idx + 1, 0, copy);
    setBlocks(blocks);
    setHandleMenuId(null);
  }

  function deleteBlock(blockId: string) {
    if (n.blocks.length <= 1) {
      setBlocks([{ id: genId(), type: 'paragraph', content: '' }]);
    } else {
      setBlocks(n.blocks.filter(b => b.id !== blockId));
    }
    setHandleMenuId(null);
  }

  function onDrop(targetIdx: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIdx) return;
    const blocks = [...n.blocks];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(targetIdx, 0, moved);
    setBlocks(blocks);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || n.tags.includes(t)) { setTagInput(''); return; }
    updateNote({ tags: [...n.tags, t] });
    setTagInput('');
  }

  const numbering = computeNumbering(n.blocks);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 80px' }}>
      {/* Kapak */}
      <div style={{ height: n.cover ? 120 : 32, background: n.cover || 'transparent', borderRadius: n.cover ? '0 0 0 0' : 0, transition: 'all 0.2s', position: 'relative' }} />

      <div style={{ padding: '0 24px' }}>
        {/* Üst bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -16, marginBottom: 8 }}>
          <button
            onClick={() => router.push('/notes')}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Notlar
          </button>
          <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
            <button onClick={() => { setShowIconPicker(v => !v); setShowCoverPicker(false); }} style={miniBtn}>😀 Simge</button>
            <button onClick={() => { setShowCoverPicker(v => !v); setShowIconPicker(false); }} style={miniBtn}>🎨 Kapak</button>
            <button onClick={() => setShowPreview(v => !v)} style={{ ...miniBtn, background: showPreview ? 'var(--accent)' : 'var(--surface)', color: showPreview ? '#fff' : 'var(--muted)' }}>
              {showPreview ? '✏️ Düzenle' : '👁 Önizleme'}
            </button>

            {showIconPicker && (
              <div style={popover}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => { updateNote({ icon: em }); setShowIconPicker(false); }} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}>{em}</button>
                  ))}
                </div>
                {n.icon && <button onClick={() => { updateNote({ icon: undefined }); setShowIconPicker(false); }} style={{ ...miniBtn, marginTop: 8, width: '100%' }}>Simgeyi kaldır</button>}
              </div>
            )}
            {showCoverPicker && (
              <div style={popover}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COVERS.map(c => (
                    <button key={c || 'none'} onClick={() => { updateNote({ cover: c || undefined }); setShowCoverPicker(false); }}
                      style={{ width: 28, height: 28, borderRadius: 6, background: c || 'var(--bg)', border: c ? '2px solid transparent' : '1px dashed var(--border)', cursor: 'pointer' }} title={c || 'Kapak yok'} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simge */}
        {n.icon && (
          <button onClick={() => setShowIconPicker(true)} style={{ fontSize: 56, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, marginBottom: 4 }}>
            {n.icon}
          </button>
        )}

        {/* Başlık */}
        <input
          value={n.title}
          onChange={e => updateNote({ title: e.target.value })}
          placeholder="Başlıksız"
          style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 8, color: 'var(--dark)', outline: 'none' }}
        />

        {/* Etiketler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {n.tags.map(tag => (
            <span key={tag} style={{ fontSize: 11, background: 'var(--border)', color: 'var(--muted)', padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              #{tag}
              <button onClick={() => updateNote({ tags: n.tags.filter(t => t !== tag) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
            placeholder="+ etiket"
            style={{ border: 'none', background: 'transparent', fontSize: 11, color: 'var(--muted)', outline: 'none', width: 70 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>
          Son güncelleme: {new Date(n.updatedAt).toLocaleString('tr-TR')}
        </div>

        {/* İçerik */}
        {showPreview ? (
          <NotePreview note={n} />
        ) : (
          <div>
            {n.blocks.map((block, idx) => {
              const isEditing = editingId === block.id;

              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => { dragIndex.current = idx; }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(idx)}
                  style={{ position: 'relative', marginBottom: block.type === 'divider' ? 0 : 2, paddingLeft: 28 }}
                >
                  {/* Sol tutamaç */}
                  <button
                    onClick={() => setHandleMenuId(handleMenuId === block.id ? null : block.id)}
                    style={{ position: 'absolute', left: 0, top: 2, width: 20, height: 22, background: 'none', border: 'none', cursor: 'grab', color: 'var(--muted)', opacity: 0.35, fontSize: 14, lineHeight: 1, padding: 0 }}
                    title="Blok menüsü / sürükle"
                  >⋮⋮</button>

                  {/* Tutamaç menüsü */}
                  {handleMenuId === block.id && (
                    <div style={{ ...popover, left: 0, top: 24, minWidth: 180 }}>
                      <MenuItem onClick={() => moveBlock(block.id, -1)}>↑ Yukarı taşı</MenuItem>
                      <MenuItem onClick={() => moveBlock(block.id, 1)}>↓ Aşağı taşı</MenuItem>
                      <MenuItem onClick={() => duplicateBlock(block.id)}>⧉ Çoğalt</MenuItem>
                      <MenuItem onClick={() => deleteBlock(block.id)} danger>🗑 Sil</MenuItem>
                      <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                      <div style={{ fontSize: 10, color: 'var(--muted)', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipe çevir</div>
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {BLOCK_TYPE_OPTIONS.map(opt => (
                          <MenuItem key={opt.type} onClick={() => changeBlockType(block.id, opt.type)}>
                            <span style={{ width: 22, display: 'inline-block', color: 'var(--accent)', fontWeight: 600 }}>{opt.icon}</span>{opt.label}
                          </MenuItem>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Slash menüsü */}
                  {slashForId === block.id && (
                    <div style={{ ...popover, left: 28, top: 24 }}>
                      {BLOCK_TYPE_OPTIONS.map(opt => (
                        <MenuItem key={opt.type} onMouseDown={() => changeBlockType(block.id, opt.type)}>
                          <span style={{ width: 22, display: 'inline-block', color: 'var(--accent)', fontWeight: 600 }}>{opt.icon}</span>{opt.label}
                        </MenuItem>
                      ))}
                    </div>
                  )}

                  <BlockRow
                    block={block}
                    number={block.type === 'numbered' ? numbering[idx] : undefined}
                    isEditing={isEditing}
                    autoFocus={autoFocusId === block.id}
                    onEnterEdit={() => { setEditingId(block.id); setAutoFocusId(block.id); }}
                    onUpdate={updateBlock}
                    onKeyDown={handleBlockKeyDown}
                    onFocus={bid => { setEditingId(bid); setSlashForId(null); setHandleMenuId(null); }}
                    onBlur={() => { /* odaktan çıkınca render moduna dön */ setEditingId(cur => cur === block.id ? null : cur); }}
                  />
                </div>
              );
            })}

            <button
              onClick={() => {
                const newId = genId();
                setBlocks([...n.blocks, { id: newId, type: 'paragraph', content: '' }]);
                setAutoFocusId(newId);
                setEditingId(newId);
              }}
              style={{ marginTop: 12, marginLeft: 28, background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}
            >
              + Blok ekle
            </button>
          </div>
        )}

        {/* Canlı sayaç */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
          {(() => {
            const total = noteStats(n.blocks);
            const editingBlock = n.blocks.find(b => b.id === editingId);
            return (
              <>
                <span>{n.blocks.length} blok</span>
                <span>{total.words} kelime</span>
                <span>{total.chars} karakter</span>
                {editingBlock && (
                  <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>
                    Bu blok: {countStats(editingBlock.content).words} kelime · {countStats(editingBlock.content).chars} karakter
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// Tek bir bloğun düzenleme/render satırı (tipine göre sarmalama)
function BlockRow({ block, number, isEditing, autoFocus, onEnterEdit, onUpdate, onKeyDown, onFocus, onBlur }: {
  block: Block;
  number?: number;
  isEditing: boolean;
  autoFocus: boolean;
  onEnterEdit: () => void;
  onUpdate: (id: string, partial: Partial<Block>) => void;
  onKeyDown: (id: string, e: React.KeyboardEvent) => void;
  onFocus: (id: string) => void;
  onBlur: () => void;
}) {
  const editor = (
    <BlockTextarea block={block} autoFocus={autoFocus} onUpdate={onUpdate} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur} />
  );
  const rendered = <BlockRendered block={block} onClick={onEnterEdit} />;
  const body = isEditing ? editor : rendered;

  switch (block.type) {
    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />;

    case 'todo':
      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" checked={block.checked ?? false} onChange={e => onUpdate(block.id, { checked: e.target.checked })} style={{ marginTop: 5, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <div style={{ flex: 1, textDecoration: block.checked ? 'line-through' : 'none', opacity: block.checked ? 0.55 : 1 }}>{body}</div>
        </div>
      );

    case 'bullet':
      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: 'var(--accent)', marginTop: 5, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>•</span>
          <div style={{ flex: 1 }}>{body}</div>
        </div>
      );

    case 'numbered':
      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: 'var(--accent)', marginTop: 3, fontSize: 13, fontWeight: 600, flexShrink: 0, minWidth: 18 }}>{number}.</span>
          <div style={{ flex: 1 }}>{body}</div>
        </div>
      );

    case 'callout':
      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(154,123,79,0.08)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', margin: '4px 0' }}>
          <span style={{ fontSize: 18, lineHeight: 1.4, flexShrink: 0 }}>💡</span>
          <div style={{ flex: 1 }}>{body}</div>
        </div>
      );

    case 'toggle': {
      const [title, ...rest] = block.content.split('\n');
      const bodyText = rest.join('\n');
      return (
        <div style={{ margin: '2px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <button
              onClick={() => onUpdate(block.id, { collapsed: !block.collapsed })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, marginTop: 4, transform: block.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }}
            >▶</button>
            <div style={{ flex: 1 }}>{isEditing ? editor : <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.7, cursor: 'text' }} onClick={onEnterEdit}>{title ? renderInline(title) : <span style={{ color: 'var(--muted)', opacity: 0.6 }}>{BLOCK_PLACEHOLDERS.toggle}</span>}</div>}</div>
          </div>
          {!block.collapsed && !isEditing && bodyText.trim() && (
            <div style={{ paddingLeft: 24, marginTop: 2, fontSize: 14, lineHeight: 1.7, color: 'var(--dark)', whiteSpace: 'pre-wrap' }}>{renderInline(bodyText)}</div>
          )}
        </div>
      );
    }

    case 'code':
      return (
        <pre style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', margin: '4px 0', overflow: 'auto' }}>
          {isEditing ? editor : (
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--dark)', cursor: 'text', whiteSpace: 'pre-wrap' }} onClick={onEnterEdit}>
              {block.content || <span style={{ color: 'var(--muted)', opacity: 0.6 }}>Kod</span>}
            </code>
          )}
        </pre>
      );

    default:
      return body;
  }
}

// Tüm notu salt-okunur markdown olarak gösterir
function NotePreview({ note }: { note: Note }) {
  const numbering = computeNumbering(note.blocks);
  return (
    <div>
      {note.blocks.map((b, idx) => {
        const num = numbering[idx];
        const inline = renderInline(b.content);
        switch (b.type) {
          case 'divider': return <hr key={b.id} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />;
          case 'heading1': return <h1 key={b.id} style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 6px' }}>{inline}</h1>;
          case 'heading2': return <h2 key={b.id} style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 6px' }}>{inline}</h2>;
          case 'heading3': return <h3 key={b.id} style={{ fontSize: 16, fontWeight: 600, margin: '10px 0 4px' }}>{inline}</h3>;
          case 'bullet': return <div key={b.id} style={{ display: 'flex', gap: 8, fontSize: 14, lineHeight: 1.7 }}><span style={{ color: 'var(--accent)' }}>•</span><div>{inline}</div></div>;
          case 'numbered': return <div key={b.id} style={{ display: 'flex', gap: 8, fontSize: 14, lineHeight: 1.7 }}><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{num}.</span><div>{inline}</div></div>;
          case 'todo': return <div key={b.id} style={{ display: 'flex', gap: 8, fontSize: 14, lineHeight: 1.7 }}><input type="checkbox" checked={b.checked ?? false} readOnly /><div style={{ textDecoration: b.checked ? 'line-through' : 'none', opacity: b.checked ? 0.55 : 1 }}>{inline}</div></div>;
          case 'quote': return <div key={b.id} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 16, color: 'var(--muted)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.7, margin: '6px 0' }}>{inline}</div>;
          case 'callout': return <div key={b.id} style={{ display: 'flex', gap: 10, background: 'rgba(154,123,79,0.08)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', margin: '6px 0', fontSize: 14, lineHeight: 1.7 }}><span>💡</span><div>{inline}</div></div>;
          case 'code': return <pre key={b.id} style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', margin: '6px 0', overflow: 'auto' }}><code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{b.content}</code></pre>;
          case 'toggle': {
            const [t, ...rest] = b.content.split('\n');
            return <details key={b.id} style={{ margin: '6px 0' }}><summary style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{renderInline(t)}</summary><div style={{ paddingLeft: 18, marginTop: 4, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{renderInline(rest.join('\n'))}</div></details>;
          }
          default: return <div key={b.id} style={{ fontSize: 14, lineHeight: 1.7, margin: '4px 0', whiteSpace: 'pre-wrap' }}>{inline}</div>;
        }
      })}
    </div>
  );
}

function MenuItem({ children, onClick, onMouseDown, danger }: { children: React.ReactNode; onClick?: () => void; onMouseDown?: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', color: danger ? 'var(--danger)' : 'var(--dark)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(154,123,79,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}

const miniBtn: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--muted)', fontSize: 12,
};

const popover: React.CSSProperties = {
  position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, padding: 8, minWidth: 200,
};
