'use client';

import { useState } from 'react';
import { useAppData } from '@/lib/storage';
import { genId, today, formatDate } from '@/lib/storage';
import type { Task, Priority } from '@/lib/types';

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

export default function TasksPage() {
  const { data, updateData, loaded } = useAppData();
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [showForm, setShowForm] = useState(false);
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

  const tasks = data.tasks.filter(t => filter === 'all' ? true : t.status === filter);
  const todo = data.tasks.filter(t => t.status === 'todo').length;
  const inProgress = data.tasks.filter(t => t.status === 'in-progress').length;
  const done = data.tasks.filter(t => t.status === 'done').length;

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
      tags: [],
    };
    updateData('tasks', prev => [task, ...prev]);
    setForm({ title: '', description: '', priority: 'medium', dueDate: '', projectId: '' });
    setShowForm(false);
  }

  function toggleStatus(task: Task) {
    const next: Task['status'] = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
    updateData('tasks', prev => prev.map(t => t.id === task.id ? { ...t, status: next, completedAt: next === 'done' ? new Date().toISOString() : undefined } : t));
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
            {todo} bekliyor &middot; {inProgress} devam ediyor &middot; {done} tamamlandı
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
          <textarea
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
              resize: 'none',
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
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: '4px', background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', width: 'fit-content' }}>
        {filterTab('Tümü', 'all', data.tasks.length)}
        {filterTab('Bekliyor', 'todo', todo)}
        {filterTab('Devam', 'in-progress', inProgress)}
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
          return (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                opacity: task.status === 'done' ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {/* Status toggle */}
              <button
                onClick={() => toggleStatus(task)}
                title={task.status}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: task.status === 'done' ? '50%' : task.status === 'in-progress' ? 4 : '50%',
                  border: `2px solid ${task.status === 'done' ? 'var(--accent)' : task.status === 'in-progress' ? 'var(--accent-light)' : 'var(--border)'}`,
                  background: task.status === 'done' ? 'var(--accent)' : task.status === 'in-progress' ? 'rgba(154,123,79,0.2)' : 'transparent',
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
                  {project && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--border)', padding: '2px 7px', borderRadius: 10 }}>
                      {project.title}
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
                onClick={() => deleteTask(task.id)}
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
