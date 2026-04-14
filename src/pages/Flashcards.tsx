import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFlashcards } from '@/hooks/useFlashcards';
import { useNotes } from '@/hooks/useNotes';
import { useGamification } from '@/hooks/useGamification';
import { Flashcard } from '@/types/task';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Brain, RotateCcw, ChevronLeft, ChevronRight, Trash2, Edit, BookOpen, Layers, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Flashcards() {
  const { decks, addDeck, deleteDeck, addCard, addCardsToNewDeck, deleteCard, editCard, reviewCard, getDueCards, stats } = useFlashcards();
  const { notes } = useNotes();
  const { addPoints } = useGamification();
  const [view, setView] = useState<'decks' | 'study' | 'create'>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Create deck state
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Study state
  const [studyCards, setStudyCards] = useState<(Flashcard & { deckId: string })[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  const selectedDeck = decks.find(d => d.id === selectedDeckId);

  const handleCreateDeck = () => {
    if (!newDeckName.trim()) return;
    addDeck(newDeckName.trim(), newDeckSubject.trim() || 'General');
    setNewDeckName('');
    setNewDeckSubject('');
    setCreateOpen(false);
    toast.success('Deck created!');
  };

  const handleGenerateFromNotes = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    setGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-study-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Generate flashcards from these notes. Return ONLY valid JSON array with objects having "type" (definition|question|fill_blank), "front", "back" fields. Generate 5-10 cards.\n\nNotes:\n${note.content}` }],
          mode: 'chat',
        }),
      });
      if (!response.ok) throw new Error('Failed to generate');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {}
        }
      }

      // Extract JSON from response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Could not parse flashcards');
      const cards = JSON.parse(jsonMatch[0]) as Array<{ type: string; front: string; back: string }>;

      const validCards = cards.map(c => ({
        type: (['definition', 'question', 'fill_blank'].includes(c.type) ? c.type : 'question') as Flashcard['type'],
        front: c.front,
        back: c.back,
      }));

      addCardsToNewDeck(`${note.title} Cards`, note.subject, validCards);
      toast.success(`Generated ${validCards.length} flashcards!`);
      addPoints(10, 'task');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const startStudy = (deckId?: string) => {
    const cards = getDueCards(deckId);
    if (cards.length === 0) {
      toast.info('No cards due for review!');
      return;
    }
    setStudyCards(cards.slice(0, 20));
    setCurrentIdx(0);
    setFlipped(false);
    setSessionCorrect(0);
    setSessionTotal(0);
    setView('study');
  };

  const handleReview = (quality: number) => {
    const card = studyCards[currentIdx];
    if (!card) return;
    reviewCard(card.deckId, card.id, quality);
    setSessionTotal(prev => prev + 1);
    if (quality >= 3) {
      setSessionCorrect(prev => prev + 1);
      addPoints(5, 'task');
    }
    setFlipped(false);
    if (currentIdx < studyCards.length - 1) {
      setTimeout(() => setCurrentIdx(prev => prev + 1), 200);
    } else {
      toast.success(`Session complete! ${sessionCorrect + (quality >= 3 ? 1 : 0)}/${sessionTotal + 1} correct`);
      setView('decks');
    }
  };

  if (view === 'study' && studyCards.length > 0) {
    const card = studyCards[currentIdx];
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setView('decks')}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Badge variant="secondary" className="font-body">
            {currentIdx + 1} / {studyCards.length}
          </Badge>
        </div>

        <Progress value={((currentIdx + 1) / studyCards.length) * 100} className="h-2" />

        <div className="perspective-1000 mx-auto" style={{ perspective: '1000px' }}>
          <motion.div
            className="relative cursor-pointer"
            onClick={() => setFlipped(!flipped)}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.5 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Card className="min-h-[280px] flex items-center justify-center p-8 shadow-lg" style={{ backfaceVisibility: 'hidden' }}>
              <CardContent className="text-center">
                <Badge className="mb-4" variant="outline">{card.type}</Badge>
                <p className="font-heading text-xl">{flipped ? '' : card.front}</p>
                {!flipped && <p className="mt-4 font-body text-sm text-muted-foreground">Tap to reveal</p>}
              </CardContent>
            </Card>
            {flipped && (
              <Card
                className="absolute inset-0 min-h-[280px] flex items-center justify-center p-8 shadow-lg bg-primary/5"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <CardContent className="text-center">
                  <p className="font-heading text-xl">{card.back}</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-2"
          >
            <Button variant="destructive" size="sm" onClick={() => handleReview(1)}>Again</Button>
            <Button variant="outline" size="sm" onClick={() => handleReview(3)}>Good</Button>
            <Button variant="default" size="sm" onClick={() => handleReview(4)}>Easy</Button>
            <Button className="bg-success text-success-foreground hover:bg-success/90" size="sm" onClick={() => handleReview(5)}>Perfect</Button>
          </motion.div>
        )}

        <div className="flex justify-center gap-4 font-body text-sm text-muted-foreground">
          <span>✅ {sessionCorrect} correct</span>
          <span>📊 {sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0}% accuracy</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Total', value: stats.total, icon: Layers },
          { label: 'New', value: stats.new, icon: Plus },
          { label: 'Learning', value: stats.learning, icon: BookOpen },
          { label: 'Reviewing', value: stats.reviewing, icon: RotateCcw },
          { label: 'Mastered', value: stats.mastered, icon: Brain },
          { label: 'Due Today', value: stats.dueToday, icon: Zap },
        ].map(s => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="flex flex-col items-center p-3">
              <s.icon className="mb-1 h-4 w-4 text-primary" />
              <p className="font-heading text-lg font-bold">{s.value}</p>
              <p className="font-body text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => startStudy()} className="gap-1">
          <Zap className="h-4 w-4" /> Study Due Cards ({stats.dueToday})
        </Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-1"><Plus className="h-4 w-4" /> New Deck</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Create Deck</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Deck name..." value={newDeckName} onChange={e => setNewDeckName(e.target.value)} />
              <Input placeholder="Subject..." value={newDeckSubject} onChange={e => setNewDeckSubject(e.target.value)} />
              <Button onClick={handleCreateDeck} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Generate from Notes */}
      {notes.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Generate from Notes
            </CardTitle>
            <CardDescription className="font-body text-xs">AI will create flashcards from your notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {notes.slice(0, 6).map(note => (
                <Button
                  key={note.id}
                  variant="outline"
                  size="sm"
                  disabled={generating}
                  onClick={() => handleGenerateFromNotes(note.id)}
                  className="justify-start truncate font-body text-xs"
                >
                  <Sparkles className="mr-1 h-3 w-3" /> {note.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decks */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck, i) => {
          const mastered = deck.cards.filter(c => c.mastery === 'mastered').length;
          const due = deck.cards.filter(c => c.nextReviewDate <= new Date().toISOString()).length;
          const progress = deck.cards.length > 0 ? Math.round((mastered / deck.cards.length) * 100) : 0;
          return (
            <motion.div key={deck.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-sm">{deck.name}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteDeck(deck.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="w-fit text-[10px]">{deck.subject}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between font-body text-xs text-muted-foreground">
                    <span>{deck.cards.length} cards</span>
                    <span>{due} due</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex gap-1">
                    <Button size="sm" className="flex-1 text-xs" onClick={() => startStudy(deck.id)} disabled={due === 0}>
                      Study ({due})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {decks.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-heading text-lg">No flashcard decks yet</p>
            <p className="font-body text-sm text-muted-foreground">Create a deck or generate cards from your notes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
