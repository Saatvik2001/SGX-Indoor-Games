import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, Edit, CheckCircle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import {
  fetchEvents,
  fetchRegistrations,
  fetchMatches,
  getParticipantDisplay,
  saveMatchSchedule,
  type AppEvent,
  type AppRegistration,
  type AppMatch
} from '@/lib/api';

export default function Schedule() {
  const { toast } = useToast();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [registrations, setRegistrations] = useState<AppRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog State
  const [activeMatch, setActiveMatch] = useState<AppMatch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [venue, setVenue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evs, regs, mat] = await Promise.all([
        fetchEvents(),
        fetchRegistrations(),
        fetchMatches()
      ]);
      setEvents(evs);
      setRegistrations(regs);
      setMatches(mat);
    } catch {
      toast({ title: 'Error', description: 'Failed to load scheduling data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openScheduleDialog = (match: AppMatch) => {
    setActiveMatch(match);
    let dateStr = '';
    if (match.scheduledDate) {
      try {
        dateStr = new Date(match.scheduledDate).toISOString().slice(0, 10);
      } catch {}
    }
    setScheduleDate(dateStr);
    setScheduleTime(match.scheduledTime || '');
    setVenue(match.venue || '');
    setIsDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!activeMatch) return;
    if (!scheduleDate || !scheduleTime || !venue.trim()) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in Match Date, Time, and Venue/Court.'
      });
      return;
    }

    setSaving(true);
    try {
      const ok = await saveMatchSchedule(activeMatch.numericId, scheduleDate, scheduleTime, venue.trim());
      if (!ok) {
        toast({ title: 'Error', description: 'Failed to save schedule to database.' });
        return;
      }

      toast({
        title: 'Match Scheduled! 📅',
        description: `Successfully scheduled for ${scheduleDate} at ${scheduleTime} in ${venue}.`
      });

      setIsDialogOpen(false);
      setActiveMatch(null);
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Network error saving schedule.' });
    } finally {
      setSaving(false);
    }
  };

  const activeMatches = matches.filter(
    m => m.status === 'Pending' || m.status === 'Scheduled'
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Match Scheduling</h1>
          <p className="text-muted-foreground">Manually set match dates, times, and venues for upcoming matches</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Matches for Scheduling</CardTitle>
              <span className="text-sm text-muted-foreground">{activeMatches.length} Pending / Scheduled</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading matches…</div>
            ) : (
              <div className="space-y-4">
                {activeMatches.map(match => {
                  const p1 = getParticipantDisplay(match.player1Id, registrations);
                  const p2 = getParticipantDisplay(match.player2Id, registrations);
                  const event = events.find(e => e.id === match.eventId);
                  const isScheduled = match.status === 'Scheduled' && match.scheduledDate;

                  return (
                    <div
                      key={match.id}
                      className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow space-y-3"
                      data-testid={`match-${match.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={match.status} />
                            <span className="font-bold text-sm text-foreground">
                              Match #{match.numericId} • {match.round}
                            </span>
                            {event && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">
                                {event.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm font-semibold pt-1">
                            <span className={p1.hasPlayer ? 'text-foreground' : 'text-muted-foreground'}>
                              {p1.display}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">vs</span>
                            <span className={p2.hasPlayer ? 'text-foreground' : 'text-muted-foreground'}>
                              {p2.display}
                            </span>
                          </div>

                          {isScheduled && (
                            <div className="flex flex-wrap gap-4 text-xs font-medium text-primary pt-1 bg-primary/5 p-2 rounded-lg border border-primary/20">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{new Date(match.scheduledDate!).toLocaleDateString()}</span>
                              </div>
                              {match.scheduledTime && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{match.scheduledTime}</span>
                                </div>
                              )}
                              {match.venue && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{match.venue}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <Button
                            variant={isScheduled ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => openScheduleDialog(match)}
                            data-testid={`button-schedule-${match.id}`}
                            className="gap-1.5"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            {isScheduled ? 'Edit Schedule' : 'Schedule Match'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeMatches.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground space-y-2">
                    <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40" />
                    <p className="font-medium">No matches currently available for scheduling</p>
                    <p className="text-xs">Generate fixtures first from the Fixtures tab.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controlled Schedule Modal */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {activeMatch?.scheduledDate ? 'Edit Match Schedule' : 'Schedule Match'}
              </DialogTitle>
              <DialogDescription>
                {activeMatch && (
                  <span>
                    Match #{activeMatch.numericId} ({activeMatch.round})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {activeMatch && (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-foreground">
                    {getParticipantDisplay(activeMatch.player1Id, registrations).display}
                  </div>
                  <div className="text-muted-foreground">vs</div>
                  <div className="font-semibold text-foreground">
                    {getParticipantDisplay(activeMatch.player2Id, registrations).display}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-date" className="text-xs font-semibold">Match Date</Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    data-testid="input-schedule-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-time" className="text-xs font-semibold">Match Time</Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    data-testid="input-schedule-time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-venue" className="text-xs font-semibold">Venue / Court</Label>
                  <Input
                    id="schedule-venue"
                    placeholder="e.g., Court 1, Main Table, Indoor Hall"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    data-testid="input-venue"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    onClick={handleSaveSchedule}
                    className="flex-1"
                    disabled={saving || !scheduleDate || !scheduleTime || !venue.trim()}
                    data-testid="button-save-schedule"
                  >
                    {saving ? 'Saving to Database…' : 'Save Schedule'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
