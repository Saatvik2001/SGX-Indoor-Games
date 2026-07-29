import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClipboardCheck, Trophy } from 'lucide-react';
import { matches, updateMatch } from '@/data/matches';
import { getEmployeeById } from '@/data/employees';
import { getEventById } from '@/data/events';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';

export default function AdminResults() {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [winner, setWinner] = useState('');
  const [score, setScore] = useState('');

  const completableMatches = matches.filter(
    m => m.status === "Scheduled" && m.player2Id
  );

  const handleSubmitResult = () => {
    if (selectedMatch && winner) {
      updateMatch(selectedMatch, {
        winnerId: winner,
        score,
        status: "Completed"
      });
      toast({
        title: "Result Recorded",
        description: "Match result has been successfully recorded."
      });
      setSelectedMatch(null);
      setWinner('');
      setScore('');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results Entry</h1>
          <p className="text-muted-foreground">
            Record match results and declare winners
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Scheduled Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completableMatches.map(match => {
                const player1 = getEmployeeById(match.player1Id);
                const player2 = match.player2Id ? getEmployeeById(match.player2Id) : null;
                const event = getEventById(match.eventId);

                return (
                  <div
                    key={match.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    data-testid={`match-${match.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={match.status} />
                          <span className="font-semibold text-sm">{match.round}</span>
                          <span className="text-sm text-muted-foreground">• {event?.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{player1?.name}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium">{player2?.name}</span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {new Date(match.scheduledDate!).toLocaleDateString()} • {match.scheduledTime} • {match.venue}
                        </div>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMatch(match.id);
                              setWinner('');
                              setScore('');
                            }}
                            data-testid={`button-enter-result-${match.id}`}
                          >
                            Enter Result
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Enter Match Result</DialogTitle>
                            <DialogDescription>
                              Select the winner and enter the score
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="p-4 bg-muted rounded-lg space-y-1">
                              <p className="text-sm font-medium">{event?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {player1?.name} vs {player2?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{match.round}</p>
                            </div>

                            <div className="space-y-2">
                              <Label>Select Winner</Label>
                              <RadioGroup value={winner} onValueChange={setWinner}>
                                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value={match.player1Id} id={`player1-${match.id}`} />
                                  <Label htmlFor={`player1-${match.id}`} className="cursor-pointer flex-1">
                                    {player1?.name}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value={match.player2Id!} id={`player2-${match.id}`} />
                                  <Label htmlFor={`player2-${match.id}`} className="cursor-pointer flex-1">
                                    {player2?.name}
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="score">Score (Optional)</Label>
                              <Input
                                id="score"
                                placeholder="e.g., 21-18, 21-15"
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                data-testid="input-score"
                              />
                            </div>

                            <Button
                              onClick={handleSubmitResult}
                              className="w-full"
                              disabled={!winner}
                              data-testid="button-submit-result"
                            >
                              Submit Result
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}

              {completableMatches.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No scheduled matches available for result entry
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matches
                .filter(m => m.status === "Completed")
                .slice(-5)
                .reverse()
                .map(match => {
                  const winner = match.winnerId ? getEmployeeById(match.winnerId) : null;
                  const event = getEventById(match.eventId);
                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{winner?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {event?.name} • {match.round}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={match.status} />
                        {match.score && (
                          <p className="text-xs text-muted-foreground mt-1">{match.score}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
