import { useState, useEffect, useMemo } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, CheckCircle2, Award, Clock, MapPin, Sparkles, Building2, Layers } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import {
  fetchEvents,
  fetchRegistrations,
  fetchMatches,
  getParticipantDisplay,
  type AppEvent,
  type AppRegistration,
  type AppMatch
} from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Results() {
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<'All' | 'Irrum Manzil' | 'Hitech City' | string>('All');
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [registrations, setRegistrations] = useState<AppRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [evs, r, m] = await Promise.all([
          fetchEvents(),
          fetchRegistrations(),
          fetchMatches()
        ]);
        if (!mounted) return;
        setEventsList(evs);
        setRegistrations(r);
        setMatches(m);
        if (evs.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const evParam = params.get('event');
          const matchEv = evs.find(e => e.id === evParam);
          setSelectedEvent(matchEv ? matchEv.id : evs[0].id);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Helper to extract location for an event or match
  const getMatchLocation = (m: AppMatch) => {
    if (m.location) {
      if (m.location === 'Hyderabad') return 'Irrum Manzil';
      if (m.location === 'Bangalore') return 'Hitech City';
      return m.location;
    }
    const ev = eventsList.find(e => e.id === m.eventId);
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

  // Filter events matching selected location
  const filteredEvents = useMemo(() => {
    if (selectedLocation === 'All') return eventsList;
    return eventsList.filter(ev => {
      const loc = (ev.meta?.location as string) || (ev.name.includes('Hitech City') ? 'Hitech City' : ev.name.includes('Irrum Manzil') ? 'Irrum Manzil' : (ev.name.includes('Bangalore') ? 'Hitech City' : ev.name.includes('Hyderabad') ? 'Irrum Manzil' : 'All Locations'));
      return loc === selectedLocation || loc === 'All Locations';
    });
  }, [eventsList, selectedLocation]);

  // Keep selectedEvent valid
  useEffect(() => {
    if (filteredEvents.length > 0 && !filteredEvents.some(e => e.id === selectedEvent)) {
      setSelectedEvent(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedEvent]);

  // Matches for currently selected event & location filter
  const completedMatches = useMemo(() => {
    return matches
      .filter(m => m.eventId === selectedEvent && m.status === 'Completed' && m.winnerId)
      .filter(m => {
        if (selectedLocation === 'All') return true;
        const loc = getMatchLocation(m);
        return loc === selectedLocation || loc === 'Main Arena';
      })
      .slice()
      .reverse();
  }, [matches, selectedEvent, selectedLocation, eventsList]);

  // Group completed matches by location when "All" is active
  const matchesByLocation = useMemo(() => {
    const irrumMatches = completedMatches.filter(m => getMatchLocation(m) === 'Irrum Manzil');
    const hitechMatches = completedMatches.filter(m => getMatchLocation(m) === 'Hitech City');
    const otherMatches = completedMatches.filter(m => getMatchLocation(m) !== 'Irrum Manzil' && getMatchLocation(m) !== 'Hitech City');
    return { irrumMatches, hitechMatches, otherMatches };
  }, [completedMatches, eventsList]);

  const totalIrrumCompleted = matches.filter(m => m.status === 'Completed' && getMatchLocation(m) === 'Irrum Manzil').length;
  const totalHitechCompleted = matches.filter(m => m.status === 'Completed' && getMatchLocation(m) === 'Hitech City').length;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 to-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              <span>Official Match Scorecards</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-['Outfit'] tracking-tight text-foreground">
              Live Tournament Match Results
            </h1>
            <p className="text-sm text-muted-foreground">
              Official concluded match scores, game breakdowns, and winner declarations.
            </p>
          </div>

          {/* Location Filter Pills with Live Match Counts */}
          <div className="flex justify-center gap-2.5">
            <button
              onClick={() => setSelectedLocation('All')}
              className={cn(
                'px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2',
                selectedLocation === 'All'
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/25 font-black'
                  : 'bg-background hover:bg-muted text-foreground border shadow-xs'
              )}
            >
              <Building2 className="h-4 w-4" />
              <span>All Locations</span>
              <span className={cn('text-2xs px-2 py-0.5 rounded-full font-mono', selectedLocation === 'All' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
                {matches.filter(m => m.status === 'Completed').length}
              </span>
            </button>

            <button
              onClick={() => setSelectedLocation('Irrum Manzil')}
              className={cn(
                'px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2',
                selectedLocation === 'Irrum Manzil'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-black'
                  : 'bg-background hover:bg-muted text-foreground border shadow-xs'
              )}
            >
              <MapPin className="h-4 w-4 text-blue-500" />
              <span>Irrum Manzil Arena</span>
              <span className={cn('text-2xs px-2 py-0.5 rounded-full font-mono', selectedLocation === 'Irrum Manzil' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400')}>
                {totalIrrumCompleted}
              </span>
            </button>

            <button
              onClick={() => setSelectedLocation('Hitech City')}
              className={cn(
                'px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2',
                selectedLocation === 'Hitech City'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-400/25'
                  : 'bg-background hover:bg-muted text-foreground border shadow-xs'
              )}
            >
              <MapPin className="h-4 w-4 text-sky-500" />
              <span>Hitech City Arena</span>
              <span className={cn('text-2xs px-2 py-0.5 rounded-full font-mono', selectedLocation === 'Hitech City' ? 'bg-black/20 text-black font-bold' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400')}>
                {totalHitechCompleted}
              </span>
            </button>
          </div>

          {filteredEvents.length > 0 ? (
            <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
              {/* Event Tabs */}
              <TabsList className="flex flex-wrap w-full h-auto p-1.5 bg-muted rounded-2xl mb-6 border">
                {filteredEvents.map(event => {
                  const evCompletedCount = matches.filter(m => m.eventId === event.id && m.status === 'Completed').length;
                  return (
                    <TabsTrigger
                      key={event.id}
                      value={event.id}
                      className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl gap-2"
                    >
                      <span>{event.name}</span>
                      {evCompletedCount > 0 && (
                        <Badge variant="secondary" className="text-2xs py-0 px-1.5 font-bold">
                          {evCompletedCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {filteredEvents.map(event => (
                <TabsContent key={event.id} value={event.id} className="space-y-6">
                  <Card className="border border-sky-500/20 shadow-xs rounded-2xl bg-card overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <span>{event.name}</span>
                            <Badge variant="outline" className="text-2xs border-sky-500/30 text-sky-700 dark:text-sky-300 bg-sky-500/10">
                              {event.type}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Concluded matches and score breakdown
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6">
                      {loading ? (
                        <div className="text-center py-16 text-muted-foreground">Loading results…</div>
                      ) : completedMatches.length > 0 ? (
                        <div className="space-y-6">
                          {/* If "All" is selected and we have both locations, display location-segmented headers */}
                          {selectedLocation === 'All' && (matchesByLocation.irrumMatches.length > 0 && matchesByLocation.hitechMatches.length > 0) ? (
                            <div className="space-y-8">
                              {/* Irrum Manzil Section */}
                              {matchesByLocation.irrumMatches.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 pb-2 border-b">
                                    <Badge className="bg-blue-600 text-white text-xs font-bold shadow-xs">
                                      <MapPin className="h-3 w-3 mr-1" /> Irrum Manzil Location ({matchesByLocation.irrumMatches.length})
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {matchesByLocation.irrumMatches.map(match => (
                                      <MatchResultCard key={match.id} match={match} registrations={registrations} />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Hitech City Section */}
                              {matchesByLocation.hitechMatches.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 pb-2 border-b">
                                    <Badge className="bg-sky-500 text-slate-950 text-xs font-bold shadow-xs">
                                      <MapPin className="h-3 w-3 mr-1" /> Hitech City Location ({matchesByLocation.hitechMatches.length})
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {matchesByLocation.hitechMatches.map(match => (
                                      <MatchResultCard key={match.id} match={match} registrations={registrations} />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Other Matches if any */}
                              {matchesByLocation.otherMatches.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 pb-2 border-b">
                                    <Badge variant="outline" className="text-xs font-bold">
                                      Combined / Main Arena ({matchesByLocation.otherMatches.length})
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {matchesByLocation.otherMatches.map(match => (
                                      <MatchResultCard key={match.id} match={match} registrations={registrations} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Regular Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {completedMatches.map(match => (
                                <MatchResultCard key={match.id} match={match} registrations={registrations} />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-16 space-y-2">
                          <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                          <p className="font-semibold text-sm">No results available yet for this event & location</p>
                          <p className="text-xs text-muted-foreground">Match outcomes will be published live as games finish.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Card className="p-16 text-center text-muted-foreground rounded-2xl">
              No events found for this location.
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

// Subcomponent for Match Result Card
function MatchResultCard({ match, registrations }: { match: AppMatch; registrations: AppRegistration[] }) {
  const p1 = getParticipantDisplay(match.player1Id, registrations);
  const p2 = getParticipantDisplay(match.player2Id, registrations);
  const winner = getParticipantDisplay(match.winnerId, registrations);
  const isP1Winner = match.winnerId === match.player1Id;

  return (
    <div
      className="border rounded-2xl p-5 bg-card hover:shadow-md transition-all space-y-4 border-border/80"
      data-testid={`result-${match.id}`}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">Match #{match.matchNumber || match.meta?.match_number || match.numericId}</span>
          <span>&bull;</span>
          <span className="font-semibold text-primary">{match.round}</span>
          {match.location && (
            <Badge
              variant="outline"
              className={cn(
                "text-3xs font-bold",
                match.location === 'Hyderabad'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                  : match.location === 'Bangalore'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : ''
              )}
            >
              <MapPin className="h-2.5 w-2.5 mr-0.5 inline" />
              {match.location}
            </Badge>
          )}
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-1">
        <div className={cn(
          "p-2.5 rounded-xl border text-center md:text-right transition-colors",
          isP1Winner ? "bg-emerald-500/15 border-emerald-500/40" : "bg-muted/30 border-transparent"
        )}>
          <div className="flex items-center justify-between md:justify-end gap-2">
            {isP1Winner && (
              <Badge className="bg-emerald-600 text-white text-3xs uppercase font-bold py-0">
                Winner
              </Badge>
            )}
            <p className={cn("text-xs sm:text-sm truncate", isP1Winner ? "font-bold text-emerald-800 dark:text-emerald-300" : "font-medium text-foreground")}>
              {p1.name}
            </p>
          </div>
          {p1.id && <p className="text-3xs text-muted-foreground font-mono mt-0.5">ID: {p1.id}</p>}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-0.5 rounded-full text-3xs font-black text-muted-foreground tracking-widest">
            VS
          </div>
          {match.score && (
            <div className="mt-1 text-xs font-mono font-bold text-foreground bg-primary/10 py-0.5 px-2 rounded-lg inline-block">
              {match.score}
            </div>
          )}
        </div>

        <div className={cn(
          "p-2.5 rounded-xl border text-center md:text-left transition-colors",
          !isP1Winner ? "bg-emerald-500/15 border-emerald-500/40" : "bg-muted/30 border-transparent"
        )}>
          <div className="flex items-center justify-between md:justify-start gap-2">
            <p className={cn("text-xs sm:text-sm truncate", !isP1Winner ? "font-bold text-emerald-800 dark:text-emerald-300" : "font-medium text-foreground")}>
              {p2.name}
            </p>
            {!isP1Winner && (
              <Badge className="bg-emerald-600 text-white text-3xs uppercase font-bold py-0">
                Winner
              </Badge>
            )}
          </div>
          {p2.id && <p className="text-3xs text-muted-foreground font-mono mt-0.5">ID: {p2.id}</p>}
        </div>
      </div>

      <div className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Winner: {winner.display}</span>
        </div>

        {match.scheduledDate && (
          <div className="flex items-center gap-2 text-2xs">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(match.scheduledDate).toLocaleDateString()}
            </span>
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.venue}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
