import { useState, useEffect, useMemo } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Layers,
  Grid,
  Coffee,
  Award,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import {
  fetchEvents,
  fetchRegistrations,
  fetchMatches,
  getParticipantDisplay,
  type AppEvent,
  type AppRegistration,
  type AppMatch
} from '@/lib/api';

export default function Fixtures() {
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [locationFilter, setLocationFilter] = useState<'All' | string>('All');
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [registrations, setRegistrations] = useState<AppRegistration[]>([]);
  const [viewMode, setViewMode] = useState<'schedule' | 'bracket' | 'standings'>('schedule');
  const [loading, setLoading] = useState(false);

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

  const loadData = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [regs, mat] = await Promise.all([
        fetchRegistrations(eventId),
        fetchMatches(eventId)
      ]);
      setRegistrations(regs);
      setMatches(mat);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      loadData(selectedEvent);
    }
  }, [selectedEvent]);
  const filteredEventsList = useMemo(() => {
    if (locationFilter === 'All') return eventsList;
    return eventsList.filter(ev => {
      const loc = (ev.meta?.location as string) || (ev.name.includes('Hitech City') ? 'Hitech City' : ev.name.includes('Irrum Manzil') ? 'Irrum Manzil' : (ev.name.includes('Bangalore') ? 'Hitech City' : ev.name.includes('Hyderabad') ? 'Irrum Manzil' : 'All'));
      return loc === locationFilter || loc === 'All' || loc === 'All Locations';
    });
  }, [eventsList, locationFilter]);

  useEffect(() => {
    if (filteredEventsList.length > 0 && !filteredEventsList.some(e => e.id === selectedEvent)) {
      setSelectedEvent(filteredEventsList[0].id);
    }
  }, [filteredEventsList, selectedEvent]);

  const eventMatches = useMemo(() => {
    return matches
      .filter(m => m.eventId === selectedEvent)
      .filter(m => locationFilter === 'All' || !m.location || m.location === locationFilter);
  }, [matches, selectedEvent, locationFilter]);

  const currentEvent = useMemo(() => {
    return eventsList.find(e => e.id === selectedEvent);
  }, [eventsList, selectedEvent]);

  // Detected format
  const currentFormat = useMemo(() => {
    if (eventMatches.length > 0 && eventMatches[0].meta?.format) {
      return eventMatches[0].meta.format;
    }
    return currentEvent?.format || 'Single Elimination';
  }, [eventMatches, currentEvent]);

  const isRoundRobin = currentFormat === 'Round Robin';

  // Round levels for bracket
  const roundLevels = useMemo(() => {
    const levels = Array.from(new Set(eventMatches.map(m => m.roundLevel)));
    levels.sort((a, b) => a - b);
    return levels;
  }, [eventMatches]);

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

  // Group matches by round for Round-by-Round Schedule
  const roundsGrouped = useMemo(() => {
    const map = new Map<number, AppMatch[]>();
    eventMatches.forEach(m => {
      const rNum = m.meta?.round_number || m.roundLevel + 1 || 1;
      const list = map.get(rNum) || [];
      list.push(m);
      map.set(rNum, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [eventMatches]);

  // Round Robin Standings
  const standings = useMemo(() => {
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

    eventMatches.forEach(m => {
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
  }, [isRoundRobin, registrations, eventMatches]);

  // Check champion
  const championDisplay = useMemo(() => {
    if (isRoundRobin) {
      const allDone = eventMatches.length > 0 && eventMatches.every(m => m.status === 'Completed');
      if (!allDone || standings.length === 0) return null;
      return getParticipantDisplay(standings[0].player, registrations);
    }

    if (roundLevels.length === 0) return null;
    const maxLevel = roundLevels[roundLevels.length - 1];
    const finalM = eventMatches.find(m => m.roundLevel === maxLevel && m.status === 'Completed' && m.winnerId);
    if (!finalM || !finalM.winnerId) return null;
    return getParticipantDisplay(finalM.winnerId, registrations);
  }, [isRoundRobin, eventMatches, standings, roundLevels, registrations]);

  // BYEs description
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
        text: count > 0 ? `${count} BYE in Round 1 (Auto-advancing to Round 2)` : '0 BYEs (Exact power of 2 bracket)',
        isOdd: false
      };
    }
  }, [registrations.length, isRoundRobin]);

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-10 px-4">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 via-sky-500/15 to-blue-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-sky-500" />
              <span>Interactive Tournament Schedule</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-['Outfit'] tracking-tight text-foreground">
              Fixtures & Match Schedules
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Explore matchups, round-by-round schedules, rest days, and knockout championship brackets
            </p>
          </div>

          {/* Location Filter Pills */}
          <div className="flex justify-center gap-2">
            {['All', 'Irrum Manzil', 'Hitech City'].map(loc => (
              <button
                key={loc}
                className={cn(
                  'px-5 py-2 rounded-2xl text-xs font-bold transition-all',
                  locationFilter === loc
                    ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-background hover:bg-muted text-foreground border shadow-xs'
                )}
                onClick={() => setLocationFilter(loc)}
              >
                {loc === 'All' ? 'All Locations' : `${loc} Arena`}
              </button>
            ))}
          </div>

          {filteredEventsList.length > 0 ? (
            <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
              <TabsList className="flex flex-wrap w-full h-auto p-1.5 bg-muted rounded-2xl mb-6 border">
                {filteredEventsList.map(event => (
                  <TabsTrigger
                    key={event.id}
                    value={event.id}
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl"
                  >
                    {event.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {filteredEventsList.map(event => (
                <TabsContent key={event.id} value={event.id} className="space-y-6">
                  {/* Summary Bar */}
                  <Card className="border shadow-xs overflow-hidden bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 bg-muted/40 rounded-xl border">
                          <div className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                            <Users className="h-3.5 w-3.5 text-primary" /> Participants
                          </div>
                          <div className="text-xl sm:text-2xl font-black mt-1 text-foreground">
                            {registrations.length}
                          </div>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-xl border">
                          <div className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                            <Badge variant="outline" className="text-2xs uppercase">
                              {currentFormat}
                            </Badge>
                          </div>
                          <div className="text-xs font-bold mt-2 text-foreground truncate">
                            {isRoundRobin ? 'All-play-all' : 'Single Elimination'}
                          </div>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-xl border">
                          <div className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-blue-500" /> Total Rounds
                          </div>
                          <div className="text-xl sm:text-2xl font-black mt-1 text-foreground">
                            {roundsGrouped.length || '—'}
                          </div>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-xl border">
                          <div className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                            <Grid className="h-3.5 w-3.5 text-emerald-500" /> Total Matches
                          </div>
                          <div className="text-xl sm:text-2xl font-black mt-1 text-foreground">
                            {eventMatches.length || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2 px-1">
                        <span>💡 <strong>Schedule Info:</strong> {byesInfo.text}</span>
                        {!isRoundRobin && registrations.length > 0 && (
                          <span>
                            Upper Half: {Math.ceil(registrations.length / 2)} &bull; Lower Half: {Math.floor(registrations.length / 2)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Champion Banner if declared */}
                  {championDisplay && championDisplay.hasPlayer && (
                    <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-yellow-500/50 p-6 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="rounded-full bg-yellow-500/30 p-3 ring-4 ring-yellow-500/20">
                            <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div>
                            <div className="text-xs uppercase font-bold tracking-widest text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5" /> Tournament Champion
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5">
                              {championDisplay.display}
                            </div>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-yellow-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-yellow-900 dark:text-yellow-200">
                          <CheckCircle2 className="h-4 w-4" />
                          Tournament Concluded
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View Mode Selector */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                      <button
                        onClick={() => setViewMode('schedule')}
                        className={cn(
                          'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                          viewMode === 'schedule'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        📅 Round-by-Round Schedule
                      </button>

                      {!isRoundRobin && (
                        <button
                          onClick={() => setViewMode('bracket')}
                          className={cn(
                            'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                            viewMode === 'bracket'
                              ? 'bg-background text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          🏆 Bracket Tree View
                        </button>
                      )}

                      {isRoundRobin && (
                        <button
                          onClick={() => setViewMode('standings')}
                          className={cn(
                            'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                            viewMode === 'standings'
                              ? 'bg-background text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          📊 Live Standings Table
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Display Area */}
                  {loading ? (
                    <div className="text-center py-16 text-muted-foreground">Loading fixtures…</div>
                  ) : eventMatches.length === 0 ? (
                    <div className="rounded-2xl border p-16 text-center text-muted-foreground space-y-2 bg-muted/20">
                      <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                      <div className="font-semibold text-lg">Fixtures Pending</div>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Fixtures will appear here once generated by the tournament administrators.
                      </p>
                    </div>
                  ) : viewMode === 'standings' && isRoundRobin ? (
                    /* STANDINGS VIEW */
                    <Card className="border shadow-xs">
                      <CardHeader className="pb-3 border-b bg-muted/30">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Award className="h-4 w-4 text-primary" />
                          Round-Robin League Standings
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
                            {standings.map((row, idx) => {
                              const pDisplay = getParticipantDisplay(row.player, registrations);
                              return (
                                <tr key={row.player} className={cn('hover:bg-muted/40 transition-colors', idx === 0 ? 'bg-primary/5 font-semibold' : '')}>
                                  <td className="py-3 px-4 text-center font-bold">
                                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-foreground">{pDisplay.name}</div>
                                    {pDisplay.id && <div className="text-xs font-mono text-muted-foreground">ID: {pDisplay.id}</div>}
                                  </td>
                                  <td className="py-3 px-4 text-center font-medium">{row.played}</td>
                                  <td className="py-3 px-4 text-center font-bold text-emerald-600">{row.won}</td>
                                  <td className="py-3 px-4 text-center font-medium text-rose-600">{row.lost}</td>
                                  <td className="py-3 px-4 text-center font-black text-base text-primary">{row.points}</td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {row.form.length > 0 ? row.form.map((res, i) => (
                                        <span key={i} className={cn('w-5 h-5 rounded text-2xs flex items-center justify-center font-bold text-white', res === 'W' ? 'bg-emerald-500' : 'bg-rose-500')}>
                                          {res}
                                        </span>
                                      )) : <span className="text-xs text-muted-foreground">—</span>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  ) : viewMode === 'bracket' && !isRoundRobin ? (
                    /* BRACKET TREE VIEW */
                    <div className="overflow-x-auto pb-4">
                      <div className="flex gap-8 min-w-max items-start pt-2">
                        {roundLevels.map((level, roundIdx) => {
                          const roundName = roundLabelForLevel(level, roundIdx);
                          const roundMatches = eventMatches
                            .filter(m => m.roundLevel === level)
                            .sort((a, b) => Number(a.meta?.bracket_index ?? 0) - Number(b.meta?.bracket_index ?? 0));

                          if (roundMatches.length === 0) return null;

                          return (
                            <div key={`round-${level}`} className="flex-shrink-0 w-84 sm:w-96 space-y-4">
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
                                  const half = match.meta?.half;

                                  return (
                                    <div
                                      key={match.id}
                                      className={cn(
                                        'border rounded-xl p-4 bg-card shadow-xs transition-all space-y-3',
                                        isComplete ? 'border-primary/40 bg-primary/5' : 'hover:shadow-md'
                                      )}
                                    >
                                      <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-foreground">Match #{match.numericId}</span>
                                          {half && (
                                            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                              {half}
                                            </span>
                                          )}
                                        </div>
                                        <StatusBadge status={match.status} />
                                      </div>

                                      {isByeMatch && (
                                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-200">
                                          <Coffee className="h-3.5 w-3.5 text-amber-500" />
                                          <span><strong>Round 1 BYE:</strong> Advances to Round 2</span>
                                        </div>
                                      )}

                                      <div className="space-y-2">
                                        <div className={cn('p-2.5 rounded-lg border text-sm transition-colors', match.winnerId === match.player1Id && match.player1Id ? 'bg-emerald-500/15 border-emerald-500/50 font-bold' : p1.hasPlayer ? 'bg-muted/40' : 'bg-muted/10 border-dashed text-muted-foreground')}>
                                          <div className="flex items-center justify-between">
                                            <div className="font-medium text-sm">{p1.name}</div>
                                            {match.winnerId === match.player1Id && match.player1Id && (
                                              <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                                Winner
                                              </span>
                                            )}
                                          </div>
                                          {p1.id && <div className="text-xs font-mono text-muted-foreground mt-0.5">ID: {p1.id}</div>}
                                        </div>

                                        {!isByeMatch && (
                                          <>
                                            <div className="text-center text-2xs font-bold text-muted-foreground uppercase">VS</div>
                                            <div className={cn('p-2.5 rounded-lg border text-sm transition-colors', match.winnerId === match.player2Id && match.player2Id ? 'bg-emerald-500/15 border-emerald-500/50 font-bold' : p2.hasPlayer ? 'bg-muted/40' : 'bg-muted/10 border-dashed text-muted-foreground')}>
                                              <div className="flex items-center justify-between">
                                                <div className="font-medium text-sm">{p2.name}</div>
                                                {match.winnerId === match.player2Id && match.player2Id && (
                                                  <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                                    Winner
                                                  </span>
                                                )}
                                              </div>
                                              {p2.id && <div className="text-xs font-mono text-muted-foreground mt-0.5">ID: {p2.id}</div>}
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {match.scheduledDate && (
                                        <div className="pt-2 border-t text-xs text-muted-foreground flex flex-wrap gap-2">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(match.scheduledDate).toLocaleDateString()}
                                          </span>
                                          {match.scheduledTime && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {match.scheduledTime}
                                            </span>
                                          )}
                                        </div>
                                      )}
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
                    /* ROUND-BY-ROUND SCHEDULE VIEW (DEFAULT) */
                    <div className="space-y-6">
                      {roundsGrouped.map(([roundNum, roundMatches]) => {
                        const byePlayerId = roundMatches[0]?.meta?.bye_player;
                        const byePlayerDisplay = byePlayerId ? getParticipantDisplay(byePlayerId, registrations) : null;
                        const roundTitle = isRoundRobin ? `Round ${roundNum}` : roundMatches[0]?.round || `Round ${roundNum}`;

                        return (
                          <div key={`round-sec-${roundNum}`} className="space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-primary">
                                  {roundTitle}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-normal">
                                  ({roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'})
                                </span>
                              </h3>
                            </div>

                            {/* Round BYE / Rest Day Alert */}
                            {byePlayerDisplay && byePlayerDisplay.hasPlayer && (
                              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Coffee className="h-4 w-4 text-amber-500" />
                                  <div>
                                    <span className="text-2xs uppercase font-bold text-amber-700 dark:text-amber-300 tracking-wider">
                                      {isRoundRobin ? 'Cyclic Rest Day (BYE):' : 'Round 1 BYE:'}
                                    </span>
                                    <div className="font-bold text-foreground">
                                      {byePlayerDisplay.display}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-2xs bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30">
                                  {isRoundRobin ? 'Rest Day' : 'Auto-Advanced'}
                                </Badge>
                              </div>
                            )}

                            {/* Matches Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {roundMatches.map(match => {
                                const p1 = getParticipantDisplay(match.player1Id, registrations);
                                const p2 = getParticipantDisplay(match.player2Id, registrations);
                                const isComplete = match.status === 'Completed';

                                return (
                                  <div
                                    key={match.id}
                                    className={cn(
                                      'border rounded-xl p-4 bg-card hover:shadow-md transition-shadow space-y-3',
                                      isComplete ? 'border-primary/30 bg-primary/5' : ''
                                    )}
                                  >
                                    <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
                                      <span className="font-bold text-foreground">
                                        Match #{match.matchNumber || match.meta?.match_number || match.numericId} {match.location ? `• ${match.location}` : ''}
                                      </span>
                                      <StatusBadge status={match.status} />
                                    </div>

                                    <div className="space-y-2 py-1">
                                      <div
                                        className={cn(
                                          'p-2.5 rounded-lg border text-sm font-medium transition-colors',
                                          match.winnerId === match.player1Id && match.player1Id
                                            ? 'bg-emerald-500/15 border-emerald-500/50 font-bold'
                                            : p1.hasPlayer
                                            ? 'bg-muted/40'
                                            : 'bg-muted/10 border-dashed text-muted-foreground'
                                        )}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{p1.name}</span>
                                          {match.winnerId === match.player1Id && (
                                            <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                              Winner
                                            </span>
                                          )}
                                        </div>
                                        {p1.id && <div className="text-xs text-muted-foreground font-mono">ID: {p1.id}</div>}
                                      </div>

                                      {match.player2Id !== null ? (
                                        <>
                                          <div className="text-center text-2xs font-bold text-muted-foreground uppercase">VS</div>

                                          <div
                                            className={cn(
                                              'p-2.5 rounded-lg border text-sm font-medium transition-colors',
                                              match.winnerId === match.player2Id && match.player2Id
                                                ? 'bg-emerald-500/15 border-emerald-500/50 font-bold'
                                                : p2.hasPlayer
                                                ? 'bg-muted/40'
                                                : 'bg-muted/10 border-dashed text-muted-foreground'
                                            )}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span>{p2.name}</span>
                                              {match.winnerId === match.player2Id && (
                                                <span className="text-2xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                                  Winner
                                                </span>
                                              )}
                                            </div>
                                            {p2.id && <div className="text-xs text-muted-foreground font-mono">ID: {p2.id}</div>}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-center text-amber-700 dark:text-amber-300 font-medium">
                                          BYE — Automatically Advances
                                        </div>
                                      )}
                                    </div>

                                    {match.scheduledDate && (
                                      <div className="pt-2 border-t text-xs text-muted-foreground flex flex-wrap gap-2">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(match.scheduledDate).toLocaleDateString()}
                                        </span>
                                        {match.scheduledTime && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {match.scheduledTime}
                                          </span>
                                        )}
                                        {match.venue && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {match.venue}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No events found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
