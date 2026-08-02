import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar } from 'lucide-react';
import { events } from '@/data/events';
import { StatusBadge } from '@/components/StatusBadge';
import type { Registration } from '@/data/registrations';

export default function Results() {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || '');
  const [locationFilter, setLocationFilter] = useState<'Hyderabad' | 'Bangalore'>('Hyderabad');
  const [refreshKey, setRefreshKey] = useState(0);
  const [serverMatches, setServerMatches] = useState<any[]>([]);
  const [serverRegs, setServerRegs] = useState<Registration[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [matchesRes, regsRes] = await Promise.all([
          fetch('/api/matches'),
          fetch(`/api/registrations${selectedEvent ? `?eventId=${selectedEvent}` : ''}`)
        ]);
        if (!mounted) return;
        if (matchesRes.ok) {
          const rows = await matchesRes.json();
          const mapped = rows.map((r: any) => ({
            id: `M${r.id}`,
            eventId: r.event_id,
            round: r.round,
            player1Id: r.player1_id,
            player2Id: r.player2_id || undefined,
            status: r.status,
            scheduledDate: r.scheduled_date || undefined,
            scheduledTime: r.meta?.scheduled_time || undefined,
            venue: r.meta?.venue || undefined,
            winnerId: r.winner_id || undefined,
            score: r.meta?.score || undefined,
            isBye: false
          }));
          setServerMatches(mapped);
        }
        if (regsRes.ok) {
          const rows = await regsRes.json();
          const mappedRegs = rows.map((r: any) => ({
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
          setServerRegs(mappedRegs);
        }
      } catch (err) {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedEvent, refreshKey]);

  const allEventMatches = serverMatches.filter(m => m.eventId === selectedEvent);
  const locationEmployeeIds = new Set(
    serverRegs.filter(r => r.eventId === selectedEvent && r.location === locationFilter).map(r => r.employeeId)
  );

  // Only completed matches involving participants from the selected location
  const completedMatches = allEventMatches.filter(
    m => m.status === 'Completed' && (locationEmployeeIds.has(m.player1Id) || (m.player2Id ? locationEmployeeIds.has(m.player2Id) : false))
  );

  // Listen for fixture updates from other tabs (storage event)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'fixtures:update' || e.key === 'registrations:update') setRefreshKey(k => k + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Match Results</h1>
            <p className="text-muted-foreground">
              View completed match results and scores
            </p>
          </div>

          <div className="flex justify-center mb-4 gap-2">
            <button
              className={`px-3 py-1 rounded ${locationFilter === 'Hyderabad' ? 'bg-primary text-white' : 'bg-muted'}`}
              onClick={() => setLocationFilter('Hyderabad')}
            >
              Hyderabad
            </button>
            <button
              className={`px-3 py-1 rounded ${locationFilter === 'Bangalore' ? 'bg-primary text-white' : 'bg-muted'}`}
              onClick={() => setLocationFilter('Bangalore')}
            >
              Bangalore
            </button>
          </div>

          <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-8">
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
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      {event.name} - Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {completedMatches.length > 0 ? (
                      <div className="space-y-4">
                        {completedMatches.map((match) => {
                          const participantLeft = serverRegs.find(r => r.employeeId === match.player1Id)?.employeeName || 'Participant 1';
                          const participantRight = match.player2Id ? (serverRegs.find(r => r.employeeId === match.player2Id)?.employeeName || 'Participant 2') : 'TBD';
                          const winnerLabel = match.winnerId ? (match.winnerId === match.player1Id ? participantLeft : participantRight) : 'TBD';

                          return (
                            <div
                              key={match.id}
                              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                              data-testid={`result-${match.id}`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <StatusBadge status={match.status} />
                                  <span className="font-semibold text-sm">{match.round}</span>
                                </div>
                                {match.scheduledDate && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(match.scheduledDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="text-center md:text-right">
                                  <p className={`font-medium ${match.winnerId === match.player1Id ? 'text-primary text-lg' : ''}`}>
                                    {participantLeft}
                                  </p>
                                </div>

                                <div className="text-center">
                                  <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
                                    <Trophy className="h-4 w-4 text-primary" />
                                    <span className="font-semibold">VS</span>
                                  </div>
                                </div>

                                <div className="text-center md:text-left">
                                  <p className={`font-medium ${match.winnerId === match.player2Id ? 'text-primary text-lg' : ''}`}>
                                    {participantRight}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Winner:</span>
                                  <span className="font-semibold text-primary">{winnerLabel}</span>
                                </div>
                                {match.score && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Score:</span>
                                    <span className="font-mono">{match.score}</span>
                                  </div>
                                )}
                                {match.venue && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Venue:</span>
                                    <span>{match.venue} • {match.scheduledTime}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          No results available yet for this event
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </PublicLayout>
  );
}
