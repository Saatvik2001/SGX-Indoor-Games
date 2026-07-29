import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Plus, Trophy, Users } from 'lucide-react';
import { events } from '@/data/events';
import { registrations } from '@/data/registrations';
import { Badge } from '@/components/ui/badge';

export default function Events() {
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
          <Button className="gap-2" data-testid="button-create-event">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => {
            const eventRegs = registrations.filter(r => r.eventId === event.id);
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
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-registrations-${event.id}`}>
                      View Registrations
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-manage-fixtures-${event.id}`}>
                      Manage Fixtures
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-${event.id}`}>
                      Edit Event
                    </Button>
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
