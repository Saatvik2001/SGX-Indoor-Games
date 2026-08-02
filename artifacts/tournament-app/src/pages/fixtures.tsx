import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users } from 'lucide-react';
import { events } from '@/data/events';
import { StatusBadge } from '@/components/StatusBadge';
import type { Registration } from '@/data/registrations';

export default function Fixtures() {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || '');
  const [locationFilter, setLocationFilter] = useState<'Hyderabad' | 'Bangalore'>('Hyderabad');
  const [refreshKey, setRefreshKey] = useState(0);
  const [matchesState, setMatchesState] = useState<any[]>([]);
  const [regsState, setRegsState] = useState<Registration[]>([]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'fixtures:update' || e.key === 'registrations:update') setRefreshKey(k => k + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
            meta: r.meta || {},
            isBye: false
          }));
          setMatchesState(mapped);
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
          setRegsState(mappedRegs);
        }
      } catch (err) {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedEvent, refreshKey]);

  const matches = matchesState.filter(m => m.eventId === selectedEvent);
  const regs = regsState.filter(r => r.eventId === selectedEvent);
  const participantIds = new Set(regs.filter(r => r.location === locationFilter).map(r => r.employeeId));
  const visibleMatches = matches.filter(
    m => participantIds.has(m.player1Id) || (m.player2Id ? participantIds.has(m.player2Id) : false)
  );

  const hasFixtures = visibleMatches.length > 0;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Tournament Fixtures</h1>
            <p className="text-muted-foreground">View knockout brackets and match schedules</p>
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
                <TabsTrigger key={event.id} value={event.id}>
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
                      {event.name} - Fixtures
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasFixtures ? (
                      <div className="space-y-4">
                        {visibleMatches.map(match => {
                          const p1 = regs.find(r => r.employeeId === match.player1Id);
                          const p2 = match.player2Id ? regs.find(r => r.employeeId === match.player2Id) : null;
                          const p1Name = p1?.employeeName || match.meta?.player1_name || 'Participant';
                          const p2Name = p2?.employeeName || match.meta?.player2_name || 'Participant';
                          const p1IdText = p1 ? ` (${p1.providedEmployeeId || p1.employeeId})` : '';
                          const p2IdText = p2 ? ` (${p2.providedEmployeeId || p2.employeeId})` : '';
                          return (
                            <div key={match.id} className="p-4 bg-muted rounded-md">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm text-muted-foreground">{match.round}</div>
                                  <div className="font-medium">{p1Name + p1IdText}{p2 ? ` vs ${p2Name + p2IdText}` : ' (bye)'}</div>
                                  {match.scheduledDate && (
                                    <div className="text-xs text-muted-foreground">{match.scheduledDate} {match.scheduledTime}</div>
                                  )}
                                </div>
                                <StatusBadge status={match.status} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border p-6 text-center text-muted-foreground">
                        Fixtures will appear here after the admin generates them for the selected location.
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
