'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppData, genId, today, formatDate } from '@/lib/storage';
import type { Task, Priority, QAItem, ChecklistItem, TaskLink } from '@/lib/types';

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [value]);
  return ref;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#27ae60',
  medium: '#f39c12',
  high: '#e67e22',
  urgent: '#c0392b',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil',
};

const STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'Bekliyor',
  'in-progress': 'Devam',
  'in-review': 'İncelemede',
  blocked: 'Engelli',
  done: 'Tamamlandı',
};

const STATUS_COLORS: Record<Task['status'], string> = {
  todo: '#6b665d',
  'in-progress': '#b8956a',
  'in-review': '#9b59b6',
  blocked: '#c0392b',
  done: '#27ae60',
};

// Hızlı tıklama akışı (Engelli hariç; o sadece dropdown'dan seçilir)
const STATUS_CYCLE: Task['status'][] = ['todo', 'in-progress', 'in-review', 'done'];

function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: PRIORITY_COLORS[priority],
        flexShrink: 0,
      }}
    />
  );
}

// ---------- Detail building blocks ----------

function Section({ title, children, mono }: { title: string; children: React.ReactNode; mono?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 20 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 0,
          marginBottom: open ? 12 : 0,
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--muted)', transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</span>
      </button>
      {open && <div style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? 13 : 14 }}>{children}</div>}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, mono, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; rows?: number }) {
  const ref = useAutoGrow(value);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: mono ? 12 : 13,
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        lineHeight: 1.6,
        background: 'var(--bg)',
        color: 'var(--dark)',
        resize: 'none',
        overflow: 'hidden',
        minHeight: 0,
        boxSizing: 'border-box',
      }}
    />
  );
}

function AutoTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useAutoGrow(props.value);
  return <textarea ref={ref} {...props} style={{ ...props.style, resize: 'none', overflow: 'hidden' }} />;
}

function Checklist({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const [text, setText] = useState('');
  function add() {
    if (!text.trim()) return;
    onChange([...items, { id: genId(), text: text.trim(), done: false }]);
    setText('');
  }
  const doneCount = items.filter(i => i.done).length;
  return (
    <div>
      {items.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{doneCount}/{items.length} tamamlandı</div>
      )}
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input type="checkbox" checked={item.done} onChange={e => onChange(items.map(i => i.id === item.id ? { ...i, done: e.target.checked } : i))} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--muted)' : 'var(--dark)', flex: 1 }}>{item.text}</span>
          <button onClick={() => onChange(items.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, opacity: 0.5 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          placeholder="Yeni kriter..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }}
        />
        <button onClick={add} style={{ padding: '5px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}

function References({ items, onChange }: { items: TaskLink[]; onChange: (items: TaskLink[]) => void }) {
  const [form, setForm] = useState({ label: '', url: '' });
  function add() {
    if (!form.url.trim()) return;
    onChange([...items, { id: genId(), label: form.label.trim() || form.url.trim(), url: form.url.trim() }]);
    setForm({ label: '', url: '' });
  }
  const safe = (u: string) => (/^(https?:|mailto:)/i.test(u) ? u : `https://${u}`);
  return (
    <div>
      {items.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>Henüz bağlantı yok.</p>}
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ color: 'var(--accent)' }}>🔗</span>
          <a href={safe(item.url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</a>
          <button onClick={() => onChange(items.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, opacity: 0.5 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input placeholder="Etiket" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={{ width: 110, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }} />
        <input placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} onKeyDown={e => e.key === 'Enter' && add()} style={{ flex: 1, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }} />
        <button onClick={add} style={{ padding: '5px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}

function ProblemSolutions({ items, onChange }: { items: QAItem[]; onChange: (items: QAItem[]) => void }) {
  function add() {
    onChange([...items, { id: genId(), question: '', answer: '' }]);
  }
  function update(id: string, patch: Partial<QAItem>) {
    onChange(items.map(i => i.id === id ? { ...i, ...patch } : i));
  }
  function remove(id: string) {
    onChange(items.filter(i => i.id !== id));
  }
  return (
    <div>
      {items.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>Henüz soru-cevap yok.</p>}
      {items.map((item, idx) => (
        <div key={item.id} style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Q{idx + 1}</span>
            <input
              value={item.question}
              onChange={e => update(item.id, { question: e.target.value })}
              placeholder="Soru / problem..."
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--dark)', outline: 'none' }}
            />
            <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, opacity: 0.5 }}>×</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>A{idx + 1}</span>
            <AutoTextArea
              value={item.answer}
              onChange={e => update(item.id, { answer: e.target.value })}
              placeholder="Cevap / çözüm..."
              rows={2}
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, lineHeight: 1.6, background: 'var(--surface)', color: 'var(--dark)' }}
            />
          </div>
        </div>
      ))}
      <button onClick={add} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Soru-Cevap Ekle</button>
    </div>
  );
}

function TaskDetail({ task, projectTitle, onUpdate, onClose }: {
  task: Task;
  projectTitle?: string;
  onUpdate: (t: Task) => void;
  onClose: () => void;
}) {
  function set<K extends keyof Task>(key: K, val: Task[K]) {
    onUpdate({ ...task, [key]: val });
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 60px' }}>
      {/* Back */}
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Görevler
      </button>

      {/* Task header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 16, borderBottom: '2px solid var(--border)' }}>
        <PriorityDot priority={task.priority} />
        <input
          value={task.title}
          onChange={e => set('title', e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--dark)', outline: 'none' }}
          placeholder="Görev Başlığı"
        />
        <select
          value={task.status}
          onChange={e => set('status', e.target.value as Task['status'])}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--bg)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {(Object.keys(STATUS_LABELS) as Task['status'][]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        <select
          value={task.priority}
          onChange={e => set('priority', e.target.value as Priority)}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)', cursor: 'pointer' }}
        >
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        <input
          type="date"
          value={task.dueDate ?? ''}
          onChange={e => set('dueDate', e.target.value || undefined)}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }}
        />
        <input
          value={task.estimate ?? ''}
          onChange={e => set('estimate', e.target.value || undefined)}
          placeholder="Tahmin (2h)"
          style={{ width: 90, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }}
        />
        <input
          value={task.timeSpent ?? ''}
          onChange={e => set('timeSpent', e.target.value || undefined)}
          placeholder="Harcanan"
          style={{ width: 90, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }}
        />
        {projectTitle && (
          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--border)', padding: '4px 10px', borderRadius: 10 }}>{projectTitle}</span>
        )}
      </div>

      {task.updatedAt && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -20, marginBottom: 24 }}>
          Son güncelleme: {new Date(task.updatedAt).toLocaleString('tr-TR')}
        </div>
      )}

      {/* Description */}
      <Section title="Açıklama">
        <TextArea value={task.description ?? ''} onChange={v => set('description', v || undefined)} placeholder="Görevin kısa açıklaması..." rows={2} />
      </Section>

      <Section title="Acceptance Criteria">
        <Checklist items={task.acceptanceCriteria ?? []} onChange={items => set('acceptanceCriteria', items)} />
      </Section>

      <Section title="Design Decision">
        <TextArea value={task.designDecision ?? ''} onChange={v => set('designDecision', v)} placeholder="Tasarım kararları, mimari seçimler ve gerekçeleri..." />
      </Section>

      <Section title="Backend Development">
        <TextArea value={task.backendDev ?? ''} onChange={v => set('backendDev', v)} placeholder="API, servis, veri katmanı geliştirme notları..." />
      </Section>

      <Section title="Frontend Development">
        <TextArea value={task.frontendDev ?? ''} onChange={v => set('frontendDev', v)} placeholder="UI bileşenleri, state, entegrasyon notları..." />
      </Section>

      <Section title="Configuration Development">
        <TextArea value={task.configDev ?? ''} onChange={v => set('configDev', v)} placeholder="Env, feature flag, deployment ve config değişiklikleri..." />
      </Section>

      <Section title="JSON" mono>
        <TextArea value={task.jsonSnippet ?? ''} onChange={v => set('jsonSnippet', v)} placeholder={'{\n  "key": "value"\n}'} mono rows={6} />
      </Section>

      <Section title="Problem & Solution">
        <ProblemSolutions items={task.problemSolutions ?? []} onChange={items => set('problemSolutions', items)} />
      </Section>

      <Section title="Code Review" mono>
        <TextArea value={task.codeReview ?? ''} onChange={v => set('codeReview', v)} placeholder="PR linki, review yorumları, talep edilen değişiklikler..." mono />
      </Section>

      <Section title="References / Links">
        <References items={task.references ?? []} onChange={items => set('references', items)} />
      </Section>

      <Section title="Notes">
        <TextArea value={task.taskNotes ?? ''} onChange={v => set('taskNotes', v)} placeholder="Serbest notlar..." />
      </Section>
    </div>
  );
}

// ---------- Detail completeness indicator ----------

function detailCount(task: Task): number {
  let n = 0;
  if (task.designDecision?.trim()) n++;
  if (task.backendDev?.trim()) n++;
  if (task.frontendDev?.trim()) n++;
  if (task.configDev?.trim()) n++;
  if (task.jsonSnippet?.trim()) n++;
  if ((task.problemSolutions ?? []).length) n++;
  if (task.codeReview?.trim()) n++;
  if (task.taskNotes?.trim()) n++;
  if ((task.acceptanceCriteria ?? []).length) n++;
  if ((task.references ?? []).length) n++;
  return n;
}

export default function TasksPage() {
  const { data, updateData, loaded } = useAppData();
  const [filter, setFilter] = useState<'all' | Task['status']>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    dueDate: '',
    projectId: '',
  });

  if (!loaded) {
    return <div style={{ padding: 40, color: 'var(--muted)' }}>Yükleniyor...</div>;
  }

  const selectedTask = data.tasks.find(t => t.id === selectedId);

  function updateTask(task: Task) {
    const stamped = { ...task, updatedAt: new Date().toISOString() };
    updateData('tasks', prev => prev.map(t => t.id === task.id ? stamped : t));
  }

  if (selectedTask) {
    const project = data.projects.find(p => p.id === selectedTask.projectId);
    return (
      <div style={{ padding: '32px 0' }}>
        <TaskDetail
          task={selectedTask}
          projectTitle={project?.title}
          onUpdate={updateTask}
          onClose={() => setSelectedId(null)}
        />
      </div>
    );
  }

  const tasks = data.tasks.filter(t => filter === 'all' ? true : t.status === filter);
  const countByStatus = (s: Task['status']) => data.tasks.filter(t => t.status === s).length;
  const todo = countByStatus('todo');
  const inProgress = countByStatus('in-progress');
  const inReview = countByStatus('in-review');
  const blocked = countByStatus('blocked');
  const done = countByStatus('done');

  function addTask() {
    if (!form.title.trim()) return;
    const task: Task = {
      id: genId(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      status: 'todo',
      projectId: form.projectId || undefined,
      dueDate: form.dueDate || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      problemSolutions: [],
      acceptanceCriteria: [],
      references: [],
    };
    updateData('tasks', prev => [task, ...prev]);
    setForm({ title: '', description: '', priority: 'medium', dueDate: '', projectId: '' });
    setShowForm(false);
  }

  function toggleStatus(task: Task) {
    // Engelli durumundan tıklayınca akışın başına dön; diğerleri sırayla ilerler
    const curIdx = STATUS_CYCLE.indexOf(task.status);
    const next: Task['status'] = curIdx === -1 ? 'todo' : STATUS_CYCLE[(curIdx + 1) % STATUS_CYCLE.length];
    updateData('tasks', prev => prev.map(t => t.id === task.id ? { ...t, status: next, updatedAt: new Date().toISOString(), completedAt: next === 'done' ? new Date().toISOString() : undefined } : t));
  }

  function deleteTask(id: string) {
    updateData('tasks', prev => prev.filter(t => t.id !== id));
  }

  const filterTab = (label: string, val: typeof filter, count: number) => (
    <button
      onClick={() => setFilter(val)}
      style={{
        padding: '6px 14px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: filter === val ? 600 : 400,
        background: filter === val ? 'var(--accent)' : 'transparent',
        color: filter === val ? '#fff' : 'var(--muted)',
        transition: 'all 0.15s',
      }}
    >
      {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
    </button>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Görevler</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {todo} bekliyor &middot; {inProgress} devam &middot; {inReview} incelemede{blocked > 0 ? ` · ${blocked} engelli` : ''} &middot; {done} tamamlandı
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + Yeni Görev
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
        }}>
          <input
            autoFocus
            placeholder="Görev başlığı..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 10,
              color: 'var(--dark)',
            }}
          />
          <AutoTextArea
            placeholder="Açıklama (isteğe bağlı)..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--muted)',
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
              style={{
                padding: '5px 10px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg)',
                fontSize: 12,
                color: 'var(--dark)',
                cursor: 'pointer',
              }}
            >
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map(p => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              style={{
                padding: '5px 10px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg)',
                fontSize: 12,
                color: 'var(--dark)',
              }}
            />
            <select
              value={form.projectId}
              onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
              style={{
                padding: '5px 10px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg)',
                fontSize: 12,
                color: 'var(--dark)',
                cursor: 'pointer',
              }}
            >
              <option value="">Proje yok</option>
              {data.projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', fontSize: 12, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={addTask}
                style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: '4px', background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}>
        {filterTab('Tümü', 'all', data.tasks.length)}
        {filterTab('Bekliyor', 'todo', todo)}
        {filterTab('Devam', 'in-progress', inProgress)}
        {filterTab('İncelemede', 'in-review', inReview)}
        {filterTab('Engelli', 'blocked', blocked)}
        {filterTab('Tamamlandı', 'done', done)}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13 }}>
            Henüz görev yok. Yukarıdan ekleyebilirsin.
          </div>
        )}
        {tasks.map(task => {
          const project = data.projects.find(p => p.id === task.projectId);
          const isOverdue = task.dueDate && task.dueDate < today() && task.status !== 'done';
          const filled = detailCount(task);
          return (
            <div
              key={task.id}
              onClick={() => setSelectedId(task.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                opacity: task.status === 'done' ? 0.6 : 1,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Status toggle */}
              <button
                onClick={e => { e.stopPropagation(); toggleStatus(task); }}
                title={STATUS_LABELS[task.status]}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: task.status === 'blocked' || task.status === 'in-progress' ? 4 : '50%',
                  border: `2px solid ${task.status === 'todo' ? 'var(--border)' : STATUS_COLORS[task.status]}`,
                  background: task.status === 'done' ? STATUS_COLORS.done : task.status === 'todo' ? 'transparent' : `${STATUS_COLORS[task.status]}33`,
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {task.status === 'done' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {task.status === 'blocked' && (
                  <span style={{ color: STATUS_COLORS.blocked, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>!</span>
                )}
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PriorityDot priority={task.priority} />
                  <span style={{
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    color: task.status === 'done' ? 'var(--muted)' : 'var(--dark)',
                  }}>
                    {task.title}
                  </span>
                  {(task.status === 'in-progress' || task.status === 'in-review' || task.status === 'blocked') && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: STATUS_COLORS[task.status], border: `1px solid ${STATUS_COLORS[task.status]}`, padding: '1px 6px', borderRadius: 10 }}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  )}
                  {project && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--border)', padding: '2px 7px', borderRadius: 10 }}>
                      {project.title}
                    </span>
                  )}
                  {filled > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--accent)', border: '1px solid var(--accent)', padding: '1px 6px', borderRadius: 10, opacity: 0.8 }}>
                      {filled} bölüm
                    </span>
                  )}
                </div>
                {task.description && (
                  <p style={{ margin: '4px 0 0 16px', fontSize: 12, color: 'var(--muted)' }}>{task.description}</p>
                )}
                {task.dueDate && (
                  <span style={{ marginLeft: 16, fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--muted)', marginTop: 4, display: 'inline-block' }}>
                    {isOverdue ? '! ' : ''}{formatDate(task.dueDate)}
                  </span>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, opacity: 0.4, flexShrink: 0 }}
                className="hover:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
