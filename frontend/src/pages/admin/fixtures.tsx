import { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Shuffle,
  CheckCircle2,
  UserCheck,
  Calendar,
  Layers,
  Award,
  Coffee,
  RotateCcw,
  Sparkles,
  Users,
  Grid
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  fetchEvents,
  fetchRegistrations,
  fetchMatches,
  getParticipantDisplay,
  saveMatchWinner,
  type AppEvent,
  type AppRegistration,
  type AppMatch
} from '@/lib/api';

export default function AdminFixtures() {
  const { toast } = useToast();
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [locationFilter, setLocationFilter] = useState<'All' | string>('All');
  const [registrations, setRegistrations] = useState<AppRegistration[]>([]);
  const [eventMatches, setEventMatches] = useState<AppMatch[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>({});
  const [matchScores, setMatchScores] = useState<Record<string, string>>({});
  const [savingWinner, setSavingWinner] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'Single Elimination' | 'Round Robin' | 'Double Round Robin'>('Single Elimination');
  const [roundRobinActiveTab, setRoundRobinActiveTab] = useState('1');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load live events from database
  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await fetchEvents();
      if (!mounted) return;
      setEventsList(list);
      if (list.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const evParam = params.get('event');
        const matchEv = list.find(e => e.id === evParam);
        setSelectedEvent(matchEv ? matchEv.id : list[0].id);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load registrations and matches when selectedEvent changes
  const loadData = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [regs, matches] = await Promise.all([
        fetchRegistrations(eventId),
        fetchMatches(eventId)
      ]);
      setRegistrations(regs);
      setEventMatches(matches);

      // Prepopulate scores from matches
      const scoreMap: Record<string, string> = {};
      matches.forEach(m => {
        if (m.score) scoreMap[m.id] = m.score;
      });
      setMatchScores(scoreMap);
    } catch {
      toast({ title: 'Error', description: 'Failed to load tournament data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      loadData(selectedEvent);
    }
  }, [selectedEvent]);

  // SSE subscription for realtime updates
  useEffect(() => {
    if (!selectedEvent) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/fixtures/stream/${selectedEvent}`);
      es.addEventListener('match:update', () => {
        loadData(selectedEvent);
      });
      es.addEventListener('fixtures:generate', () => {
        loadData(selectedEvent);
      });
      es.addEventListener('tournament:completed', (ev: any) => {
        try {
          const payload = JSON.parse(ev.data);
          toast({
            title: 'Tournament Completed! 🏆',
            description: `${payload.championName || 'Champion'} has won the tournament!`
          });
          loadData(selectedEvent);
        } catch {}
      });
    } catch {}
    return () => { if (es) es.close(); };
  }, [selectedEvent]);

  const handleWinnerSelection = (matchId: string, winnerId: string) => {
    setSelectedWinners(prev => ({ ...prev, [matchId]: winnerId }));
  };

  const handleScoreChange = (matchId: string, score: string) => {
    setMatchScores(prev => ({ ...prev, [matchId]: score }));
  };

  const handleSaveWinner = async (match: AppMatch) => {
    const winnerId = selectedWinners[match.id] || match.winnerId;
    if (!winnerId) {
      toast({ title: 'Select Winner', description: 'Please select a winner before saving.' });
      return;
    }

    setSavingWinner(prev => ({ ...prev, [match.id]: true }));
    try {
      const score = matchScores[match.id] || '';
      const res = await fetch(`/api/matches/${match.numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner_id: winnerId,
          status: 'Completed',
          score: score || undefined
        })
      });

      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to save winner to database.' });
        return;
      }

      await loadData(selectedEvent);
      toast({ title: 'Winner Saved! ✅', description: 'Match result saved and tournament updated.' });
    } catch {
      toast({ title: 'Error', description: 'Network error saving winner.' });
    } finally {
      setSavingWinner(prev => ({ ...prev, [match.id]: false }));
    }
  };

  const handleOpenGenerateModal = () => {
    const currentEv = eventsList.find(e => e.id === selectedEvent);
    if (currentEv?.format === 'Round Robin') {
      setSelectedFormat('Round Robin');
    } else {
      setSelectedFormat('Single Elimination');
    }
    setShowGenerateModal(true);
  };

  const handleConfirmGenerate = async () => {
    if (!selectedEvent) return;

    setRegenerating(true);
    try {
      const regs = await fetchRegistrations(selectedEvent);
      if (regs.length === 0) {
        toast({
          title: 'No Registrations',
          description: 'Cannot generate fixtures: No participants registered for this event yet.'
        });
        setShowGenerateModal(false);
        return;
      }

      const perLocationPlayerIds: Record<string, string[]> = {};
      for (const r of regs) {
        const loc = r.location || 'All';
        perLocationPlayerIds[loc] = perLocationPlayerIds[loc] || [];
        perLocationPlayerIds[loc].push(r.employeeId);
      }

      const res = await fetch('/api/fixtures/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent,
          format: selectedFormat,
          perLocationPlayerIds
        })
      });

      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to generate fixtures' });
        return;
      }

      const data = await res.json();
      await loadData(selectedEvent);
      setShowGenerateModal(false);
      toast({
        title: 'Fixtures Generated! 🎯',
        description: `Generated ${selectedFormat} fixtures for ${regs.length} participants (${data.matches?.length || 0} matches).`
      });
    } catch {
      toast({ title: 'Error', description: 'Network error generating fixtures' });
    } finally {
      setRegenerating(false);
    }
  };

  const selectedEventMatches = useMemo(() => {
    return eventMatches.filter(m => m.eventId === selectedEvent);
  }, [eventMatches, selectedEvent]);

  // Detected format
  const currentFormat = useMemo(() => {
    if (selectedEventMatches.length > 0 && selectedEventMatches[0].meta?.format) {
      return selectedEventMatches[0].meta.format;
    }
    const ev = eventsList.find(e => e.id === selectedEvent);
    return ev?.format || 'Single Elimination';
  }, [selectedEventMatches, eventsList, selectedEvent]);

  const isRoundRobin = currentFormat === 'Round Robin';

  // Round levels
  const roundLevels = useMemo(() => {
    const levels = Array.from(new Set(selectedEventMatches.map(m => m.roundLevel)));
    levels.sort((a, b) => a - b);
    return levels;
  }, [selectedEventMatches]);

  const totalRounds = roundLevels.length;

  const roundLabelForLevel = (level: number, index: number) => {
    if (isRoundRobin) {
      return `Round ${level + 1}`;
    }
    const fromEnd = totalRounds - 1 - index;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semi Final';
    if (fromEnd === 2) return 'Quarter Final';
    if (fromEnd === 3) return 'Round of 16';
    if (fromEnd === 4) return 'Round of 32';
    return `Round ${level + 1}`;
  };

  // Check if champion has been decided
  const finalMatch = useMemo(() => {
    if (isRoundRobin) return null;
    if (roundLevels.length === 0) return null;
    const maxLevel = roundLevels[roundLevels.length - 1];
    return selectedEventMatches.find(m => m.roundLevel === maxLevel && m.status === 'Completed' && m.winnerId);
  }, [isRoundRobin, roundLevels, selectedEventMatches]);

  // Round Robin Standings Table
  const roundRobinStandings = useMemo(() => {
    if (!isRoundRobin) return [];

    const stats: Record<string, {
      player: string;
      played: number;
      won: number;
      lost: number;
      points: number;
      form: string[];
    }> = {};

    registrations.forEach(r => {
      stats[r.employeeId] = {
        player: r.employeeId,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        form: []
      };
    });

    selectedEventMatches.forEach(m => {
      if (m.status === 'Completed' && m.winnerId) {
        const p1 = m.player1Id;
        const p2 = m.player2Id;
        if (p1 && stats[p1]) {
          stats[p1].played += 1;
          if (m.winnerId === p1) {
            stats[p1].won += 1;
            stats[p1].points += 2;
            stats[p1].form.push('W');
          } else {
            stats[p1].lost += 1;
            stats[p1].form.push('L');
          }
        }
        if (p2 && stats[p2]) {
          stats[p2].played += 1;
          if (m.winnerId === p2) {
            stats[p2].won += 1;
            stats[p2].points += 2;
            stats[p2].form.push('W');
          } else {
            stats[p2].lost += 1;
            stats[p2].form.push('L');
          }
        }
      }
    });

    const list = Object.values(stats);
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      return a.played - b.played;
    });

    return list;
  }, [isRoundRobin, registrations, selectedEventMatches]);

  const roundRobinChampion = useMemo(() => {
    if (!isRoundRobin || selectedEventMatches.length === 0) return null;
    const allDone = selectedEventMatches.every(m => m.status === 'Completed');
    if (!allDone || roundRobinStandings.length === 0) return null;
    const top = roundRobinStandings[0];
    return top ? getParticipantDisplay(top.player, registrations) : null;
  }, [isRoundRobin, selectedEventMatches, roundRobinStandings, registrations]);

  const championDisplay = useMemo(() => {
    if (isRoundRobin) return roundRobinChampion;
    if (!finalMatch || !finalMatch.winnerId) return null;
    return getParticipantDisplay(finalMatch.winnerId, registrations);
  }, [isRoundRobin, roundRobinChampion, finalMatch, registrations]);

  // Total BYEs count in current fixture
  const byesInfo = useMemo(() => {
    const N = registrations.length;
    if (isRoundRobin) {
      const isOdd = N % 2 !== 0;
      return {
        count: isOdd ? N : 0,
        text: isOdd ? `${N} rounds with 1 Rest Day (BYE) per round (Cyclic Method)` : '0 BYEs (Everyone plays every round)',
        isOdd
      };
    } else {
      if (N <= 1) return { count: 0, text: '0 BYEs', isOdd: false };
      const P = 2 ** Math.ceil(Math.log2(N));
      const count = P - N;
      return {
        count,
        text: count > 0 ? `${count} BYE awarded in Round 1 (Auto-advancing to Round 2)` : '0 BYEs (Perfect power of 2 bracket)',
        isOdd: false
      };
    }
  }, [registrations.length, isRoundRobin]);

  // Round Robin Rounds list
  const roundRobinRounds = useMemo(() => {
    if (!isRoundRobin) return [];
    const roundsMap = new Map<number, AppMatch[]>();
    selectedEventMatches.forEach(m => {
      const rNum = m.meta?.round_number || m.roundLevel + 1 || 1;
      const list = roundsMap.get(rNum) || [];
      list.push(m);
      roundsMap.set(rNum, list);
    });
    return Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [isRoundRobin, selectedEventMatches]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fixtures & Tournament Management</h1>
            <p className="text-muted-foreground">
              Generate mathematically balanced brackets, manage Round-Robin schedules, and record match winners
            </p>
          </div>
          <Button
            className="gap-2 shadow-sm font-semibold"
            onClick={handleOpenGenerateModal}
            disabled={regenerating || !selectedEvent}
            data-testid="button-generate-fixtures"
          >
            <Shuffle className="h-4 w-4" />
            {regenerating ? 'Generating Fixtures…' : 'Generate / Reset Fixtures'}
          </Button>
        </div>

        {eventsList.length > 0 ? (
          <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
            <TabsList className="flex flex-wrap w-full h-auto p-1.5 bg-muted rounded-xl">
              {eventsList.map(event => (
                <TabsTrigger
                  key={event.id}
                  value={event.id}
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  data-testid={`tab-${event.id}`}
                >
                  {event.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {eventsList.map(event => (
              <TabsContent key={event.id} value={event.id} className="space-y-6 pt-2">
                {/* Summary Statistics Card */}
                <Card className="border shadow-sm overflow-hidden bg-gradient-to-br from-card to-muted/20">
                  <CardHeader className="pb-3 border-b bg-muted/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="h-5 w-5 text-primary" />
                        {event.name} — Fixture Overview
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs px-3 py-1">
                        Format: {currentFormat}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-card border rounded-xl shadow-xs">
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 font-medium">
                          <Users className="h-3.5 w-3.5 text-primary" /> Total Participants
                        </div>
                        <div className="text-2xl font-black mt-1 text-foreground">
                          {registrations.length}
                        </div>
                      </div>

                      <div className="p-3 bg-card border rounded-xl shadow-xs">
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 font-medium">
                          <Layers className="h-3.5 w-3.5 text-blue-500" /> Total Rounds
                        </div>
                        <div className="text-2xl font-black mt-1 text-foreground">
                          {totalRounds || '—'}
                        </div>
                      </div>

                      <div className="p-3 bg-card border rounded-xl shadow-xs">
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 font-medium">
                          <Grid className="h-3.5 w-3.5 text-emerald-500" /> Total Matches
                        </div>
                        <div className="text-2xl font-black mt-1 text-foreground">
                          {selectedEventMatches.length || '—'}
                        </div>
                      </div>

                      <div className="p-3 bg-card border rounded-xl shadow-xs">
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 font-medium">
                          <Coffee className="h-3.5 w-3.5 text-amber-500" /> BYEs / Rest Days
                        </div>
                        <div className="text-sm font-bold mt-1 text-foreground truncate px-1" title={byesInfo.text}>
                          {byesInfo.count > 0 ? `${byesInfo.count} Awarded` : 'None (0)'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2 px-1">
                      <span>📌 <strong>Rule constraint:</strong> {byesInfo.text}</span>
                      {!isRoundRobin && registrations.length > 0 && (
                        <span>
                          Brackets split: <strong>Upper Half</strong> ({Math.ceil(registrations.length / 2)}) &bull; <strong>Lower Half</strong> ({Math.floor(registrations.length / 2)})
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Champion Banner */}
                {championDisplay && championDisplay.hasPlayer && (
                  <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-yellow-500/50 p-6 shadow-md animate-in fade-in">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-yellow-500/30 p-3.5 ring-4 ring-yellow-500/20">
                          <Trophy className="h-9 w-9 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <div className="text-xs uppercase font-bold tracking-widest text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" /> Official Tournament Champion Declared
                          </div>
                          <div className="text-3xl font-black text-foreground mt-0.5">
                            {championDisplay.display}
                          </div>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 bg-yellow-500/30 px-4 py-2 rounded-full text-xs font-bold text-yellow-900 dark:text-yellow-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Tournament Concluded
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Filter */}
                <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Location Filter:
                    </Label>
                    <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
                      {['All', 'Hyderabad', 'Bangalore'].map(loc => (
                        <button
                          key={loc}
                          onClick={() => setLocationFilter(loc)}
                          className={cn(
                            'px-3 py-1 text-xs rounded-md font-medium transition-all',
                            locationFilter === loc
                              ? 'bg-background text-foreground shadow-xs font-semibold'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Content: Round Robin or Knockout Bracket */}
                {loading ? (
                  <div className="text-center py-16 text-muted-foreground">Loading tournament fixtures…</div>
                ) : selectedEventMatches.length === 0 ? (
                  <div className="text-center py-20 space-y-4 border rounded-2xl bg-muted/20">
                    <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">No Fixtures Generated Yet</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        {registrations.length > 0
                          ? `You have ${registrations.length} registered participant(s). Click Generate Fixtures to create the schedule.`
                          : 'No participants registered for this event yet. Please add registrations first.'}
                      </p>
                    </div>
                    {registrations.length > 0 && (
                      <Button onClick={handleOpenGenerateModal} className="font-semibold gap-2">
                        <Shuffle className="h-4 w-4" />
                        Generate Fixtures Now
                      </Button>
                    )}
                  </div>
                ) : isRoundRobin ? (
                  /* ========================================================================= */
                  /* ROUND ROBIN VIEW                                                          */
                  /* ========================================================================= */
                  <div className="space-y-6">
                    {/* Standings Table Card */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Award className="h-4 w-4 text-primary" />
                          Live Standings & Points Table (Round-Robin)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase bg-muted/60 text-muted-foreground border-b font-bold">
                            <tr>
                              <th className="py-3 px-4 w-12 text-center">Rank</th>
                              <th className="py-3 px-4">Participant</th>
                              <th className="py-3 px-4 text-center">Played</th>
                              <th className="py-3 px-4 text-center text-emerald-600">Won</th>
                              <th className="py-3 px-4 text-center text-rose-600">Lost</th>
                              <th className="py-3 px-4 text-center font-black text-primary">Points</th>
                              <th className="py-3 px-4 text-center">Form</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {roundRobinStandings.map((row, idx) => {
                              const pDisplay = getParticipantDisplay(row.player, registrations);
                              const isLeader = idx === 0;
                              return (
                                <tr
                                  key={row.player}
                                  className={cn(
                                    'hover:bg-muted/40 transition-colors',
                                    isLeader ? 'bg-primary/5 font-semibold' : ''
                                  )}
                                >
                                  <td className="py-3 px-4 text-center font-bold">
                                    {isLeader ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-foreground">{pDisplay.name}</div>
                                    {pDisplay.id && (
                                      <div className="text-xs font-mono text-muted-foreground">ID: {pDisplay.id}</div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center font-medium">{row.played}</td>
                                  <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                    {row.won}
                                  </td>
                                  <td className="py-3 px-4 text-center font-medium text-rose-600 dark:text-rose-400">
                                    {row.lost}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-base text-primary">
                                    {row.points}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {row.form.length > 0 ? (
                                        row.form.map((res, i) => (
                                          <span
                                            key={i}
                                            className={cn(
                                              'w-5 h-5 rounded text-2xs flex items-center justify-center font-bold text-white',
                                              res === 'W' ? 'bg-emerald-500' : 'bg-rose-500'
                                            )}
                                          >
                                            {res}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    {/* Round-by-Round Schedule Tabs */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Round-by-Round Match Schedule
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {roundRobinRounds.length} Total Rounds
                        </span>
                      </div>

                      <Tabs value={roundRobinActiveTab} onValueChange={setRoundRobinActiveTab}>
                        <TabsList className="flex flex-wrap w-full h-auto p-1 bg-muted rounded-xl">
                          {roundRobinRounds.map(([roundNum]) => (
                            <TabsTrigger
                              key={`r-tab-${roundNum}`}
                              value={String(roundNum)}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg"
                            >
                              Round {roundNum}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {roundRobinRounds.map(([roundNum, roundMatches]) => {
                          const byePlayerId = roundMatches[0]?.meta?.bye_player;
                          const byePlayerDisplay = byePlayerId ? getParticipantDisplay(byePlayerId, registrations) : null;
                          const filteredMatches = roundMatches.filter(
                            m => locationFilter === 'All' || !m.location || m.location === locationFilter
                          );

                          return (
                            <TabsContent key={`r-content-${roundNum}`} value={String(roundNum)} className="space-y-4 pt-2">
                              {/* Round BYE / Rest Day Alert */}
                              {byePlayerDisplay && byePlayerDisplay.hasPlayer && (
                                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center justify-between gap-3 text-sm">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                      <Coffee className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <span className="text-xs uppercase font-bold text-amber-700 dark:text-amber-300 tracking-wider">
                                        Rest Day (BYE) for Round {roundNum}:
                                      </span>
                                      <div className="font-bold text-foreground">
                                        {byePlayerDisplay.display}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30">
                                    Cyclic Rest Day
                                  </Badge>
                                </div>
                              )}

                              {/* Matches Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredMatches.map(match => {
                                  const p1 = getParticipantDisplay(match.player1Id, registrations);
                                  const p2 = getParticipantDisplay(match.player2Id, registrations);
                                  const isComplete = match.status === 'Completed';
                                  const currentWinnerId = selectedWinners[match.id] || match.winnerId || '';
                                  const currentScore = matchScores[match.id] ?? (match.score || '');

                                  return (
                                    <div
                                      key={match.id}
                                      className={cn(
                                        'border rounded-xl p-4 bg-card shadow-xs transition-all space-y-3.5',
                                        isComplete ? 'border-primary/40 bg-primary/5' : 'hover:border-border/80'
                                      )}
                                    >
                                      <div className="flex items-center justify-between text-xs border-b pb-2">
                                        <span className="font-bold text-foreground">
                                          Match #{match.numericId} {match.location ? `• ${match.location}` : ''}
                                        </span>
                                        <StatusBadge status={match.status} />
                                      </div>

                                      {/* Matchup Participants */}
                                      <div className="space-y-2">
                                        {/* Player 1 */}
                                        <div
                                          className={cn(
                                            'p-2.5 rounded-lg border text-sm transition-all',
                                            match.winnerId === match.player1Id
                                              ? 'bg-emerald-500/15 border-emerald-500/50 font-bold'
                                              : 'bg-muted/30'
                                          )}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold">{p1.name}</span>
                                            {match.winnerId === match.player1Id && (
                                              <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                                Winner
                                              </span>
                                            )}
                                          </div>
                                          {p1.id && <div className="text-xs font-mono text-muted-foreground">ID: {p1.id}</div>}
                                        </div>

                                        <div className="text-center text-xs font-black text-muted-foreground uppercase">
                                          VS
                                        </div>

                                        {/* Player 2 */}
                                        <div
                                          className={cn(
                                            'p-2.5 rounded-lg border text-sm transition-all',
                                            match.winnerId === match.player2Id
                                              ? 'bg-emerald-500/15 border-emerald-500/50 font-bold'
                                              : 'bg-muted/30'
                                          )}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold">{p2.name}</span>
                                            {match.winnerId === match.player2Id && (
                                              <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                                Winner
                                              </span>
                                            )}
                                          </div>
                                          {p2.id && <div className="text-xs font-mono text-muted-foreground">ID: {p2.id}</div>}
                                        </div>
                                      </div>

                                      {/* Result Input / Winner Selection */}
                                      <div className="pt-2 border-t space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">
                                            Winner:
                                          </Label>
                                          <input
                                            type="text"
                                            placeholder="Score (e.g. 21-18)"
                                            value={currentScore}
                                            onChange={(e) => handleScoreChange(match.id, e.target.value)}
                                            className="text-xs px-2 py-1 border rounded w-32 bg-background font-mono"
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleWinnerSelection(match.id, match.player1Id)}
                                            className={cn(
                                              'py-1.5 px-2 rounded-md border text-xs font-semibold truncate transition-colors',
                                              currentWinnerId === match.player1Id
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'hover:bg-muted'
                                            )}
                                          >
                                            {p1.name}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleWinnerSelection(match.id, match.player2Id!)}
                                            className={cn(
                                              'py-1.5 px-2 rounded-md border text-xs font-semibold truncate transition-colors',
                                              currentWinnerId === match.player2Id
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'hover:bg-muted'
                                            )}
                                          >
                                            {p2.name}
                                          </button>
                                        </div>

                                        <Button
                                          size="sm"
                                          className="w-full font-semibold text-xs h-8"
                                          onClick={() => handleSaveWinner(match)}
                                          disabled={!currentWinnerId || savingWinner[match.id]}
                                        >
                                          {savingWinner[match.id] ? 'Saving…' : 'Save Match Result'}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    </div>
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* SINGLE ELIMINATION KNOCKOUT BRACKET VIEW                                  */
                  /* ========================================================================= */
                  <div className="overflow-x-auto pb-4" ref={containerRef}>
                    <div className="flex gap-8 min-w-max items-start pt-2">
                      {roundLevels.map((level, roundIdx) => {
                        const roundName = roundLabelForLevel(level, roundIdx);
                        const roundMatches = selectedEventMatches
                          .filter(m => m.roundLevel === level)
                          .filter(m => locationFilter === 'All' || !m.location || m.location === locationFilter)
                          .sort((a, b) => Number(a.meta?.bracket_index ?? 0) - Number(b.meta?.bracket_index ?? 0));

                        if (roundMatches.length === 0) return null;

                        return (
                          <div key={`round-${level}`} className="flex-shrink-0 w-84 sm:w-96 space-y-4">
                            {/* Round Column Header */}
                            <div className="text-center bg-muted/70 py-2.5 px-3 rounded-xl border font-bold text-sm text-foreground shadow-xs flex items-center justify-between">
                              <span className="font-black text-primary">{roundName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'}
                              </Badge>
                            </div>

                            <div className="space-y-4">
                              {roundMatches.map(match => {
                                const p1 = getParticipantDisplay(match.player1Id, registrations);
                                const p2 = getParticipantDisplay(match.player2Id, registrations);
                                const isComplete = match.status === 'Completed';
                                const isByeMatch = match.meta?.is_bye;
                                const currentWinnerId = selectedWinners[match.id] || match.winnerId || '';
                                const bothPlayersReady = (p1.hasPlayer && p2.hasPlayer) || isByeMatch;
                                const half = match.meta?.half;

                                return (
                                  <div
                                    key={match.id}
                                    className={cn(
                                      'border rounded-xl p-4 bg-card shadow-xs transition-all space-y-3',
                                      isComplete ? 'border-primary/40 bg-primary/5' : 'hover:border-border/80'
                                    )}
                                    data-testid={`match-${match.id}`}
                                  >
                                    {/* Match Header */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-foreground">
                                          Match #{match.numericId}
                                        </span>
                                        {half && (
                                          <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                            {half}
                                          </span>
                                        )}
                                      </div>
                                      <StatusBadge status={match.status} />
                                    </div>

                                    {/* BYE Badge if applicable */}
                                    {isByeMatch && (
                                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-200">
                                        <Coffee className="h-3.5 w-3.5 text-amber-500" />
                                        <span><strong>Round 1 BYE:</strong> Automatically advances to Round 2</span>
                                      </div>
                                    )}

                                    {/* Participants Cards */}
                                    <div className="space-y-2">
                                      {/* Player 1 */}
                                      <div
                                        className={cn(
                                          'rounded-lg p-2.5 border transition-colors',
                                          match.winnerId === match.player1Id && match.player1Id
                                            ? 'bg-emerald-500/15 border-emerald-500/50 font-bold'
                                            : isComplete && match.player1Id
                                            ? 'opacity-60 bg-muted/30'
                                            : p1.hasPlayer
                                            ? 'bg-muted/40'
                                            : 'bg-muted/10 border-dashed text-muted-foreground'
                                        )}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium text-sm">{p1.name}</div>
                                          {match.winnerId === match.player1Id && match.player1Id && (
                                            <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                              <UserCheck className="h-3 w-3" /> Winner
                                            </span>
                                          )}
                                        </div>
                                        {p1.id && (
                                          <div className="text-xs font-mono text-muted-foreground mt-0.5">
                                            ID: {p1.id}
                                          </div>
                                        )}
                                      </div>

                                      {!isByeMatch && (
                                        <>
                                          <div className="text-center text-2xs font-bold text-muted-foreground uppercase tracking-widest">
                                            VS
                                          </div>

                                          {/* Player 2 */}
                                          <div
                                            className={cn(
                                              'rounded-lg p-2.5 border transition-colors',
                                              match.winnerId === match.player2Id && match.player2Id
                                                ? 'bg-emerald-500/15 border-emerald-500/50 font-bold'
                                                : isComplete && match.player2Id
                                                ? 'opacity-60 bg-muted/30'
                                                : p2.hasPlayer
                                                ? 'bg-muted/40'
                                                : 'bg-muted/10 border-dashed text-muted-foreground'
                                            )}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="font-medium text-sm">{p2.name}</div>
                                              {match.winnerId === match.player2Id && match.player2Id && (
                                                <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                  <UserCheck className="h-3 w-3" /> Winner
                                                </span>
                                              )}
                                            </div>
                                            {p2.id && (
                                              <div className="text-xs font-mono text-muted-foreground mt-0.5">
                                                ID: {p2.id}
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Manual Winner Selection Form */}
                                    {!isByeMatch && bothPlayersReady ? (
                                      <div className="pt-2 border-t space-y-2.5">
                                        <Label className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">
                                          {isComplete ? 'Change / Update Winner:' : 'Select Winner:'}
                                        </Label>

                                        <div className="grid grid-cols-1 gap-1.5">
                                          <label className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/60 cursor-pointer text-sm">
                                            <input
                                              type="radio"
                                              name={`winner-${match.id}`}
                                              value={match.player1Id}
                                              checked={currentWinnerId === match.player1Id}
                                              onChange={() => handleWinnerSelection(match.id, match.player1Id)}
                                              className="h-4 w-4 text-primary"
                                            />
                                            <span className="font-medium truncate">{p1.display}</span>
                                          </label>

                                          <label className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/60 cursor-pointer text-sm">
                                            <input
                                              type="radio"
                                              name={`winner-${match.id}`}
                                              value={match.player2Id!}
                                              checked={currentWinnerId === match.player2Id}
                                              onChange={() => handleWinnerSelection(match.id, match.player2Id!)}
                                              className="h-4 w-4 text-primary"
                                            />
                                            <span className="font-medium truncate">{p2.display}</span>
                                          </label>
                                        </div>

                                        <Button
                                          size="sm"
                                          className="w-full font-semibold"
                                          onClick={() => handleSaveWinner(match)}
                                          disabled={!currentWinnerId || savingWinner[match.id]}
                                          data-testid={`button-save-winner-${match.id}`}
                                        >
                                          {savingWinner[match.id] ? 'Saving Winner…' : 'Save Winner'}
                                        </Button>
                                      </div>
                                    ) : !isByeMatch ? (
                                      <div className="pt-2 border-t text-center text-xs text-muted-foreground">
                                        Waiting for opponent to advance from previous round.
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
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No events found. Please create an event first in Events management.
            </CardContent>
          </Card>
        )}

        {/* Generate / Reset Fixtures Modal with Format Selector */}
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-primary" />
                Generate Tournament Fixtures
              </DialogTitle>
              <DialogDescription>
                Choose the tournament format. The scheduler will automatically enforce all mathematical constraints.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Select Tournament Format:</Label>
                <div className="grid grid-cols-1 gap-2.5">
                  <label
                    className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                      selectedFormat === 'Single Elimination'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="Single Elimination"
                      checked={selectedFormat === 'Single Elimination'}
                      onChange={() => setSelectedFormat('Single Elimination')}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-bold text-sm">Single Elimination (Knockout)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Brackets split into Upper & Lower Halves. Automatically calculates BYEs ($2^k - N$) in Round 1 so Round 2 is an exact power of 2.
                      </div>
                    </div>
                  </label>

                  <label
                    className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                      selectedFormat === 'Round Robin'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="Round Robin"
                      checked={selectedFormat === 'Round Robin'}
                      onChange={() => setSelectedFormat('Round Robin')}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-bold text-sm">Single Round-Robin (Circle Method)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Each pair plays once. $N(N-1)/2$ matches. Odd counts receive 1 Rest Day (BYE) per round using the Circle Method.
                      </div>
                    </div>
                  </label>

                  <label
                    className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                      selectedFormat === 'Double Round Robin'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="Double Round Robin"
                      checked={selectedFormat === 'Double Round Robin'}
                      onChange={() => setSelectedFormat('Double Round Robin')}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-bold text-sm">Double Round-Robin (Home & Away)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Each pair plays twice (Home & Away). $N(N-1)$ matches.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border text-xs text-muted-foreground space-y-1">
                <div className="font-bold text-foreground">Registered Participants: {registrations.length}</div>
                {selectedFormat === 'Single Elimination' ? (
                  <div>
                    Next power of 2: {2 ** Math.ceil(Math.log2(Math.max(registrations.length, 2)))} &bull; BYEs to award: {Math.max(0, 2 ** Math.ceil(Math.log2(Math.max(registrations.length, 2))) - registrations.length)} &bull; Total Matches: {Math.max(0, registrations.length - 1)}
                  </div>
                ) : selectedFormat === 'Double Round Robin' ? (
                  <div>
                    Total Rounds: {(registrations.length % 2 !== 0 ? registrations.length : Math.max(1, registrations.length - 1)) * 2} &bull; Total Matches: {registrations.length * (registrations.length - 1)}
                  </div>
                ) : (
                  <div>
                    Total Rounds: {registrations.length % 2 !== 0 ? registrations.length : Math.max(1, registrations.length - 1)} &bull; Total Matches: {Math.floor((registrations.length * (registrations.length - 1)) / 2)}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmGenerate} disabled={regenerating} className="font-semibold gap-2">
                <Sparkles className="h-4 w-4" />
                {regenerating ? 'Generating…' : 'Generate Fixtures'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
