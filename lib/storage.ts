'use client';

import { useState, useEffect, useCallback } from 'react';
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

export function useLocalStorage<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [key]);

  const set = useCallback((val: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [key]);

  return [value, set, loaded];
}

const INITIAL_DATA: AppData = {
  tasks: [],
  projects: [],
  notes: [],
  plannerEvents: [],
};

export function useAppData() {
  const [data, setData, loaded] = useLocalStorage<AppData>('lifeos-data', INITIAL_DATA);

  const updateData = useCallback(<K extends keyof AppData>(key: K, updater: (prev: AppData[K]) => AppData[K]) => {
    setData(prev => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  }, [setData]);

  return { data, setData, updateData, loaded };
}