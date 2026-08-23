import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Download, TrendingUp, Users, Trophy, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchEvents, fetchMatches, fetchRegistrations, type AppEvent, type AppMatch, type AppRegistration } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Reports() {
  const [regs, setRegs] = useState<AppRegistration[]>([]);
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [matchesList, setMatchesList] = useState<AppMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadReportData = async () => {
      setLoading(true);
      try {
        const [r, e, m] = await Promise.all([
          fetchRegistrations(),
          fetchEvents(),
          fetchMatches()
        ]);
        if (!mounted) return;
        setRegs(r);
        setEventsList(e);
        setMatchesList(m);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadReportData();
    return () => { mounted = false; };
  }, []);

  const projectData = useMemo(() => {
    const defaultProjects = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Design', 'Legal'];
    const foundProjects = Array.from(new Set(regs.map(r => r.project || r.department).filter(Boolean))) as string[];
    const allProjects = Array.from(new Set([...defaultProjects, ...foundProjects]));

    return allProjects.map(proj => ({
      project: proj,
      registrations: regs.filter(r => (r.project || r.department || 'General') === proj).length
    })).filter(d => d.registrations > 0 || defaultProjects.includes(d.project));
  }, [regs]);

  const eventProgress = useMemo(() => {
    return eventsList.map(event => {
      const eventMatches = matchesList.filter(m => m.eventId === event.id);
      const completed = eventMatches.filter(m => m.status === "Completed").length;
      const total = eventMatches.length;
      return {
        name: event.name.replace(/Table Tennis |Carrom /i, ''),
        progress: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
  }, [eventsList, matchesList]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Tournament statistics and insights
            </p>
          </div>
          <Button className="gap-2" data-testid="button-export-report" onClick={() => {
            // Build CSV from registrations
            const headers = ['providedEmployeeId','employeeName','eventId','eventName','location','registrationDate'];
            const rows = regs.map(r => {
              const ev = eventsList.find(e => e.id === r.eventId);
              return [r.providedEmployeeId || r.employeeId || '', r.employeeName || '', r.eventId, ev?.name || '', r.location, r.registrationDate];
            });
            const csv = [headers.join(','), ...rows.map(r => r.map(String).map(s => `"${s.replace(/"/g,'""')}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'registrations.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regs.length}</div>
              <p className="text-xs text-muted-foreground">Across {eventsList.length} events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventsList.length}</div>
              <p className="text-xs text-muted-foreground">Singles and Doubles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Matches Generated</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{matchesList.length}</div>
              <p className="text-xs text-muted-foreground">Total tournament matches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Matches Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {matchesList.filter(m => m.status === 'Completed').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {matchesList.length > 0 
                  ? `${Math.round((matchesList.filter(m => m.status === 'Completed').length / matchesList.length) * 100)}% overall completion`
                  : '0% overall completion'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Project Participation
              </CardTitle>
              <CardDescription>Participation count by project</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="project" stroke="hsl(var(--muted-foreground))" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="registrations" fill="hsl(var(--primary))" name="Registrations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Event Progress
              </CardTitle>
              <CardDescription>Completion percentage by event</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={eventProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="progress" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 6 }}
                    name="Progress %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">By Location</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Irrum Manzil</span>
                    <span className="font-medium">{regs.filter(r => (r.location || '').includes('Irrum') || (r.location || '').includes('Hyderabad')).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hitech City</span>
                    <span className="font-medium">{regs.filter(r => (r.location || '').includes('Hitech') || (r.location || '').includes('Bangalore')).length}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Match Status</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-medium">{matchesList.filter(m => m.status === "Completed").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scheduled</span>
                    <span className="font-medium">{matchesList.filter(m => m.status === "Scheduled").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium">{matchesList.filter(m => m.status === "Pending").length}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Event Types</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Singles</span>
                    <span className="font-medium">{eventsList.filter(e => e.type === "Singles").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doubles</span>
                    <span className="font-medium">{eventsList.filter(e => e.type === "Doubles").length}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
