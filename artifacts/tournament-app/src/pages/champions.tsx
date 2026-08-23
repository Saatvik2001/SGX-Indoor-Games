import { useEffect, useState, useMemo } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Award,
  Sparkles,
  Crown,
  Medal,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  Building2,
  Star
} from 'lucide-react';
import {
  fetchEvents,
  fetchMatches,
  fetchRegistrations,
  getParticipantDisplay,
  type AppEvent,
  type AppMatch,
  type AppRegistration
} from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Champions() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [registrations, setRegistrations] = useState<AppRegistration[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<'All' | 'Irrum Manzil' | 'Hitech City' | string>('All');
  const [selectedSport, setSelectedSport] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [evList, matchList, regList] = await Promise.all([
          fetchEvents(),
          fetchMatches(),
          fetchRegistrations()
        ]);
        if (!mounted) return;
        setEvents(evList);
        setMatches(matchList);
        setRegistrations(regList);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Helper to extract location for an event
  const getEventLocation = (ev: AppEvent) => {
    if (ev.meta?.location) {
      const l = String(ev.meta.location);
      if (l === 'Hyderabad') return 'Irrum Manzil';
      if (l === 'Bangalore') return 'Hitech City';
      return l;
    }
    if (ev.name.includes('Hitech City') || ev.name.includes('Bangalore')) return 'Hitech City';
    if (ev.name.includes('Irrum Manzil') || ev.name.includes('Hyderabad')) return 'Irrum Manzil';
    return 'All Locations';
  };

  // Compute Champions per event
  const eventChampions = useMemo(() => {
    return events.map(ev => {
      const evMatches = matches.filter(m => m.eventId === ev.id);
      const isRoundRobin = evMatches.length > 0 && (evMatches[0].meta?.format === 'Round Robin' || ev.format === 'Round Robin');

      const location = getEventLocation(ev);
      const isConcluded = evMatches.length > 0 && evMatches.every(m => m.status === 'Completed');

      let winner: { id: string; name: string; score?: string; hasPlayer: boolean } | null = null;
      let runnerUp: { id: string; name: string; score?: string; hasPlayer: boolean } | null = null;

      if (isRoundRobin) {
        // Compute League Table
        const standingsMap: Record<string, { id: string; p: number; w: number; l: number; pts: number }> = {};
        evMatches.forEach(m => {
          if (m.player1Id) standingsMap[m.player1Id] = standingsMap[m.player1Id] || { id: m.player1Id, p: 0, w: 0, l: 0, pts: 0 };
          if (m.player2Id) standingsMap[m.player2Id] = standingsMap[m.player2Id] || { id: m.player2Id, p: 0, w: 0, l: 0, pts: 0 };
          if (m.status === 'Completed' && m.winnerId) {
            if (m.player1Id && standingsMap[m.player1Id]) standingsMap[m.player1Id].p++;
            if (m.player2Id && standingsMap[m.player2Id]) standingsMap[m.player2Id].p++;
            if (standingsMap[m.winnerId]) {
              standingsMap[m.winnerId].w++;
              standingsMap[m.winnerId].pts += 2;
            }
            const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
            if (loserId && standingsMap[loserId]) {
              standingsMap[loserId].l++;
            }
          }
        });

        const sorted = Object.values(standingsMap).sort((a, b) => b.pts - a.pts || b.w - a.w);
        if (sorted.length > 0) {
          const wP = getParticipantDisplay(sorted[0].id, registrations);
          winner = { id: sorted[0].id, name: wP.name, score: `${sorted[0].pts} Pts (${sorted[0].w}W-${sorted[0].l}L)`, hasPlayer: true };
        }
        if (sorted.length > 1) {
          const rP = getParticipantDisplay(sorted[1].id, registrations);
          runnerUp = { id: sorted[1].id, name: rP.name, score: `${sorted[1].pts} Pts (${sorted[1].w}W-${sorted[1].l}L)`, hasPlayer: true };
        }
      } else {
        // Knockout Bracket: find the Final match
        const finalMatch = evMatches
          .filter(m => m.round === 'Final' || m.roundLevel === 1)
          .sort((a, b) => (b.roundLevel ?? 0) - (a.roundLevel ?? 0))[0] ||
          evMatches.slice().sort((a, b) => Number(b.numericId || 0) - Number(a.numericId || 0))[0];

        if (finalMatch && finalMatch.status === 'Completed' && finalMatch.winnerId) {
          const wP = getParticipantDisplay(finalMatch.winnerId, registrations);
          const rId = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
          const rP = getParticipantDisplay(rId, registrations);

          winner = {
            id: finalMatch.winnerId,
            name: wP.name,
            score: finalMatch.score || 'Champion',
            hasPlayer: true
          };
          runnerUp = {
            id: rId || '',
            name: rP.name !== 'TBD' ? rP.name : 'Finalist Runner-up',
            score: 'Runner-up',
            hasPlayer: rP.name !== 'TBD'
          };
        }
      }

      return {
        event: ev,
        location,
        format: isRoundRobin ? 'Round Robin' : 'Knockout',
        isConcluded,
        winner,
        runnerUp,
        matchesCount: evMatches.length,
        completedCount: evMatches.filter(m => m.status === 'Completed').length
      };
    });
  }, [events, matches, registrations]);

  // List of distinct sports for filter
  const sportsList = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      if (e.game) set.add(e.game);
      else if (e.name) set.add(e.name.split(' - ')[0]);
    });
    return ['All', ...Array.from(set)];
  }, [events]);

  // Filter champions
  const filteredChampions = useMemo(() => {
    return eventChampions.filter(c => {
      if (selectedLocation !== 'All' && c.location !== selectedLocation && c.location !== 'All Locations') {
        return false;
      }
      if (selectedSport !== 'All') {
        const evSport = c.event.game || c.event.name;
        if (!evSport.toLowerCase().includes(selectedSport.toLowerCase())) return false;
      }
      return true;
    });
  }, [eventChampions, selectedLocation, selectedSport]);

  const irrumChampions = useMemo(() => filteredChampions.filter(c => c.location === 'Irrum Manzil'), [filteredChampions]);
  const hitechChampions = useMemo(() => filteredChampions.filter(c => c.location === 'Hitech City'), [filteredChampions]);
  const otherChampions = useMemo(() => filteredChampions.filter(c => c.location !== 'Irrum Manzil' && c.location !== 'Hitech City'), [filteredChampions]);

  const totalIrrumDeclared = eventChampions.filter(c => c.location === 'Irrum Manzil' && c.winner && c.winner.hasPlayer).length;
  const totalHitechDeclared = eventChampions.filter(c => c.location === 'Hitech City' && c.winner && c.winner.hasPlayer).length;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-10">
          {/* Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 to-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Crown className="h-3.5 w-3.5 text-sky-500" />
              <span>Tournament Hall of Fame & Awards</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-['Outfit'] tracking-tight text-foreground">
              Champions & Award Laurels
            </h1>
            <p className="text-sm text-muted-foreground">
              Honoring tournament victors and runners-up across Irrum Manzil & Hitech City arenas
            </p>
          </div>

          {/* Location Filter Pills with Declared Champions Counter */}
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
                {eventChampions.filter(c => c.winner && c.winner.hasPlayer).length}
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
                {totalIrrumDeclared}
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
                {totalHitechDeclared}
              </span>
            </button>
          </div>

          {/* Sport Filter Chips */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {sportsList.map(sport => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  selectedSport === sport
                    ? 'bg-foreground text-background font-bold shadow-xs'
                    : 'bg-background hover:bg-muted text-muted-foreground border'
                )}
              >
                {sport}
              </button>
            ))}
          </div>

          {/* Main Podium & Champions List */}
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading podium data…</div>
          ) : filteredChampions.length === 0 ? (
            <Card className="p-16 text-center text-muted-foreground rounded-2xl">
              <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-base">No championships found for the selected filter</p>
              <p className="text-xs text-muted-foreground mt-1">Try switching locations or sports category.</p>
            </Card>
          ) : selectedLocation === 'All' && (irrumChampions.length > 0 && hitechChampions.length > 0) ? (
            /* Segmented View for All Locations */
            <div className="space-y-10">
              {/* Irrum Manzil Arena Section */}
              {irrumChampions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Badge className="bg-blue-600 text-white text-xs font-bold">
                      <MapPin className="h-3 w-3 mr-1" /> Irrum Manzil Arena Champions ({irrumChampions.length})
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {irrumChampions.map(c => (
                      <ChampionCard key={c.event.id} item={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Hitech City Arena Section */}
              {hitechChampions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Badge className="bg-emerald-600 text-white text-xs font-bold">
                      <MapPin className="h-3 w-3 mr-1" /> Hitech City Arena Champions ({hitechChampions.length})
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {hitechChampions.map(c => (
                      <ChampionCard key={c.event.id} item={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Champions if any */}
              {otherChampions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Badge variant="outline" className="text-xs font-bold">
                      Combined Champions ({otherChampions.length})
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {otherChampions.map(c => (
                      <ChampionCard key={c.event.id} item={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredChampions.map(c => (
                <ChampionCard key={c.event.id} item={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

// Subcomponent for Champion Card
function ChampionCard({ item }: { item: any }) {
  const { event, location, format, isConcluded, winner, runnerUp } = item;
  const hasWinner = Boolean(winner && winner.hasPlayer);

  return (
    <Card
      className={cn(
        'border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all',
        hasWinner
          ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-card to-card'
          : 'bg-card'
      )}
    >
      <div
        className={cn(
          'h-2',
          hasWinner
            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
            : 'bg-muted'
        )}
      />
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Badge variant="outline" className="text-3xs font-bold uppercase">
              {event.game || 'Indoor Games'} &bull; {event.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-3xs font-bold",
                location === 'Irrum Manzil' || location === 'Hyderabad'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                  : location === 'Hitech City' || location === 'Bangalore'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-primary/10 text-primary border-primary/30'
              )}
            >
              <MapPin className="h-2.5 w-2.5 mr-0.5 inline" />
              {location}
            </Badge>
          </div>
          <CardTitle className="text-xl font-bold font-['Outfit']">
            {event.name}
          </CardTitle>
          <CardDescription className="text-xs">
            Format: {format}
          </CardDescription>
        </div>

        {hasWinner ? (
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300 ring-4 ring-amber-500/10">
            <Trophy className="h-6 w-6" />
          </div>
        ) : (
          <Badge variant="secondary" className="text-2xs">
            In Progress
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {hasWinner ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🥇</span>
                <div>
                  <span className="text-2xs uppercase font-extrabold tracking-widest text-amber-800 dark:text-amber-300">
                    Gold &bull; Champion
                  </span>
                  <div className="text-lg font-black text-foreground">
                    {winner?.name}
                  </div>
                  {winner?.id && (
                    <div className="text-2xs font-mono text-muted-foreground">ID: {winner.id}</div>
                  )}
                </div>
              </div>
              <Badge className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-2xs">
                Gold
              </Badge>
            </div>

            {runnerUp && runnerUp.hasPlayer && (
              <div className="pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <div>
                    <span className="text-2xs uppercase font-bold text-muted-foreground">
                      Silver &bull; Runner-Up
                    </span>
                    <div className="font-semibold text-foreground">
                      {runnerUp.name}
                    </div>
                    {runnerUp.id && (
                      <div className="text-3xs font-mono text-muted-foreground">ID: {runnerUp.id}</div>
                    )}
                  </div>
                </div>
                <span className="text-2xs font-semibold text-muted-foreground">
                  Silver
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-muted/30 border border-dashed text-center space-y-1">
            <Crown className="h-6 w-6 text-muted-foreground/40 mx-auto" />
            <div className="text-xs font-semibold text-foreground">
              Championship Match Pending
            </div>
            <p className="text-2xs text-muted-foreground">
              Matches are currently underway to decide the victor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
