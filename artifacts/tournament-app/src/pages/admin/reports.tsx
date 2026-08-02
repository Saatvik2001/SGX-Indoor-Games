import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/data/events';
import { matches } from '@/data/matches';
import { employees } from '@/data/employees';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Reports() {
  const [regs, setRegs] = useState<any[]>([]);

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

  const departmentData = [
    'Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Design', 'Legal'
  ].map(dept => ({
    department: dept,
    employees: employees.filter(e => e.department === dept).length,
    registrations: regs.filter(r => {
      const emp = employees.find(e => e.id === r.employee_id);
      return emp?.department === dept;
    }).length
  }));

  const eventProgress = events.map(event => {
    const eventMatches = matches.filter(m => m.eventId === event.id);
    const completed = eventMatches.filter(m => m.status === "Completed").length;
    const total = eventMatches.length;
    return {
      name: event.name.replace(/Table Tennis |Carrom /, ''),
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

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
              const ev = events.find(e => e.id === r.event_id);
              const emp = employees.find(e => e.id === r.employee_id);
              return [r.provided_employee_id || '', emp?.name || r.employee_name || '', r.event_id, ev?.name || '', r.location, r.registration_date];
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
                <p className="text-3xl font-bold text-primary">{matches.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
                <p className="text-3xl font-bold text-primary">
                  {Math.round((matches.filter(m => m.status === "Completed").length / matches.length) * 100)}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Active Events</p>
                <p className="text-3xl font-bold text-primary">{events.length}</p>
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
              <CardDescription>Employee count vs registrations by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="department" stroke="hsl(var(--muted-foreground))" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="employees" fill="hsl(var(--muted))" name="Employees" radius={[4, 4, 0, 0]} />
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
                    <span>Hyderabad</span>
                    <span className="font-medium">{employees.filter(e => e.location === 'Hyderabad').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bangalore</span>
                    <span className="font-medium">{employees.filter(e => e.location === 'Bangalore').length}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Match Status</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-medium">{matches.filter(m => m.status === "Completed").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scheduled</span>
                    <span className="font-medium">{matches.filter(m => m.status === "Scheduled").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium">{matches.filter(m => m.status === "Pending").length}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Event Types</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Singles</span>
                    <span className="font-medium">{events.filter(e => e.type === "Singles").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doubles</span>
                    <span className="font-medium">{events.filter(e => e.type === "Doubles").length}</span>
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
