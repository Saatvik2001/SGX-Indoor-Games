import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, Calendar, MapPin, Trash } from 'lucide-react';
import { tournaments } from '@/data/tournaments';
import { StatusBadge } from '@/components/StatusBadge';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function Tournaments() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tournamentList, setTournamentList] = useState([...tournaments]);
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
            <p className="text-muted-foreground">
              Manage tournament configurations and settings
            </p>
          </div>
          <Button className="gap-2" data-testid="button-create-tournament" onClick={async () => {
            const name = window.prompt('Tournament name:');
            if (!name) return;
            const description = window.prompt('Description:', '') || '';
            const id = `T${String(tournaments.length + 1).padStart(3, '0')}`;
            const payload = {
              id,
              name,
              description,
              location: 'Hyderabad & Bangalore',
              registrationStartDate: new Date().toISOString(),
              registrationEndDate: new Date().toISOString(),
              tournamentStartDate: new Date().toISOString(),
              tournamentEndDate: new Date().toISOString(),
              status: 'Draft'
            };
            try {
              const res = await fetch('/api/tournaments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (res.ok) {
                tournaments.push(payload as any);
                setTournamentList(prev => [...prev, payload as any]);
              } else {
                tournaments.push(payload as any);
                setTournamentList(prev => [...prev, payload as any]);
              }
            } catch (e) {
              tournaments.push(payload as any);
              setTournamentList(prev => [...prev, payload as any]);
            }
          }}>
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        </div>

        <div className="grid gap-6">
          {tournamentList.map(tournament => (
            <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Trophy className="h-6 w-6 text-primary" />
                      {tournament.name}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {tournament.description}
                    </CardDescription>
                  </div>
                  <StatusBadge status={tournament.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{tournament.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Registration Period</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tournament.registrationStartDate).toLocaleDateString()} -{' '}
                        {new Date(tournament.registrationEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Tournament Period</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tournament.tournamentStartDate).toLocaleDateString()} -{' '}
                        {new Date(tournament.tournamentEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" data-testid={`button-edit-${tournament.id}`} onClick={async () => {
                    const name = window.prompt('Edit tournament name:', tournament.name);
                    if (name === null) return;
                    const description = window.prompt('Description:', tournament.description) ?? tournament.description;
                    const payload = {
                      name,
                      description,
                      location: tournament.location,
                      registrationStartDate: tournament.registrationStartDate,
                      registrationEndDate: tournament.registrationEndDate,
                      tournamentStartDate: tournament.tournamentStartDate,
                      tournamentEndDate: tournament.tournamentEndDate,
                      status: tournament.status
                    };
                    try {
                      const res = await fetch(`/api/tournaments/${tournament.id}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                      });
                      if (res.ok) {
                        const idx = tournaments.findIndex(t => t.id === tournament.id);
                        if (idx !== -1) tournaments[idx] = { ...tournaments[idx], name, description } as any;
                        setTournamentList(prev => prev.map(t => t.id === tournament.id ? { ...t, name, description } as any : t));
                        toast({ title: 'Tournament updated' });
                      } else {
                        toast({ title: 'Update failed', description: 'Server returned an error' });
                      }
                    } catch (e) {
                      toast({ title: 'Update failed', description: 'Network error' });
                    }
                  }}>
                    Edit Details
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-manage-${tournament.id}`} onClick={() => navigate(`/admin/events?tournament=${tournament.id}`)}>
                    Manage Events
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-view-${tournament.id}`} onClick={() => navigate(`/admin/reports?tournament=${tournament.id}`)}>
                    View Report
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-delete-${tournament.id}`} onClick={async () => {
                    if (!window.confirm('Delete tournament and all associated data? This cannot be undone.')) return;
                    try {
                      const res = await fetch(`/api/tournaments/${tournament.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        const idx = tournaments.findIndex(t => t.id === tournament.id);
                        if (idx !== -1) tournaments.splice(idx, 1);
                        setTournamentList(prev => prev.filter(t => t.id !== tournament.id));
                        toast({ title: 'Tournament deleted' });
                      } else {
                        toast({ title: 'Delete failed', description: 'Server returned an error' });
                      }
                    } catch (e) {
                      toast({ title: 'Delete failed', description: 'Network error' });
                    }
                  }}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
