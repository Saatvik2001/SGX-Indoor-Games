import { useState } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users } from 'lucide-react';
import { events, getEventById } from '@/data/events';
import { getMatchesByEvent } from '@/data/matches';
import { getEmployeeById } from '@/data/employees';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import type { MatchRound } from '@/data/matches';

export default function Fixtures() {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || '');

  const eventMatches = getMatchesByEvent(selectedEvent);
  const rounds: MatchRound[] = ["Round 1", "Round 2", "Quarter Final", "Semi Final", "Final"];

  const getRoundMatches = (round: MatchRound) => eventMatches.filter(m => m.round === round);

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Tournament Fixtures</h1>
            <p className="text-muted-foreground">
              View knockout brackets and match schedules
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          {event.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {event.type} • {event.game}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{eventMatches.length} matches</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {eventMatches.length > 0 ? (
                      <div className="overflow-x-auto">
                        <div className="flex gap-8 pb-4 min-w-max">
                          {rounds.map(round => {
                            const roundMatches = getRoundMatches(round);
                            if (roundMatches.length === 0) return null;

                            return (
                              <div key={round} className="flex-shrink-0 w-64">
                                <h3 className="font-semibold mb-4 text-center text-sm text-muted-foreground">
                                  {round}
                                </h3>
                                <div className="space-y-4">
                                  {roundMatches.map(match => {
                                    const player1 = getEmployeeById(match.player1Id);
                                    const player2 = match.player2Id ? getEmployeeById(match.player2Id) : null;
                                    const isPlayer1Winner = match.winnerId === match.player1Id;
                                    const isPlayer2Winner = match.winnerId === match.player2Id;

                                    return (
                                      <div
                                        key={match.id}
                                        className={cn(
                                          "border rounded-lg p-3 bg-card hover:shadow-md transition-shadow",
                                          match.status === "Completed" && "border-primary/30"
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
                                          <div
                                            className={cn(
                                              "flex items-center justify-between px-2 py-1.5 rounded",
                                              isPlayer1Winner && "bg-primary/10 font-semibold"
                                            )}
                                          >
                                            <span className="text-sm truncate">{player1?.name || 'TBD'}</span>
                                            {isPlayer1Winner && <Trophy className="h-3 w-3 text-primary flex-shrink-0" />}
                                          </div>
                                          <div className="text-center text-xs text-muted-foreground">vs</div>
                                          <div
                                            className={cn(
                                              "flex items-center justify-between px-2 py-1.5 rounded",
                                              isPlayer2Winner && "bg-primary/10 font-semibold"
                                            )}
                                          >
                                            <span className="text-sm truncate">{player2?.name || 'TBD'}</span>
                                            {isPlayer2Winner && <Trophy className="h-3 w-3 text-primary flex-shrink-0" />}
                                          </div>
                                        </div>

                                        {match.score && (
                                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                                            Score: {match.score}
                                          </div>
                                        )}
                                        {match.venue && (
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            {match.venue} • {match.scheduledTime}
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
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          No fixtures generated yet for this event
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
