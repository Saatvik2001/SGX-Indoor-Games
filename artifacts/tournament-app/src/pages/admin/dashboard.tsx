import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, CheckCircle2, Clock, Award } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';
import {
  fetchEvents,
  fetchTournaments,
  fetchRegistrations,
  fetchMatches,
  getParticipantDisplay,
  type AppEvent,
  type AppTournament,
  type AppRegistration,
  type AppMatch
} from '@/lib/api';

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<AppTournament[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [regs, setRegs] = useState<AppRegistration[]>([]);
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [tournList, evList, regList, matchList] = await Promise.all([
          fetchTournaments(),
          fetchEvents(),
          fetchRegistrations(),
          fetchMatches()
        ]);
        if (!mounted) return;
        setTournaments(tournList);
        setEvents(evList);
        setRegs(regList);
        setMatches(matchList);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => { mounted = false; };
  }, []);

  const activeTournament = tournaments[0];
  const totalRegistrations = regs.length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'Completed').length;
  const scheduledMatches = matches.filter(m => m.status === 'Scheduled').length;
  const pendingMatches = matches.filter(m => m.status === 'Pending').length;

  // Event-wise registrations data
  const eventRegistrations = useMemo(() => {
    return events.map(event => ({
      name: event.name.replace(/Table Tennis |Carrom /, ''),
      registrations: regs.filter(r => r.eventId === event.id).length
    }));
  }, [events, regs]);

  // Location-wise registrations data
  const locationData = useMemo(() => {
    const irrumCount = regs.filter(r => r.location?.toLowerCase().includes('irrum') || r.location?.toLowerCase().includes('hyderabad')).length;
    const hitechCount = regs.filter(r => r.location?.toLowerCase().includes('hitech') || r.location?.toLowerCase().includes('bangalore')).length;
    const otherCount = regs.length - irrumCount - hitechCount;
    const data = [
      { name: 'Irrum Manzil', value: irrumCount },
      { name: 'Hitech City', value: hitechCount }
    ];
    if (otherCount > 0) {
      data.push({ name: 'Other', value: otherCount });
    }
    return data;
  }, [regs]);

  const COLORS = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6'];

  // Recent registrations (5 latest)
  const recentRegistrations = useMemo(() => {
    return [...regs]
      .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
      .slice(0, 5);
  }, [regs]);

  // Upcoming matches (Scheduled with date)
  const upcomingMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'Scheduled' && m.scheduledDate)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
      .slice(0, 5);
  }, [matches]);

  // Recent results
  const recentResults = useMemo(() => {
    return matches
      .filter(m => m.status === 'Completed')
      .slice(-5)
      .reverse();
  }, [matches]);

  const championsCount = useMemo(() => {
    // Count events with completed final match
    return events.filter(ev => {
      const evMatches = matches.filter(m => m.eventId === ev.id);
      const maxLevel = Math.max(-1, ...evMatches.map(m => m.roundLevel));
      return evMatches.some(m => m.roundLevel === maxLevel && m.status === 'Completed' && m.winnerId);
    }).length;
  }, [events, matches]);

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournament Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of registrations, upcoming schedules, and tournament brackets
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
              description={activeTournament?.name || "No active tournament"}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Total Events"
              value={events.length.toString()}
              icon={Calendar}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Registrations"
              value={totalRegistrations.toString()}
              icon={Users}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Upcoming Matches"
              value={scheduledMatches.toString()}
              icon={Clock}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Matches Completed"
              value={completedMatches.toString()}
              icon={CheckCircle2}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Champions Declared"
              value={championsCount.toString()}
              icon={Award}
            />
          </motion.div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Event-wise Registrations</CardTitle>
              <CardDescription>Participant count per event</CardDescription>
            </CardHeader>
            <CardContent>
              {eventRegistrations.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={eventRegistrations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
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
              ) : (
                <div className="py-16 text-center text-muted-foreground">No events available</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location Distribution</CardTitle>
              <CardDescription>Registrations by office city</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {regs.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={locationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
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
              ) : (
                <div className="py-16 text-center text-muted-foreground">No registrations recorded yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Widgets Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Upcoming Matches
              </CardTitle>
              <CardDescription>Scheduled tournament matches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMatches.map(match => {
                  const p1 = getParticipantDisplay(match.player1Id, regs);
                  const p2 = getParticipantDisplay(match.player2Id, regs);
                  const event = events.find(e => e.id === match.eventId);

                  return (
                    <div key={match.id} className="text-sm border-b pb-2.5 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-primary">{event?.name || match.round}</span>
                        <StatusBadge status={match.status} />
                      </div>
                      <p className="text-xs font-medium text-foreground">
                        {p1.display} <span className="text-muted-foreground font-normal">vs</span> {p2.display}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📅 {new Date(match.scheduledDate!).toLocaleDateString()} {match.scheduledTime ? `• ⏰ ${match.scheduledTime}` : ''} {match.venue ? `• 📍 ${match.venue}` : ''}
                      </p>
                    </div>
                  );
                })}

                {upcomingMatches.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No upcoming matches scheduled. Use the Schedule tab to schedule matches.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Recent Registrations
              </CardTitle>
              <CardDescription>Latest participant signups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRegistrations.map(reg => {
                  const event = events.find(e => e.id === reg.eventId);
                  return (
                    <div key={reg.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-xs text-foreground">
                          {reg.employeeName} <span className="font-mono text-muted-foreground">({reg.providedEmployeeId})</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{event?.name || reg.eventId} • {reg.location}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(reg.registrationDate).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}

                {recentRegistrations.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No registrations found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Recent Match Results
              </CardTitle>
              <CardDescription>Latest completed match outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentResults.map(match => {
                  const winner = getParticipantDisplay(match.winnerId, regs);
                  const event = events.find(e => e.id === match.eventId);

                  return (
                    <div key={match.id} className="text-sm border-b pb-2 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-primary">{event?.name || match.round}</span>
                        <StatusBadge status={match.status} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Winner: {winner.display}</span>
                      </div>
                      {match.score && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">Score: {match.score}</p>
                      )}
                    </div>
                  );
                })}

                {recentResults.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No matches completed yet. Save match winners from the Fixtures tab.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
