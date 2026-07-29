import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, Edit } from 'lucide-react';
import { matches, updateMatch } from '@/data/matches';
import { getEmployeeById } from '@/data/employees';
import { getEventById } from '@/data/events';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';

export default function Schedule() {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [venue, setVenue] = useState('');

  const pendingAndScheduledMatches = matches.filter(
    m => m.status === "Pending" || m.status === "Scheduled"
  );

  const handleSchedule = () => {
    if (selectedMatch && scheduleDate && scheduleTime && venue) {
      updateMatch(selectedMatch, {
        scheduledDate: scheduleDate,
        scheduledTime: scheduleTime,
        venue,
        status: "Scheduled"
      });
      toast({
        title: "Match Scheduled",
        description: "Match has been successfully scheduled."
      });
      setSelectedMatch(null);
      setScheduleDate('');
      setScheduleTime('');
      setVenue('');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Match Scheduling</h1>
          <p className="text-muted-foreground">
            Schedule match dates, times, and venues
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending & Scheduled Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingAndScheduledMatches.map(match => {
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
                          <span className="font-medium">{player2?.name || 'TBD'}</span>
                        </div>

                        {match.scheduledDate && (
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(match.scheduledDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{match.scheduledTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{match.venue}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMatch(match.id);
                              setScheduleDate(match.scheduledDate || '');
                              setScheduleTime(match.scheduledTime || '');
                              setVenue(match.venue || '');
                            }}
                            data-testid={`button-schedule-${match.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {match.status === "Scheduled" ? "Edit" : "Schedule"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Schedule Match</DialogTitle>
                            <DialogDescription>
                              Set the date, time, and venue for this match
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="date">Date</Label>
                              <Input
                                id="date"
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                data-testid="input-schedule-date"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="time">Time</Label>
                              <Input
                                id="time"
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                data-testid="input-schedule-time"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="venue">Venue</Label>
                              <Input
                                id="venue"
                                placeholder="e.g., Court A"
                                value={venue}
                                onChange={(e) => setVenue(e.target.value)}
                                data-testid="input-venue"
                              />
                            </div>
                            <Button
                              onClick={handleSchedule}
                              className="w-full"
                              data-testid="button-save-schedule"
                            >
                              Save Schedule
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}

              {pendingAndScheduledMatches.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No matches available for scheduling
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
