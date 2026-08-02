import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, CheckCircle2, Clock, Award } from 'lucide-react';
import { tournaments } from '@/data/tournaments';
import { employees } from '@/data/employees';
import { matches } from '@/data/matches';
import { champions } from '@/data/champions';
import { events, getEventById } from '@/data/events';
import { getEmployeeById } from '@/data/employees';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [regs, setRegs] = useState<any[]>([]);
  const activeTournament = tournaments.find(t => t.status === "In Progress");
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === "Completed").length;
  const pendingMatches = matches.filter(m => m.status === "Pending").length;
  const scheduledMatches = matches.filter(m => m.status === "Scheduled").length;

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

  // Event-wise registrations data
  const eventRegistrations = events.map(event => ({
    name: event.name.replace(/Table Tennis |Carrom /, ''),
    registrations: regs.filter((r: any) => r.event_id === event.id).length
  }));

  // Location-wise registrations data
  const locationData = [
    {
      name: 'Hyderabad',
      value: regs.filter((r: any) => {
        const emp = getEmployeeById(r.employee_id);
        return emp?.location === 'Hyderabad';
      }).length
    },
    {
      name: 'Bangalore',
      value: regs.filter((r: any) => {
        const emp = getEmployeeById(r.employee_id);
        return emp?.location === 'Bangalore';
      }).length
    }
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  // Recent registrations
  const recentRegistrations = [...regs]
    .sort((a, b) => new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime())
    .slice(0, 5);

  // Upcoming matches
  const upcomingMatches = matches
    .filter(m => m.status === "Scheduled" && m.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
    .slice(0, 3);

  // Recent results
  const recentResults = matches
    .filter(m => m.status === "Completed")
    .slice(-3)
    .reverse();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your tournament.
          </p>
        </div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
            <StatCard
              title="Active Tournament"
              value={activeTournament ? "1" : "0"}
              icon={Trophy}
              description={activeTournament?.name}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Total Registrations"
              value={regs.length.toString()}
              icon={Users}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Total Employees"
              value={employees.length}
              icon={Users}
            />
          </motion.div>
          {/* Match stats removed when no matches are scheduled/completed to keep dashboard focused */}
          <motion.div variants={item}>
            <StatCard
              title="Champions Declared"
              value={champions.length}
              icon={Award}
            />
          </motion.div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Event-wise Registrations</CardTitle>
                <CardDescription>Participant distribution across events</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={eventRegistrations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="registrations" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Location-wise Distribution</CardTitle>
                <CardDescription>Registrations by office location</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={locationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {locationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Widgets Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Registrations</CardTitle>
                <CardDescription>Latest 5 registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentRegistrations.map(reg => {
                    const employee = getEmployeeById(reg.employeeId);
                    const event = getEventById(reg.eventId);
                    return (
                      <div key={reg.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{employee?.name}</p>
                          <p className="text-xs text-muted-foreground">{event?.name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(reg.registration_date).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {upcomingMatches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Matches</CardTitle>
                  <CardDescription>Next 3 scheduled matches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingMatches.map(match => {
                      const player1 = getEmployeeById(match.player1Id);
                      const player2 = match.player2Id ? getEmployeeById(match.player2Id) : null;
                      const event = getEventById(match.eventId);
                      return (
                        <div key={match.id} className="text-sm border-b border-border pb-2 last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-xs text-primary">{event?.name}</p>
                            <StatusBadge status={match.status} />
                          </div>
                          <p className="text-xs">{player1?.name} vs {player2?.name || 'TBD'}</p>
                          <p className="text-xs text-muted-foreground">
                            {match.scheduledDate} at {match.scheduledTime} • {match.venue}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {recentResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Results</CardTitle>
                  <CardDescription>Latest 3 completed matches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentResults.map(match => {
                      const winner = match.winnerId ? getEmployeeById(match.winnerId) : null;
                      const event = getEventById(match.eventId);
                      return (
                        <div key={match.id} className="text-sm border-b border-border pb-2 last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-xs text-primary">{event?.name}</p>
                            <StatusBadge status={match.status} />
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <p className="text-xs font-medium">{winner?.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{match.round} • {match.score}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
