import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClipboardCheck, Trophy } from 'lucide-react';
import { getEventById } from '@/data/events';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import type { Registration } from '@/data/registrations';

export default function AdminResults() {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [winner, setWinner] = useState('');
  const [score, setScore] = useState('');
  const [matchState, setMatchState] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchMatches = async () => {
      try {
        const [matchesRes, regsRes] = await Promise.all([
          fetch('/api/matches'),
          fetch('/api/registrations')
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
          setMatchState(mapped);
        }
        if (regsRes.ok) {
          const rows = await regsRes.json();
          setRegistrations(rows.map((r: any) => ({
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
          })));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchMatches();
  }, []);

  const completableMatches = matchState.filter(
    m => m.status === "Scheduled" && m.player2Id && m.scheduledDate
  );

  const handleSubmitResult = async () => {
    if (!selectedMatch || !winner) return;

    const numericId = selectedMatch.replace(/^M/, '');
    try {
      const res = await fetch(`/api/matches/${numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_id: winner, score, status: 'Completed' })
      });

      if (!res.ok) {
        toast({
          title: 'Could not save result',
          description: 'Server returned an error while saving the match result.'
        });
        return;
      }

      setMatchState(prev => prev.map(m => m.id === selectedMatch ? { ...m, winnerId: winner, score, status: 'Completed' } : m));
      toast({
        title: 'Result Recorded',
        description: 'Match result has been successfully recorded.'
      });
      setSelectedMatch(null);
      setWinner('');
      setScore('');
    } catch (e) {
      toast({
        title: 'Could not save result',
        description: 'Network error while saving the match result.'
      });
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
                const player1 = registrations.find(r => r.employeeId === match.player1Id);
                const player2 = match.player2Id ? registrations.find(r => r.employeeId === match.player2Id) : null;
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
                          <span className="font-medium">{player1 ? `${player1.employeeName} (${player1.providedEmployeeId || player1.employeeId})` : 'TBD'}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium">{player2 ? `${player2.employeeName} (${player2.providedEmployeeId || player2.employeeId})` : 'TBD'}</span>
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
                                {player1 ? `${player1.employeeName} (${player1.providedEmployeeId || player1.employeeId})` : 'TBD'} vs {player2 ? `${player2.employeeName} (${player2.providedEmployeeId || player2.employeeId})` : 'TBD'}
                              </p>
                              <p className="text-xs text-muted-foreground">{match.round}</p>
                            </div>

                            <div className="space-y-2">
                              <Label>Select Winner</Label>
                              <RadioGroup value={winner} onValueChange={setWinner}>
                                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value={match.player1Id} id={`player1-${match.id}`} />
                                  <Label htmlFor={`player1-${match.id}`} className="cursor-pointer flex-1">
                                    {player1 ? `${player1.employeeName} (${player1.providedEmployeeId || player1.employeeId})` : 'TBD'}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value={match.player2Id!} id={`player2-${match.id}`} />
                                  <Label htmlFor={`player2-${match.id}`} className="cursor-pointer flex-1">
                                    {player2 ? `${player2.employeeName} (${player2.providedEmployeeId || player2.employeeId})` : 'TBD'}
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
              {matchState
                .filter(m => m.status === "Completed")
                .slice(-5)
                .reverse()
                .map(match => {
                  const winner = match.winnerId ? registrations.find(r => r.employeeId === match.winnerId) : null;
                  const event = getEventById(match.eventId);
                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{winner ? `${winner.employeeName} (${winner.providedEmployeeId || winner.employeeId})` : 'TBD'}</p>
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
