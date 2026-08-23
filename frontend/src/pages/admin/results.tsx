import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardCheck, Trophy, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import {
  fetchEvents,
  fetchRegistrations,
  fetchMatches,
  getParticipantDisplay,
  type AppEvent,
  type AppRegistration,
  type AppMatch
} from '@/lib/api';

export default function AdminResults() {
  const { toast } = useToast();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [registrations, setRegistrations] = useState<AppRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState<'All' | 'Irrum Manzil' | 'Hitech City' | string>('All');

  // Dialog State
  const [selectedMatch, setSelectedMatch] = useState<AppMatch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [winner, setWinner] = useState('');
  const [score, setScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evs, regs, mat] = await Promise.all([
        fetchEvents(),
        fetchRegistrations(),
        fetchMatches()
      ]);
      setEvents(evs);
      setRegistrations(regs);
      setMatches(mat);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openResultDialog = (match: AppMatch) => {
    setSelectedMatch(match);
    setWinner(match.winnerId || match.player1Id || '');
    setScore(match.score || '');
    setIsDialogOpen(true);
  };

  const getMatchLocation = (m: AppMatch) => {
    if (m.location) {
      if (m.location === 'Hyderabad') return 'Irrum Manzil';
      if (m.location === 'Bangalore') return 'Hitech City';
      return m.location;
    }
    const ev = events.find(e => e.id === m.eventId);
    if (ev?.meta?.location) {
      const l = String(ev.meta.location);
      if (l === 'Hyderabad') return 'Irrum Manzil';
      if (l === 'Bangalore') return 'Hitech City';
      return l;
    }
    if (ev?.name.includes('Hitech City') || ev?.name.includes('Bangalore')) return 'Hitech City';
    if (ev?.name.includes('Irrum Manzil') || ev?.name.includes('Hyderabad')) return 'Irrum Manzil';
    return 'Main Arena';
  };

  const handleSubmitResult = async () => {
    if (!selectedMatch || !winner) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/matches/${selectedMatch.numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner_id: winner,
          score: score.trim() || undefined,
          status: 'Completed'
        })
      });

      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to record match result.' });
        return;
      }

      toast({ title: 'Result Recorded! 🏆', description: 'Match marked as completed and winner advanced.' });
      setIsDialogOpen(false);
      setSelectedMatch(null);
      setWinner('');
      setScore('');
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Network error recording result.' });
    } finally {
      setSubmitting(false);
    }
  };

  const playableMatches = useMemo(() => {
    return matches.filter(m => {
      const p1 = getParticipantDisplay(m.player1Id, registrations);
      const p2 = getParticipantDisplay(m.player2Id, registrations);
      const isPlayable = p1.hasPlayer && p2.hasPlayer && m.status !== 'Completed';
      if (!isPlayable) return false;
      if (locationFilter === 'All') return true;
      const loc = getMatchLocation(m);
      return loc === locationFilter || loc === 'Main Arena';
    });
  }, [matches, registrations, locationFilter, events]);

  const completedMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'Completed')
      .filter(m => {
        if (locationFilter === 'All') return true;
        const loc = getMatchLocation(m);
        return loc === locationFilter || loc === 'Main Arena';
      })
      .slice()
      .reverse();
  }, [matches, locationFilter, events]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-['Outfit'] tracking-tight">Results & Scores Entry</h1>
            <p className="text-sm text-muted-foreground">
              Record match results, official scores, and promote bracket winners
            </p>
          </div>

          {/* Location Filter Pills */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            {['All', 'Irrum Manzil', 'Hitech City'].map(loc => (
              <button
                key={loc}
                onClick={() => setLocationFilter(loc)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  locationFilter === loc
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {loc === 'All' ? 'All Locations' : loc}
              </button>
            ))}
          </div>
        </div>

        {/* Ready to Enter Result */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Matches Ready for Result Entry
              </CardTitle>
              <span className="text-sm text-muted-foreground">{playableMatches.length} Match(es)</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading matches…</div>
            ) : playableMatches.length > 0 ? (
              <div className="space-y-4">
                {playableMatches.map(match => {
                  const p1 = getParticipantDisplay(match.player1Id, registrations);
                  const p2 = getParticipantDisplay(match.player2Id, registrations);
                  const event = events.find(e => e.id === match.eventId);

                  return (
                    <div
                      key={match.id}
                      className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow"
                      data-testid={`match-${match.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={match.status} />
                            <span className="font-bold text-sm">Match #{match.numericId} • {match.round}</span>
                            {event && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">
                                {event.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm font-semibold pt-1">
                            <span>{p1.display}</span>
                            <span className="text-xs text-muted-foreground font-normal">vs</span>
                            <span>{p2.display}</span>
                          </div>

                          {match.scheduledDate && (
                            <div className="text-xs text-muted-foreground pt-0.5">
                              📅 {new Date(match.scheduledDate).toLocaleDateString()} {match.scheduledTime ? `• ⏰ ${match.scheduledTime}` : ''} {match.venue ? `• 📍 ${match.venue}` : ''}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => openResultDialog(match)}
                          data-testid={`button-enter-result-${match.id}`}
                        >
                          Enter Result
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No active matches ready for score entry. Matches with two assigned players will appear here.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Completed Match Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedMatches.length > 0 ? (
              <div className="space-y-3">
                {completedMatches.map(match => {
                  const winner = getParticipantDisplay(match.winnerId, registrations);
                  const p1 = getParticipantDisplay(match.player1Id, registrations);
                  const p2 = getParticipantDisplay(match.player2Id, registrations);
                  const event = events.find(e => e.id === match.eventId);

                  return (
                    <div
                      key={match.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3.5 last:border-0 gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-primary">{event?.name || match.eventId}</span>
                          <span className="text-xs text-muted-foreground">• Match #{match.numericId} ({match.round})</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p1.display} vs {p2.display}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Winner: {winner.display}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {match.score && (
                          <span className="text-xs bg-muted px-2.5 py-1 rounded font-mono font-bold">
                            {match.score}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => openResultDialog(match)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No completed matches yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enter Result Modal */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Match Result</DialogTitle>
              <DialogDescription>
                {selectedMatch && (
                  <span>Match #{selectedMatch.numericId} • {selectedMatch.round}</span>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedMatch && (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-1">
                  <div className="font-semibold">
                    {getParticipantDisplay(selectedMatch.player1Id, registrations).display}
                  </div>
                  <div className="text-muted-foreground">vs</div>
                  <div className="font-semibold">
                    {getParticipantDisplay(selectedMatch.player2Id, registrations).display}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">Select Winner *</Label>
                  <RadioGroup value={winner} onValueChange={setWinner} className="space-y-2">
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={selectedMatch.player1Id} id={`r-p1-${selectedMatch.id}`} />
                      <Label htmlFor={`r-p1-${selectedMatch.id}`} className="cursor-pointer flex-1 font-medium text-sm">
                        {getParticipantDisplay(selectedMatch.player1Id, registrations).display}
                      </Label>
                    </div>

                    {selectedMatch.player2Id && (
                      <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value={selectedMatch.player2Id} id={`r-p2-${selectedMatch.id}`} />
                        <Label htmlFor={`r-p2-${selectedMatch.id}`} className="cursor-pointer flex-1 font-medium text-sm">
                          {getParticipantDisplay(selectedMatch.player2Id, registrations).display}
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="score-input" className="text-xs font-semibold">Match Score (Optional)</Label>
                  <Input
                    id="score-input"
                    placeholder="e.g., 21-18, 21-15 or 3-1"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    data-testid="input-score"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    onClick={handleSubmitResult}
                    className="flex-1"
                    disabled={submitting || !winner}
                    data-testid="button-submit-result"
                  >
                    {submitting ? 'Saving Result…' : 'Save Match Result'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
