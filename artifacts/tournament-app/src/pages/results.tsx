import { useState } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar } from 'lucide-react';
import { events } from '@/data/events';
import { getMatchesByEvent } from '@/data/matches';
import { getEmployeeById } from '@/data/employees';
import { StatusBadge } from '@/components/StatusBadge';

export default function Results() {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || '');

  const eventMatches = getMatchesByEvent(selectedEvent);
  const completedMatches = eventMatches.filter(m => m.status === "Completed");

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
                        {completedMatches.map(match => {
                          const player1 = getEmployeeById(match.player1Id);
                          const player2 = match.player2Id ? getEmployeeById(match.player2Id) : null;
                          const winner = match.winnerId ? getEmployeeById(match.winnerId) : null;

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
                                    {player1?.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{player1?.department}</p>
                                </div>

                                <div className="text-center">
                                  <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
                                    <Trophy className="h-4 w-4 text-primary" />
                                    <span className="font-semibold">VS</span>
                                  </div>
                                </div>

                                <div className="text-center md:text-left">
                                  <p className={`font-medium ${match.winnerId === match.player2Id ? 'text-primary text-lg' : ''}`}>
                                    {player2?.name || 'TBD'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{player2?.department}</p>
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Winner:</span>
                                  <span className="font-semibold text-primary">{winner?.name}</span>
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
