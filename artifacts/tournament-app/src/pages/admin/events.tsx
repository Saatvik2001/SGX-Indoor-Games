import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Gamepad2, Plus, Trophy, Users } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { events } from '@/data/events';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function Events() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [eventList, setEventList] = useState([...events]);
  const [regs, setRegs] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Singles'|'Doubles'>('Singles');
  const [newGame, setNewGame] = useState<'Table Tennis'|'Carrom'|'Chess'>('Table Tennis');
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
  const tournamentIdParam = query.get('tournament') || 'T001';

  useEffect(() => {
    let mounted = true;
    const loadRegistrations = async () => {
      try {
        const res = await fetch('/api/registrations');
        if (!mounted) return;
        if (res.ok) {
          const rows = await res.json();
          setRegs(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (mounted) setRegs([]);
      }
    };

    loadRegistrations();
    return () => { mounted = false; };
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">
              Manage tournament events and categories
            </p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-event">
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Event Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div>
                  <Label>Type</Label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value as any)} className="w-full p-2 border rounded">
                    <option value="Singles">Singles</option>
                    <option value="Doubles">Doubles</option>
                  </select>
                </div>
                <div>
                  <Label>Game</Label>
                  <select value={newGame} onChange={(e) => setNewGame(e.target.value as any)} className="w-full p-2 border rounded">
                    <option value="Table Tennis">Table Tennis</option>
                    <option value="Carrom">Carrom</option>
                    <option value="Chess">Chess</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={async () => {
                    // Post to API; fallback to local push
                    const id = `E${String(events.length + 1).padStart(3, '0')}`;
                    const payload = { id, tournamentId: tournamentIdParam, name: newName, type: newType, game: newGame };
                    try {
                      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                      if (res.ok) {
                        events.push(payload);
                        setEventList(prev => [...prev, payload]);
                        setShowCreate(false);
                        setNewName('');
                      } else {
                        events.push(payload);
                        setEventList(prev => [...prev, payload]);
                        setShowCreate(false);
                      }
                    } catch (e) {
                      events.push(payload);
                      setEventList(prev => [...prev, payload]);
                      setShowCreate(false);
                    }
                  }}>Create</Button>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventList.map(event => {
            const eventRegs = regs.filter((r: any) => r.event_id === event.id);
            return (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Gamepad2 className="h-8 w-8 text-primary" />
                    <div className="flex gap-2">
                      <Badge variant="outline">{event.type}</Badge>
                      <Badge variant="secondary">{event.game}</Badge>
                    </div>
                  </div>
                  <CardTitle className="mt-4">{event.name}</CardTitle>
                  <CardDescription>Tournament ID: {event.tournamentId}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Registrations</span>
                    </div>
                    <span className="font-bold text-lg text-primary">{eventRegs.length}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-registrations-${event.id}`} onClick={() => navigate(`/admin/registrations?event=${event.id}`)}>
                      View Registrations
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-manage-fixtures-${event.id}`} onClick={() => navigate(`/admin/fixtures?event=${event.id}`)}>
                      Manage Fixtures
                    </Button>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-${event.id}`} onClick={async () => {
                      const name = window.prompt('Edit event name:', event.name);
                      if (name === null) return;
                      try {
                        const res = await fetch(`/api/events/${event.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type: event.type, game: event.game }) });
                        if (res.ok) {
                          const idx = events.findIndex(e => e.id === event.id);
                          if (idx !== -1) events[idx] = { ...events[idx], name } as any;
                          setEventList(prev => prev.map(e => e.id === event.id ? { ...e, name } : e));
                          toast({ title: 'Event updated' });
                        } else {
                          toast({ title: 'Update failed', description: 'Server error' });
                        }
                      } catch (e) {
                        toast({ title: 'Update failed', description: 'Network error' });
                      }
                    }}>
                      Edit Event
                    </Button>
                     <Button variant="outline" size="sm" className="w-full" data-testid={`button-delete-event-${event.id}`} onClick={async () => {
                       if (!window.confirm('Delete this event?')) return;
                       try {
                         const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
                         if (res.ok) {
                           const idx = events.findIndex(e => e.id === event.id);
                           if (idx !== -1) events.splice(idx, 1);
                           setEventList(prev => prev.filter(e => e.id !== event.id));
                           toast({ title: 'Event deleted' });
                         } else {
                           toast({ title: 'Delete failed', description: 'Server error' });
                         }
                       } catch (e) {
                         toast({ title: 'Delete failed', description: 'Network error' });
                       }
                     }}>
                       Delete Event
                     </Button>
                   </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
