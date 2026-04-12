import { useState, useCallback, useMemo } from 'react';
import { Note } from '@/types/task';

const STORAGE_KEY = 'study-planner-notes';

function loadNotes(): Note[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  const update = useCallback((newNotes: Note[]) => {
    setNotes(newNotes);
    saveNotes(newNotes);
  }, []);

  const addNote = useCallback((title: string, subject: string, content: string) => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: title.trim(),
      subject: subject.trim(),
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    update([...loadNotes(), note]);
  }, [update]);

  const editNote = useCallback((id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    update(loadNotes().map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  }, [update]);

  const deleteNote = useCallback((id: string) => {
    update(loadNotes().filter(n => n.id !== id));
  }, [update]);

  const subjects = useMemo(() => {
    return [...new Set(notes.map(n => n.subject))].sort();
  }, [notes]);

  return { notes, addNote, editNote, deleteNote, subjects };
}
