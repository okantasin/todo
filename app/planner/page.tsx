'use client';

import { useState } from 'react';
import { useAppData, genId, today } from '@/lib/storage';
import type { PlannerEvent } from '@/lib/types';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 07:00 - 23:00

const COLORS = ['#9a7b4f', '#3498db', '#27ae60', '#e67e22', '#9b59b6', '#c0392b', '#1abc9c'];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function PlannerPage() {
  const { data, updateData, loaded } = useAppData();
  const [date, setDate] = useState(today());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    color: COLORS[0],
    notes: '',
    taskId: '',
  });

  if (!loaded) return <div style={{ padding: 40, color: 'var(--muted)' }}>Yükleniyor...</div>;

  const events = data.plannerEvents.filter(e => e.date === date);

  function addEvent() {
    if (!form.title.trim()) return;
    const ev: PlannerEvent = {
      id: genId(),
      title: form.title.trim(),
      date,
      startTime: form.startTime,
      endTime: form.endTime,
      color: form.color,
      notes: form.notes.trim() || undefined,
      taskId: form.taskId || undefined,
    };
    updateData('plannerEvents', prev => [...prev, ev]);
    setForm({ title: '', startTime: '09:00', endTime: '10:00', color: COLORS[0], notes: '', taskId: '' });
    setShowForm(false);
  }

  function deleteEvent(id: string) {
    updateData('plannerEvents', prev => prev.filter(e => e.id !== id));
  }

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  }

  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  }

  function timeToY(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h - 7) * 60 + m;
  }

  const totalMinutes = 17 * 60; // 7:00 to 24:00

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevDay} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>&#8592;</button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
              {new Date(date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h1>
            {date === today() && (
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>BUGÜN</span>
            )}
          </div>
          <button onClick={nextDay} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>&#8594;</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDate(today())} style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', fontSize: 12, cursor: 'pointer' }}>
            Bugün
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Ekle
          </button>
        </div>
      </div>

      {/* Event form */}
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
            placeholder="Etkinlik başlığı..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addEvent()}
            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--dark)' }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>
              Başlangıç
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                style={{ marginLeft: 6, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)' }} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>
              Bitiş
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                style={{ marginLeft: 6, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg)' }} />
            </label>
            <div style={{ display: 'flex', gap: 5 }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 20, height: 20, borderRadius: '50%', background: c, border: form.color === c ? '2px solid var(--dark)' : '2px solid transparent', cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', fontSize: 12, cursor: 'pointer' }}>İptal</button>
              <button onClick={addEvent} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* Time grid */}
      <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Hour labels */}
        <div style={{ width: 56, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 10, paddingTop: 4, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {pad(h)}:00
            </div>
          ))}
        </div>

        {/* Grid with events */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Hour lines */}
          {HOURS.map((h, i) => (
            <div key={h} style={{ height: 60, borderBottom: '1px solid var(--border)', position: 'relative' }}>
              {/* 30-min line */}
              <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, borderBottom: '1px dashed var(--border)', opacity: 0.5 }} />
            </div>
          ))}

          {/* Events overlay */}
          <div style={{ position: 'absolute', inset: 0, padding: '0 8px' }}>
            {events.map(ev => {
              const top = timeToY(ev.startTime);
              const bottom = timeToY(ev.endTime);
              const height = Math.max(bottom - top, 30);
              return (
                <div
                  key={ev.id}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: 8,
                    right: 8,
                    height: `${height}px`,
                    background: ev.color || 'var(--accent)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 4,
                  }}
                >
                  <div>
                    <div>{ev.title}</div>
                    <div style={{ fontSize: 10, opacity: 0.85, fontFamily: 'var(--font-mono)' }}>{ev.startTime} – {ev.endTime}</div>
                  </div>
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 2, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--muted)', fontSize: 13 }}>
          Bu gün için etkinlik yok.
        </div>
      )}
    </div>
  );
}
