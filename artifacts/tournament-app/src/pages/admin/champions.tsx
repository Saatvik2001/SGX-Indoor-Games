import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award } from 'lucide-react';
import { champions } from '@/data/champions';
import { getEventById } from '@/data/events';
import { getEmployeeById } from '@/data/employees';

export default function AdminChampions() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Champions</h1>
          <p className="text-muted-foreground">
            View and manage tournament champions
          </p>
        </div>

        {champions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {champions.map(champion => {
              const event = getEventById(champion.eventId);
              const winner = getEmployeeById(champion.championId);
              const runnerUp = champion.runnerId ? getEmployeeById(champion.runnerId) : null;

              return (
                <Card key={champion.eventId} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      {event?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-semibold text-yellow-600">CHAMPION</span>
                      </div>
                      <p className="font-bold text-lg">{winner?.name}</p>
                      <p className="text-sm text-muted-foreground">{winner?.department} • {winner?.location}</p>
                    </div>

                    {runnerUp && (
                      <div className="p-4 bg-muted border rounded-lg">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">RUNNER-UP</p>
                        <p className="font-medium">{runnerUp.name}</p>
                        <p className="text-sm text-muted-foreground">{runnerUp.department} • {runnerUp.location}</p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Declared: {new Date(champion.declaredAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Champions Yet</h3>
                <p className="text-muted-foreground">
                  Champions will appear here once tournaments are completed
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
