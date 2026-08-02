import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award, Medal } from 'lucide-react';
import { events, getEventById } from '@/data/events';
import { motion } from 'framer-motion';
import { type Registration } from '@/data/registrations';

export default function Champions() {
  const [matches, setMatches] = useState<any[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [matchesRes, regsRes] = await Promise.all([
          fetch('/api/matches'),
          fetch('/api/registrations')
        ]);
        if (!mounted) return;
        if (matchesRes.ok) {
          const rows = await matchesRes.json();
          setMatches(rows);
        }
        if (regsRes.ok) {
          const rows = await regsRes.json();
          setRegs(rows.map((r: any) => ({
            id: String(r.id),
            employeeId: r.employee_id,
            employeeName: r.employee_name,
            providedEmployeeId: r.provided_employee_id,
            department: r.department,
            tournamentId: r.tournament_id,
            eventId: r.event_id,
            partnerId: r.partner_id,
            location: r.location,
            registrationDate: r.registration_date,
          })));
        }
      } catch (err) {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const champions = events
    .map(event => {
      const eventMatches = matches.filter((m: any) => m.event_id === event.id);
      const finalMatch = eventMatches.find((m: any) => m.round === 'Final');
      if (!finalMatch || finalMatch.status !== 'Completed' || !finalMatch.winner_id) return null;
      const winnerReg = regs.find(r => r.eventId === event.id && r.employeeId === finalMatch.winner_id);
      const runnerReg = finalMatch.player2_id && regs.find(r => r.eventId === event.id && r.employeeId === finalMatch.player2_id);
      const winnerMeta = finalMatch.meta || {};
      return {
        eventId: event.id,
        championId: finalMatch.winner_id,
        runnerId: finalMatch.player2_id,
        declaredAt: finalMatch.scheduled_date || new Date().toISOString(),
        winnerName: winnerReg?.employeeName || winnerMeta.winner_name || 'TBD',
        runnerName: runnerReg?.employeeName || 'TBD',
        winnerDepartment: winnerReg?.department || winnerMeta.winner_department || 'Unknown',
        winnerLocation: winnerReg?.location || winnerMeta.winner_location || 'Unknown',
        runnerDepartment: runnerReg?.department || 'Unknown',
        runnerLocation: runnerReg?.location || 'Unknown',
      };
    })
    .filter(Boolean) as Array<any>;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header with celebration animation */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <div className="relative rounded-full bg-gradient-to-br from-primary to-primary/60 p-6">
                  <Trophy className="h-16 w-16 text-white" />
                </div>
              </div>
            </motion.div>
            <h1 className="text-4xl font-bold mb-2">Tournament Champions</h1>
            <p className="text-muted-foreground text-lg">
              Celebrating our winners and their achievements
            </p>
          </motion.div>

          {/* Champions Grid */}
          {champions.length > 0 ? (
            <div className="space-y-8">
              {champions.map((champion, index) => {
                const event = getEventById(champion.eventId);

                return (
                  <motion.div
                    key={champion.eventId}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden border-2 border-primary/20">
                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Trophy className="h-6 w-6 text-primary" />
                            {event?.name}
                          </h2>
                          <span className="text-sm text-muted-foreground">
                            {new Date(champion.declaredAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Champion */}
                          <motion.div
                            className="relative"
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-lg"></div>
                            <div className="relative bg-card border-2 border-yellow-500/30 rounded-lg p-6 text-center">
                              <div className="flex justify-center mb-4">
                                <div className="rounded-full bg-yellow-500/10 p-4">
                                  <Award className="h-10 w-10 text-yellow-600" />
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-yellow-600 mb-2">
                                CHAMPION
                              </div>
                              <h3 className="text-2xl font-bold mb-2">{champion.winnerName}</h3>
                              <p className="text-muted-foreground text-sm">{champion.winnerLocation}</p>
                              <div className="mt-4 inline-flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-full">
                                <Trophy className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-600">1st Place</span>
                              </div>
                            </div>
                          </motion.div>

                          {/* Runner-up */}
                          {champion.runnerName && champion.runnerName !== 'TBD' && (
                            <motion.div
                              className="relative"
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-slate-400/10 to-slate-500/5 rounded-lg"></div>
                              <div className="relative bg-card border-2 border-slate-400/30 rounded-lg p-6 text-center">
                                <div className="flex justify-center mb-4">
                                  <div className="rounded-full bg-slate-400/10 p-4">
                                    <Medal className="h-10 w-10 text-slate-600" />
                                  </div>
                                </div>
                                <div className="text-sm font-semibold text-slate-600 mb-2">
                                  RUNNER-UP
                                </div>
                                <h3 className="text-2xl font-bold mb-2">{champion.runnerName}</h3>
                                <p className="text-muted-foreground text-sm">{champion.runnerLocation}</p>
                                <div className="mt-4 inline-flex items-center gap-2 bg-slate-400/10 px-4 py-2 rounded-full">
                                  <Medal className="h-4 w-4 text-slate-600" />
                                  <span className="text-sm font-medium text-slate-600">2nd Place</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
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
                    Champions will be announced as tournaments conclude
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
