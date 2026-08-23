import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Download, TrendingUp } from 'lucide-react';
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

  const departmentData = useMemo(() => {
    const defaultDepts = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Design', 'Legal'];
    const foundDepts = Array.from(new Set(regs.map(r => r.department).filter(Boolean))) as string[];
    const allDepts = Array.from(new Set([...defaultDepts, ...foundDepts]));

    return allDepts.map(dept => ({
      department: dept,
      registrations: regs.filter(r => (r.department || 'General') === dept).length
    })).filter(d => d.registrations > 0 || defaultDepts.includes(d.department));
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Participants</p>
                <p className="text-3xl font-bold text-primary">{regs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Matches</p>
                <p className="text-3xl font-bold text-primary">{matchesList.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
                <p className="text-3xl font-bold text-primary">
                  {matchesList.length > 0 ? Math.round((matchesList.filter(m => m.status === "Completed").length / matchesList.length) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Active Events</p>
                <p className="text-3xl font-bold text-primary">{eventsList.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Department Participation
              </CardTitle>
              <CardDescription>Participation count by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="department" stroke="hsl(var(--muted-foreground))" fontSize={12} angle={-45} textAnchor="end" height={80} />
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
