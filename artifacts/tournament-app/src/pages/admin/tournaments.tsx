import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, Calendar, MapPin } from 'lucide-react';
import { tournaments } from '@/data/tournaments';
import { StatusBadge } from '@/components/StatusBadge';

export default function Tournaments() {
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
          <Button className="gap-2" data-testid="button-create-tournament">
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        </div>

        <div className="grid gap-6">
          {tournaments.map(tournament => (
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
                  <Button variant="outline" size="sm" data-testid={`button-edit-${tournament.id}`}>
                    Edit Details
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-manage-${tournament.id}`}>
                    Manage Events
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-view-${tournament.id}`}>
                    View Report
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
