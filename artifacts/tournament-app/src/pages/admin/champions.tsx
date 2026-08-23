import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Medal, MapPin, Building2, Crown, Sparkles } from 'lucide-react';
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

export default function AdminChampions() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [regs, setRegs] = useState<AppRegistration[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<'All' | 'Irrum Manzil' | 'Hitech City' | string>('All');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [evs, mat, r] = await Promise.all([
          fetchEvents(),
          fetchMatches(),
          fetchRegistrations()
        ]);
        if (!mounted) return;
        setEvents(evs);
        setMatches(mat);
        setRegs(r);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  const champions = useMemo(() => {
    return events.map(event => {
      const eventMatches = matches.filter(m => m.eventId === event.id);
      if (eventMatches.length === 0) return null;

      const isRoundRobin = eventMatches.length > 0 && (eventMatches[0].meta?.format === 'Round Robin' || event.format === 'Round Robin');
      let winnerId: string | null = null;
      let runnerUpId: string | null = null;
      let declaredAt = new Date().toISOString();

      if (isRoundRobin) {
        // Calculate points
        const pointsMap: Record<string, { won: number; points: number }> = {};
        eventMatches.forEach(m => {
          if (m.status === 'Completed' && m.winnerId) {
            const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
            pointsMap[m.winnerId] = pointsMap[m.winnerId] || { won: 0, points: 0 };
            pointsMap[m.winnerId].won += 1;
            pointsMap[m.winnerId].points += 2;
            if (loserId) pointsMap[loserId] = pointsMap[loserId] || { won: 0, points: 0 };
          }
        });

        const sorted = Object.entries(pointsMap).sort((a, b) => b[1].points - a[1].points);
        const allCompleted = eventMatches.every(m => m.status === 'Completed');
        if (allCompleted && sorted.length > 0) {
          winnerId = sorted[0][0];
          if (sorted.length > 1) runnerUpId = sorted[1][0];
        }
      } else {
        // Single Elimination Final Match
        const maxLevel = Math.max(...eventMatches.map(m => m.roundLevel));
        const finalMatch = eventMatches.find(m => m.roundLevel === maxLevel && m.status === 'Completed' && m.winnerId);
        if (finalMatch && finalMatch.winnerId) {
          winnerId = finalMatch.winnerId;
          runnerUpId = (finalMatch.player1Id === finalMatch.winnerId ? finalMatch.player2Id : finalMatch.player1Id) ?? null;
          declaredAt = finalMatch.scheduledDate || declaredAt;
        }
      }

      if (!winnerId) return null;

      const winnerDisplay = getParticipantDisplay(winnerId, regs);
      const runnerDisplay = runnerUpId ? getParticipantDisplay(runnerUpId, regs) : null;
      const location = getEventLocation(event);

      return {
        eventId: event.id,
        eventName: event.name,
        sport: event.game || 'Indoor Games',
        location,
        champion: winnerDisplay,
        runnerUp: runnerDisplay,
        declaredAt
      };
    }).filter(Boolean) as Array<{
      eventId: string;
      eventName: string;
      sport: string;
      location: string;
      champion: ReturnType<typeof getParticipantDisplay>;
      runnerUp: ReturnType<typeof getParticipantDisplay> | null;
      declaredAt: string;
    }>;
  }, [events, matches, regs]);

  const filteredChampions = useMemo(() => {
    if (selectedLocation === 'All') return champions;
    return champions.filter(c => c.location === selectedLocation || c.location === 'All Locations');
  }, [champions, selectedLocation]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-['Outfit'] tracking-tight">Champions & Awards Management</h1>
            <p className="text-sm text-muted-foreground">
              Official list of tournament winners and runners-up across Irrum Manzil & Hitech City
            </p>
          </div>

          {/* Location Filter Pills */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            {['All', 'Irrum Manzil', 'Hitech City'].map(loc => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                  selectedLocation === loc
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {loc === 'All' ? 'All Locations' : loc}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading champions data…</div>
        ) : filteredChampions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChampions.map(champion => (
              <Card key={champion.eventId} className="hover:shadow-lg transition-all border rounded-2xl overflow-hidden bg-card">
                <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
                <CardHeader className="pb-3 bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex gap-1.5 mb-1.5">
                        <Badge variant="outline" className="text-3xs uppercase font-bold">
                          {champion.sport}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-3xs font-bold",
                            champion.location === 'Irrum Manzil' || champion.location === 'Hyderabad'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : champion.location === 'Hitech City' || champion.location === 'Bangalore'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : ''
                          )}
                        >
                          <MapPin className="h-2.5 w-2.5 mr-0.5 inline" />
                          {champion.location}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold font-['Outfit']">
                        {champion.eventName}
                      </CardTitle>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      <Trophy className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Gold Champion */}
                  <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-3xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          GOLD &bull; CHAMPION
                        </span>
                      </div>
                      <span className="text-lg">🥇</span>
                    </div>
                    <p className="font-black text-lg text-foreground">{champion.champion.name}</p>
                    {champion.champion.id && (
                      <p className="text-2xs font-mono text-muted-foreground">ID: {champion.champion.id}</p>
                    )}
                  </div>

                  {/* Silver Runner-Up */}
                  {champion.runnerUp && champion.runnerUp.hasPlayer && (
                    <div className="p-3.5 bg-muted/60 border rounded-xl space-y-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Medal className="h-4 w-4 text-muted-foreground" />
                          <span className="text-3xs font-bold uppercase tracking-wider text-muted-foreground">
                            SILVER &bull; RUNNER-UP
                          </span>
                        </div>
                        <span className="text-base">🥈</span>
                      </div>
                      <p className="font-bold text-sm text-foreground">{champion.runnerUp.name}</p>
                      {champion.runnerUp.id && (
                        <p className="text-3xs font-mono text-muted-foreground">ID: {champion.runnerUp.id}</p>
                      )}
                    </div>
                  )}

                  <div className="text-3xs text-muted-foreground pt-2 border-t font-mono flex items-center justify-between">
                    <span>Certified & Concluded</span>
                    <span>{new Date(champion.declaredAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-16 text-center text-muted-foreground rounded-2xl">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">No Champions Declared for this Location</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Champions will be honored here automatically once finals and tournament matches are concluded.
            </p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
