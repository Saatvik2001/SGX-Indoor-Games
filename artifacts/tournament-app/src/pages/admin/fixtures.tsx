import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Shuffle } from 'lucide-react';
import { events } from '@/data/events';
import { getMatchesByEvent } from '@/data/matches';
import { getEmployeeById } from '@/data/employees';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MatchRound } from '@/data/matches';

export default function AdminFixtures() {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || '');
  const { toast } = useToast();

  const eventMatches = getMatchesByEvent(selectedEvent);
  const rounds: MatchRound[] = ["Round 1", "Round 2", "Quarter Final", "Semi Final", "Final"];

  const getRoundMatches = (round: MatchRound) => eventMatches.filter(m => m.round === round);

  const handleGenerateFixtures = () => {
    toast({
      title: "Fixtures Generated",
      description: "Match fixtures have been successfully generated for this event."
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fixtures Management</h1>
            <p className="text-muted-foreground">
              Generate and manage tournament brackets
            </p>
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
                    <span className="text-sm text-muted-foreground">
                      {eventMatches.length} matches
                    </span>
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
                                        "border rounded-lg p-3 bg-card hover:shadow-md transition-shadow cursor-pointer",
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
                      <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No fixtures generated yet for this event
                      </p>
                      <Button onClick={handleGenerateFixtures} data-testid="button-generate-for-event">
                        Generate Fixtures Now
                      </Button>
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
