'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppData } from './types';

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const INITIAL_DATA: AppData = {
  tasks: [],
  projects: [],
  notes: [],
  plannerEvents: [],
};

// Verileri sunucudaki data/lifeos.json dosyasında tutar (bkz. app/api/data/route.ts).
// Okuma: mount'ta GET. Yazma: her değişiklikte debounce'lu PUT (dosyayı dövmemek için).
export function useAppData() {
  const [data, setDataState] = useState<AppData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data')
      .then(r => r.json())
      .then((d: AppData) => {
        if (!cancelled) setDataState({ ...INITIAL_DATA, ...d });
      })
      .catch(() => {
        // ağ hatası: boş veriyle devam et
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  function putData(next: AppData) {
    return fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  }

  const persist = useCallback((next: AppData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      putData(next).catch(() => {
        // yazma hatası sessizce yutuluyor; bir sonraki değişiklikte tekrar denenecek
      });
    }, 400);
  }, []);

  // Debounce'u atlayıp veriyi HEMEN kaydeder ve promise döner.
  // Yönlendirmeden (örn. yeni not açma) önce kaybı önlemek için kullanılır.
  const saveNow = useCallback(async (next: AppData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await putData(next);
    } catch {
      // sessiz
    }
  }, []);

  const setData = useCallback((val: AppData | ((prev: AppData) => AppData)) => {
    setDataState(prev => {
      const next = typeof val === 'function' ? (val as (p: AppData) => AppData)(prev) : val;
      persist(next);
      return next;
    });
  }, [persist]);

  const updateData = useCallback(<K extends keyof AppData>(key: K, updater: (prev: AppData[K]) => AppData[K]) => {
    setData(prev => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  }, [setData]);

  return { data, setData, updateData, saveNow, loaded };
}