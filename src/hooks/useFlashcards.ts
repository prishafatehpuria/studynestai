import { useState, useCallback, useMemo } from 'react';
import { Flashcard, FlashcardDeck } from '@/types/task';

const STORAGE_KEY = 'study-planner-flashcards';

function loadDecks(): FlashcardDeck[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDecks(decks: FlashcardDeck[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

function createCard(
  type: Flashcard['type'],
  front: string,
  back: string,
  subject: string,
  sourceNoteId?: string
): Flashcard {
  return {
    id: crypto.randomUUID(),
    type,
    front,
    back,
    subject,
    sourceNoteId,
    createdAt: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    mastery: 'new',
  };
}

// SM-2 algorithm
function sm2(card: Flashcard, quality: number): Partial<Flashcard> {
  // quality: 0-5 (0=complete failure, 5=perfect)
  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  let mastery: Flashcard['mastery'] = 'new';
  if (repetitions >= 5) mastery = 'mastered';
  else if (repetitions >= 2) mastery = 'reviewing';
  else if (repetitions >= 1) mastery = 'learning';

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate: nextReview.toISOString(),
    lastReviewDate: new Date().toISOString(),
    mastery,
  };
}

export function useFlashcards() {
  const [decks, setDecks] = useState<FlashcardDeck[]>(loadDecks);

  const update = useCallback((newDecks: FlashcardDeck[]) => {
    setDecks(newDecks);
    saveDecks(newDecks);
  }, []);

  const addDeck = useCallback((name: string, subject: string) => {
    const deck: FlashcardDeck = {
      id: crypto.randomUUID(),
      name,
      subject,
      cards: [],
      createdAt: new Date().toISOString(),
    };
    update([...loadDecks(), deck]);
    return deck.id;
  }, [update]);

  const deleteDeck = useCallback((deckId: string) => {
    update(loadDecks().filter(d => d.id !== deckId));
  }, [update]);

  const addCard = useCallback((deckId: string, type: Flashcard['type'], front: string, back: string, subject: string, sourceNoteId?: string) => {
    update(loadDecks().map(d =>
      d.id === deckId ? { ...d, cards: [...d.cards, createCard(type, front, back, subject, sourceNoteId)] } : d
    ));
  }, [update]);

  const addCardsToNewDeck = useCallback((name: string, subject: string, cards: Array<{ type: Flashcard['type']; front: string; back: string }>) => {
    const deckId = crypto.randomUUID();
    const deck: FlashcardDeck = {
      id: deckId,
      name,
      subject,
      cards: cards.map(c => createCard(c.type, c.front, c.back, subject)),
      createdAt: new Date().toISOString(),
    };
    update([...loadDecks(), deck]);
    return deckId;
  }, [update]);

  const deleteCard = useCallback((deckId: string, cardId: string) => {
    update(loadDecks().map(d =>
      d.id === deckId ? { ...d, cards: d.cards.filter(c => c.id !== cardId) } : d
    ));
  }, [update]);

  const editCard = useCallback((deckId: string, cardId: string, front: string, back: string) => {
    update(loadDecks().map(d =>
      d.id === deckId ? { ...d, cards: d.cards.map(c => c.id === cardId ? { ...c, front, back } : c) } : d
    ));
  }, [update]);

  const reviewCard = useCallback((deckId: string, cardId: string, quality: number) => {
    update(loadDecks().map(d => {
      if (d.id !== deckId) return d;
      return {
        ...d,
        cards: d.cards.map(c => {
          if (c.id !== cardId) return c;
          return { ...c, ...sm2(c, quality) };
        }),
      };
    }));
  }, [update]);

  const getDueCards = useCallback((deckId?: string) => {
    const now = new Date().toISOString();
    const allDecks = deckId ? loadDecks().filter(d => d.id === deckId) : loadDecks();
    return allDecks.flatMap(d =>
      d.cards.filter(c => c.nextReviewDate <= now).map(c => ({ ...c, deckId: d.id }))
    ).sort((a, b) => a.easeFactor - b.easeFactor); // weakest first
  }, []);

  const stats = useMemo(() => {
    const allCards = decks.flatMap(d => d.cards);
    return {
      total: allCards.length,
      new: allCards.filter(c => c.mastery === 'new').length,
      learning: allCards.filter(c => c.mastery === 'learning').length,
      reviewing: allCards.filter(c => c.mastery === 'reviewing').length,
      mastered: allCards.filter(c => c.mastery === 'mastered').length,
      dueToday: allCards.filter(c => c.nextReviewDate <= new Date().toISOString()).length,
    };
  }, [decks]);

  return { decks, addDeck, deleteDeck, addCard, addCardsToNewDeck, deleteCard, editCard, reviewCard, getDueCards, stats };
}
