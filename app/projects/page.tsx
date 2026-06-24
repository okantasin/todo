'use client';

import { useState } from 'react';
import { useAppData, genId } from '@/lib/storage';
import type { Project, ChecklistItem, BugEntry } from '@/lib/types';

const PROJECT_COLORS = ['#9a7b4f', '#3498db', '#27ae60', '#e67e22', '#9b59b6', '#c0392b'];

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

function Checklist({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const [newText, setNewText] = useState('');
  function add() {
    if (!newText.trim()) return;
    onChange([...items, { id: genId(), text: newText.trim(), done: false }]);
    setNewText('');
  }
  return (
    <div>
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={item.done}
            onChange={e => onChange(items.map(i => i.id === item.id ? { ...i, done: e.target.checked } : i))}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--muted)' : 'var(--dark)', flex: 1 }}>{item.text}</span>
          <button
            onClick={() => onChange(items.filter(i => i.id !== item.id))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, opacity: 0.5 }}
          >×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          placeholder="Yeni madde..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }}
        />
        <button onClick={add} style={{ padding: '5px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}

function TextArea({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
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
        resize: 'vertical',
      }}
    />
  );
}

function ProjectDetail({ project, onUpdate, onClose }: {
  project: Project;
  onUpdate: (p: Project) => void;
  onClose: () => void;
}) {
  function set<K extends keyof Project>(key: K, val: Project[K]) {
    onUpdate({ ...project, [key]: val });
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 60px' }}>
      {/* Back */}
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Projeler
      </button>

      {/* Project header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid var(--border)' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
        <input
          value={project.title}
          onChange={e => set('title', e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--dark)', outline: 'none' }}
          placeholder="Proje Başlığı"
        />
        <select
          value={project.status}
          onChange={e => set('status', e.target.value as Project['status'])}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--bg)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          <option value="active">Aktif</option>
          <option value="paused">Duraklatıldı</option>
          <option value="done">Tamamlandı</option>
        </select>
      </div>

      {/* 12 sections */}
      <Section title="Overview">
        <TextArea value={project.overview ?? ''} onChange={v => set('overview', v)} placeholder="Projeye genel bakış..." />
      </Section>

      <Section title="Summary">
        <TextArea value={project.summary ?? ''} onChange={v => set('summary', v)} placeholder="Kısa özet..." />
      </Section>

      <Section title="Context">
        <TextArea value={project.context ?? ''} onChange={v => set('context', v)} placeholder="Bağlam ve gereksinimler..." />
      </Section>

      <Section title="Technical Analysis">
        <TextArea value={project.technicalAnalysis ?? ''} onChange={v => set('technicalAnalysis', v)} placeholder="Teknik analiz notları..." />
      </Section>

      <Section title="Implementation Checklist">
        <Checklist
          items={project.implementationChecklist ?? []}
          onChange={items => set('implementationChecklist', items)}
        />
      </Section>

      <Section title="Open Questions">
        <TextArea value={project.openQuestions ?? ''} onChange={v => set('openQuestions', v)} placeholder="Açık sorular ve belirsizlikler..." />
      </Section>

      <Section title="Test Scenarios">
        <TextArea value={project.testScenarios ?? ''} onChange={v => set('testScenarios', v)} placeholder="Test senaryoları..." />
      </Section>

      <Section title="Local Testing" mono>
        <TextArea value={project.localTesting ?? ''} onChange={v => set('localTesting', v)} placeholder="# Lokal test komutları..." mono />
      </Section>

      <Section title="Database Notes" mono>
        <TextArea value={project.databaseNotes ?? ''} onChange={v => set('databaseNotes', v)} placeholder="-- SQL sorgular, migration notları..." mono />
      </Section>

      <Section title="Bug Log">
        <BugLog bugs={project.bugLog ?? []} onChange={bugs => set('bugLog', bugs)} />
      </Section>

      <Section title="Commit & PR" mono>
        <TextArea value={project.commitPR ?? ''} onChange={v => set('commitPR', v)} placeholder="git log --oneline, PR link..." mono />
      </Section>

      <Section title="Closure Checklist">
        <Checklist
          items={project.closureChecklist ?? []}
          onChange={items => set('closureChecklist', items)}
        />
      </Section>
    </div>
  );
}

function BugLog({ bugs, onChange }: { bugs: BugEntry[]; onChange: (bugs: BugEntry[]) => void }) {
  const [form, setForm] = useState({ description: '', severity: 'medium' as BugEntry['severity'] });

  function add() {
    if (!form.description.trim()) return;
    onChange([...bugs, {
      id: genId(),
      description: form.description.trim(),
      severity: form.severity,
      status: 'open',
      createdAt: new Date().toISOString(),
    }]);
    setForm({ description: '', severity: 'medium' });
  }

  const SEVERITY_COLORS: Record<BugEntry['severity'], string> = {
    low: '#27ae60',
    medium: '#f39c12',
    high: '#e67e22',
    critical: '#c0392b',
  };

  return (
    <div>
      {bugs.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>Bug kaydı yok.</p>}
      {bugs.map(bug => (
        <div key={bug.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLORS[bug.severity], flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, textDecoration: bug.status === 'fixed' ? 'line-through' : 'none', color: bug.status !== 'open' ? 'var(--muted)' : 'var(--dark)' }}>
            {bug.description}
          </span>
          <select
            value={bug.status}
            onChange={e => onChange(bugs.map(b => b.id === bug.id ? { ...b, status: e.target.value as BugEntry['status'] } : b))}
            style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', background: 'var(--surface)', cursor: 'pointer' }}
          >
            <option value="open">Açık</option>
            <option value="fixed">Düzeltildi</option>
            <option value="wontfix">Geçildi</option>
          </select>
          <button
            onClick={() => onChange(bugs.filter(b => b.id !== bug.id))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, opacity: 0.5 }}
          >×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          placeholder="Bug açıklaması..."
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--dark)' }}
        />
        <select
          value={form.severity}
          onChange={e => setForm(f => ({ ...f, severity: e.target.value as BugEntry['severity'] }))}
          style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)', cursor: 'pointer' }}
        >
          <option value="low">Düşük</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksek</option>
          <option value="critical">Kritik</option>
        </select>
        <button onClick={add} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { data, updateData, loaded } = useAppData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);

  if (!loaded) return <div style={{ padding: 40, color: 'var(--muted)' }}>Yükleniyor...</div>;

  const selectedProject = data.projects.find(p => p.id === selectedId);

  function createProject() {
    if (!newTitle.trim()) return;
    const project: Project = {
      id: genId(),
      title: newTitle.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
      color: newColor,
      implementationChecklist: [],
      bugLog: [],
      closureChecklist: [],
    };
    updateData('projects', prev => [project, ...prev]);
    setNewTitle('');
    setShowForm(false);
    setSelectedId(project.id);
  }

  function updateProject(project: Project) {
    updateData('projects', prev => prev.map(p => p.id === project.id ? project : p));
  }

  function deleteProject(id: string) {
    if (confirm('Bu projeyi silmek istiyor musun?')) {
      updateData('projects', prev => prev.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  }

  if (selectedProject) {
    return (
      <div style={{ padding: '32px 0' }}>
        <ProjectDetail
          project={selectedProject}
          onUpdate={updateProject}
          onClose={() => setSelectedId(null)}
        />
      </div>
    );
  }

  const STATUS_LABELS: Record<Project['status'], string> = { active: 'Aktif', paused: 'Duraklatıldı', done: 'Tamamlandı' };
  const STATUS_COLORS: Record<Project['status'], string> = { active: '#27ae60', paused: '#f39c12', done: '#9a7b4f' };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Projeler</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{data.projects.length} proje</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          + Yeni Proje
        </button>
      </div>

      {/* New project form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <input
            autoFocus
            placeholder="Proje adı..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProject()}
            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--dark)', outline: 'none' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--dark)' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', fontSize: 12, cursor: 'pointer' }}>İptal</button>
              <button onClick={createProject} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Project list */}
      {data.projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13 }}>
          Henüz proje yok. Yukarıdan ekleyebilirsin.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.projects.map(project => {
            const taskCount = data.tasks.filter(t => t.projectId === project.id).length;
            const doneCount = data.tasks.filter(t => t.projectId === project.id && t.status === 'done').length;
            const bugsOpen = (project.bugLog ?? []).filter(b => b.status === 'open').length;
            const checkDone = (project.implementationChecklist ?? []).filter(c => c.done).length;
            const checkTotal = (project.implementationChecklist ?? []).length;

            return (
              <div
                key={project.id}
                onClick={() => setSelectedId(project.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{project.title}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
                    {taskCount > 0 && <span>{doneCount}/{taskCount} görev</span>}
                    {checkTotal > 0 && <span>{checkDone}/{checkTotal} checklist</span>}
                    {bugsOpen > 0 && <span style={{ color: '#c0392b' }}>{bugsOpen} açık bug</span>}
                  </div>
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: STATUS_COLORS[project.status],
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: `1px solid ${STATUS_COLORS[project.status]}`,
                  opacity: 0.85,
                }}>
                  {STATUS_LABELS[project.status]}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); deleteProject(project.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, opacity: 0.4, flexShrink: 0 }}
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
      )}
    </div>
  );
}
