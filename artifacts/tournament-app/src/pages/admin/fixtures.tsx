import { useState, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Shuffle } from 'lucide-react';
import { events } from '@/data/events';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MatchRound } from '@/data/matches';
import type { Registration } from '@/data/registrations';

interface MatchRow {
  id: string;
  eventId: string;
  round: MatchRound;
  roundLevel?: number;
  player1Id: string;
  player2Id?: string;
  status: 'Pending' | 'Scheduled' | 'Completed';
  scheduledDate?: string;
  scheduledTime?: string;
  venue?: string;
  winnerId?: string;
  score?: string;
  location?: string;
  disqualifiedPlayerIds?: string[];
}

export default function AdminFixtures() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || '');
  const [locationFilter, setLocationFilter] = useState<'All' | string>('All');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventMatches, setEventMatches] = useState<MatchRow[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [connectors, setConnectors] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const rounds: MatchRound[] = ["Round 1", "Quarter Final", "Semi Final", "Final"];
  const getRoundMatches = (roundLevel: number) => eventMatches.filter(m => Number(m.roundLevel ?? 0) === roundLevel);

  const fetchRegistrations = async () => {
    try {
      const res = await fetch(`/api/registrations?eventId=${selectedEvent}`);
      if (!res.ok) return [];
      const rows = await res.json();
      return rows.map((r: any) => ({
        id: String(r.id),
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        providedEmployeeId: r.provided_employee_id,
        department: r.department,
        tournamentId: r.tournament_id,
        eventId: r.event_id,
        partnerId: r.partner_id,
        location: r.location,
        registrationDate: r.registration_date,
      }));
    } catch {
      return [];
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?eventId=${selectedEvent}`);
      if (!res.ok) return;
      const rows = await res.json();
      const serverMatches = rows.map((r: any) => ({
        id: `M${r.id}`,
        eventId: r.event_id,
        round: r.round,
        roundLevel: Number(r.meta?.round_level ?? 0),
        player1Id: r.player1_id,
        player2Id: r.player2_id || undefined,
        status: r.status,
        scheduledDate: r.scheduled_date || undefined,
        scheduledTime: r.meta?.scheduled_time || undefined,
        venue: r.meta?.venue || undefined,
        winnerId: r.winner_id || undefined,
        score: r.meta?.score || undefined,
        location: r.meta?.location || undefined,
        disqualifiedPlayerIds: Array.isArray(r.meta?.disqualified_player_ids) ? r.meta.disqualified_player_ids : []
      }));
      setEventMatches(serverMatches);
      // reset connectors cache so it recomputes after render
      setTimeout(() => setConnectors([]), 50);
    } catch {
      toast({ title: 'Unable to load matches', description: 'There was an error fetching fixtures.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEvent) return;
    (async () => {
      const [regs] = await Promise.all([fetchRegistrations()]);
      setRegistrations(regs);
      await fetchMatches();
    })();
  }, [selectedEvent]);

  const handleWinnerSelection = (matchId: string, winnerId: string) => {
    setSelectedWinners(prev => ({ ...prev, [matchId]: winnerId }));
  };

  const handleSaveWinner = async (match: MatchRow) => {
    const winnerId = selectedWinners[match.id];
    if (!winnerId) {
      toast({ title: 'Select a winner', description: 'Choose a winner before saving.' });
      return;
    }

    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    const numericId = match.id.replace(/^M/, '');

    try {
      const res = await fetch(`/api/matches/${numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner_id: winnerId,
          status: 'Completed',
          meta: { disqualified_player_ids: loserId ? [loserId] : [] }
        })
      });
      if (!res.ok) {
        toast({ title: 'Could not save winner', description: 'Server returned an error.' });
        return;
      }
      await fetchMatches();
      try { localStorage.setItem('fixtures:update', Date.now().toString()); } catch (e) {}
      setSelectedWinners(prev => ({ ...prev, [match.id]: '' }));
      toast({ title: 'Winner saved', description: 'The winner has been recorded.' });
    } catch {
      toast({ title: 'Could not save winner', description: 'Network error' });
    }
  };

  const handleGenerateFixtures = async () => {
    try {
      const regs = await fetchRegistrations();
      const perLocationPlayerIds: Record<string, string[]> = {};
      for (const r of regs) {
        const loc = r.location || 'Unknown';
        perLocationPlayerIds[loc] = perLocationPlayerIds[loc] || [];
        perLocationPlayerIds[loc].push(r.employeeId);
      }

      const totalPlayers = Object.values(perLocationPlayerIds).reduce((s, a) => s + a.length, 0);
      if (totalPlayers === 0) {
        toast({ title: 'No Registrations', description: 'Cannot generate fixtures: no registered participants for this event.' });
        return;
      }

      const gen = await fetch('/api/fixtures/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent, perLocationPlayerIds })
      });

      if (!gen.ok) {
        toast({ title: 'Fixture generation failed', description: 'Server error when generating fixtures.' });
        return;
      }

      const data = await gen.json();
      if (!data?.matches) {
        toast({ title: 'Fixture generation failed', description: 'Server did not return any fixtures.' });
        return;
      }

      await fetchMatches();
      try { localStorage.setItem('fixtures:update', Date.now().toString()); } catch (e) {}
      toast({ title: 'Fixtures Generated', description: `Generated ${data.matches.length} matches.` });
    } catch {
      toast({ title: 'Fixture generation failed', description: 'Network error while generating fixtures.' });
    }
  };

  const selectedEventMatches = useMemo(() => eventMatches.filter(m => m.eventId === selectedEvent), [eventMatches, selectedEvent]);

  // compute round levels dynamically from matches
  const roundLevels = useMemo(() => {
    const levels = Array.from(new Set(selectedEventMatches.map(m => Number(m.roundLevel ?? 0))));
    levels.sort((a, b) => a - b);
    return levels;
  }, [selectedEventMatches]);

  const totalRounds = roundLevels.length;
  const roundLabelForIndex = (index: number) => {
    const fromEnd = totalRounds - 1 - index;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semi Final';
    if (fromEnd === 2) return 'Quarter Final';
    return `Round ${index + 1}`;
  };

  useEffect(() => {
    // SSE real-time update subscription
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/fixtures/stream/${selectedEvent}`);
      es.addEventListener('match:update', () => {
        fetchMatches();
      });
    } catch (e) {
      // fallback to storage events if SSE unsupported
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'fixtures:update') fetchMatches();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    return () => { if (es) es.close(); };
  }, []);

  // simple polling fallback for realtime updates
  useEffect(() => {
    if (!selectedEvent) return;
    const id = setInterval(() => fetchMatches(), 5000);
    return () => clearInterval(id);
  }, [selectedEvent]);

  // compute SVG connectors between rounds after matches render
  useEffect(() => {
    if (!containerRef.current) return;
    // gather rects for each match
    const rects: Record<string, DOMRect> = {};
    Object.keys(matchRefs.current).forEach(k => {
      const el = matchRefs.current[k];
      if (el) rects[k] = el.getBoundingClientRect();
    });
    if (Object.keys(rects).length === 0) return;

    const rootRect = containerRef.current.getBoundingClientRect();
    const newConns: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    // for each match in a round, connect to the next round's match based on bracket_index
    for (const m of selectedEventMatches) {
      const id = m.id; // 'M123'
      const metaBracket = (m as any).roundLevel;
      // find next round level
      const curLevel = Number(m.roundLevel ?? 0);
      const nextLevel = roundLevels[roundLevels.indexOf(curLevel) + 1];
      if (nextLevel === undefined) continue;
      // compute nextMatch index: floor(bracket_index/2) stored in server meta.bracket_index
      // find server match to use: matches with nextLevel where their meta.bracket_index matches Math.floor(bracket/2)
      const thisMatchRaw = eventMatches.find(x => `M${(x as any).id?.toString?.()}` === id) as any || null;
      const bracketIndex = Number((thisMatchRaw && thisMatchRaw.roundLevel) ? (thisMatchRaw as any).roundLevel : 0);
      // fallback: pair by order — map index in current round to index in next round
      const curRoundMatches = eventMatches.filter(x => Number(x.roundLevel) === curLevel).sort((a, b) => (a.id > b.id ? 1 : -1));
      const idx = curRoundMatches.findIndex(x => x.id === id);
      if (idx === -1) continue;
      const targetIdx = Math.floor(idx / 2);
      const nextRoundMatches = eventMatches.filter(x => Number(x.roundLevel) === nextLevel).sort((a, b) => (a.id > b.id ? 1 : -1));
      const targetMatch = nextRoundMatches[targetIdx];
      if (!targetMatch) continue;

      const fromRect = rects[id];
      const toRect = rects[targetMatch.id];
      if (!fromRect || !toRect) continue;
      const x1 = fromRect.right - rootRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - rootRect.top;
      const x2 = toRect.left - rootRect.left;
      const y2 = toRect.top + toRect.height / 2 - rootRect.top;
      newConns.push({ x1, y1, x2, y2 });
    }

    setConnectors(newConns);
  }, [eventMatches, roundLevels, selectedEventMatches]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fixtures Management</h1>
            <p className="text-muted-foreground">Generate and manage tournament brackets</p>
          </div>
          <Button className="gap-2" onClick={handleGenerateFixtures} data-testid="button-generate-fixtures">
            <Shuffle className="h-4 w-4" />
            Generate Fixtures
          </Button>
        </div>

        <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            {events.map(event => (
              <TabsTrigger key={event.id} value={event.id} data-testid={`tab-${event.id}`}>
                {event.name.replace(/Table Tennis |Carrom /, '')}
              </TabsTrigger>
            ))}
          </TabsList>

          {events.map(event => (
            <TabsContent key={event.id} value={event.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      {event.name} - Bracket
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">{selectedEventMatches.length} matches</span>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <label className="text-sm">Location:</label>
                      <div className="flex items-center gap-2">
                        {['All', 'Hyderabad', 'Bangalore'].map(loc => (
                          <button
                            key={loc}
                            onClick={() => setLocationFilter(loc as any)}
                            className={cn('px-4 py-2 rounded-md', locationFilter === loc ? 'bg-primary text-white' : 'bg-muted')}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                  {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading matches…</div>
                  ) : selectedEventMatches.length > 0 ? (
                    <div className="relative overflow-x-auto" ref={containerRef}>
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                        {connectors.map((c, i) => (
                          <g key={`conn-${i}`}>
                            <path d={`M ${c.x1} ${c.y1} C ${c.x1 + 40} ${c.y1} ${c.x2 - 40} ${c.y2} ${c.x2} ${c.y2}`} stroke="#cbd5e1" strokeWidth={2} fill="none" />
                            <circle cx={c.x2} cy={c.y2} r={3} fill="#0ea5a4" />
                          </g>
                        ))}
                      </svg>
                      <div className="flex gap-8 pb-4 min-w-max">
                                    {roundLevels.map((level, idx) => {
                                      const round = roundLabelForIndex(idx);
                                      const roundMatches = getRoundMatches(level).filter(m => m.eventId === selectedEvent);
                          if (roundMatches.length === 0) return null;
                          let locations = Array.from(new Set(roundMatches.map(m => m.location || 'Unknown'))).sort((a, b) => {
                            const order = ['Hyderabad', 'Bangalore'];
                            const ai = order.indexOf(a);
                            const bi = order.indexOf(b);
                            if (ai === -1 && bi === -1) return a.localeCompare(b);
                            if (ai === -1) return 1;
                            if (bi === -1) return -1;
                            return ai - bi;
                          });
                          if (locationFilter && locationFilter !== 'All') {
                            locations = locations.filter(l => l === locationFilter);
                          }

                          return (
                            <div key={`round-${level}`} className="flex-shrink-0 w-96">
                              <h3 className="font-semibold mb-4 text-center text-sm text-muted-foreground">{round}</h3>
                              <div className="space-y-6">
                                {locations.map(location => {
                                  const locationMatches = roundMatches.filter(m => (m.location || 'Unknown') === location);
                                  return (
                                    <div key={`${round}-${location}`} className="space-y-3">
                                      {locations.length > 1 && (
                                        <div className="rounded-xl bg-muted px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                                          {location}
                                        </div>
                                      )}
                                      <div className="space-y-4">
                                        {locationMatches.map(match => {
                                          const player1 = registrations.find(r => r.employeeId === match.player1Id);
                                          const player2 = match.player2Id ? registrations.find(r => r.employeeId === match.player2Id) : null;
                                          const selectedWinner = selectedWinners[match.id] || match.winnerId || '';

                                          return (
                                    <div
                                      key={match.id}
                                      ref={el => { matchRefs.current[match.id] = el; }}
                                      className={cn(
                                        'border rounded-lg p-3 bg-card hover:shadow-md transition-shadow',
                                        match.status === 'Completed' && 'border-primary/30'
                                      )}
                                      data-testid={`match-${match.id}`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <StatusBadge status={match.status} />
                                        {match.scheduledDate && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(match.scheduledDate).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>

                                      <div className="space-y-2">
                                        <div className={cn('rounded p-2', match.winnerId === match.player1Id && 'bg-primary/10')}>
                                          <div className="text-sm font-medium">{player1 ? `${player1.employeeName}` : 'TBD'}</div>
                                          <div className="text-xs text-muted-foreground">{player1 ? `${player1.providedEmployeeId || player1.employeeId}` : ''}</div>
                                        </div>
                                        <div className="text-center text-xs text-muted-foreground">vs</div>
                                        <div className={cn('rounded p-2', match.winnerId === match.player2Id && 'bg-primary/10')}>
                                          <div className="text-sm font-medium">{player2 ? `${player2.employeeName}` : 'TBD'}</div>
                                          <div className="text-xs text-muted-foreground">{player2 ? `${player2.providedEmployeeId || player2.employeeId}` : ''}</div>
                                        </div>
                                      </div>

                                      {player1 && player2 ? (
                                        <div className="mt-3 rounded-lg border p-3 bg-muted/50">
                                          <Label className="mb-2 block text-sm font-medium">Select Winner and Disqualify Loser</Label>
                                          <div className="grid grid-cols-1 gap-2">
                                            <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer">
                                              <input
                                                type="radio"
                                                name={`winner-${match.id}`}
                                                value={match.player1Id}
                                                checked={selectedWinner === match.player1Id}
                                                onChange={() => handleWinnerSelection(match.id, match.player1Id)}
                                              />
                                              <span className="text-sm">{player1.employeeName} ({player1.providedEmployeeId || player1.employeeId})</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer">
                                              <input
                                                type="radio"
                                                name={`winner-${match.id}`}
                                                value={match.player2Id}
                                                checked={selectedWinner === match.player2Id}
                                                onChange={() => handleWinnerSelection(match.id, match.player2Id!)}
                                              />
                                              <span className="text-sm">{player2.employeeName} ({player2.providedEmployeeId || player2.employeeId})</span>
                                            </label>
                                          </div>
                                          <div className="mt-3 flex items-center gap-2">
                                            <input
                                              id={`disqualify-${match.id}`}
                                              type="checkbox"
                                              checked={Boolean(selectedWinner)}
                                              readOnly
                                              className="h-4 w-4 rounded border"
                                            />
                                            <Label htmlFor={`disqualify-${match.id}`} className="text-sm">
                                              Mark loser as disqualified for this match
                                            </Label>
                                          </div>
                                          <Button
                                            className="mt-3 w-full"
                                            onClick={() => handleSaveWinner(match)}
                                            disabled={!selectedWinner || match.status === 'Completed'}
                                            data-testid={`button-save-winner-${match.id}`}
                                          >
                                            Save Winner
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="mt-3 text-sm text-muted-foreground">
                                          Waiting for opponent to be assigned.
                                        </div>
                                      )}
                                      {match.disqualifiedPlayerIds?.length ? (
                                        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                                          Disqualified:{' '}
                                          {match.disqualifiedPlayerIds
                                            .map(id => registrations.find(r => r.employeeId === id)?.employeeName || id)
                                            .join(', ')}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No fixtures generated yet for this event
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
