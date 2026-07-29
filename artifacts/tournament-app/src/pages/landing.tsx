import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { Trophy, Calendar, MapPin, Users, ArrowRight, Clock } from 'lucide-react';
import { getActiveTournament } from '@/data/tournaments';
import { events } from '@/data/events';
import { registrations } from '@/data/registrations';
import { matches } from '@/data/matches';
import { motion } from 'framer-motion';

export default function Landing() {
  const tournament = getActiveTournament();
  const totalRegistrations = registrations.length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === "Completed").length;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)]">
        {/* Hero Section */}
        <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              className="text-center space-y-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full">
                <Trophy className="h-16 w-16 text-primary" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                {tournament?.name}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {tournament?.description}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{tournament?.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{new Date(tournament?.tournamentStartDate || '').toLocaleDateString()} - {new Date(tournament?.tournamentEndDate || '').toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{totalRegistrations} Registrations</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                <Link href="/register">
                  <Button size="lg" className="gap-2" data-testid="button-register-now">
                    Register Now <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/fixtures">
                  <Button size="lg" variant="outline" data-testid="button-view-fixtures">
                    View Fixtures
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-card border-y border-border">
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-4 gap-6"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <motion.div variants={item}>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl font-bold text-primary">{events.length}</div>
                    <div className="text-sm text-muted-foreground mt-2">Events</div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl font-bold text-primary">{totalRegistrations}</div>
                    <div className="text-sm text-muted-foreground mt-2">Participants</div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl font-bold text-primary">{completedMatches}</div>
                    <div className="text-sm text-muted-foreground mt-2">Matches Completed</div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl font-bold text-primary">{totalMatches - completedMatches}</div>
                    <div className="text-sm text-muted-foreground mt-2">Upcoming Matches</div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Events Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Tournament Events</h2>
              <p className="text-muted-foreground">Compete in your favorite indoor games</p>
            </div>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {events.map((event) => {
                const eventRegs = registrations.filter(r => r.eventId === event.id).length;
                return (
                  <motion.div key={event.id} variants={item}>
                    <Card className="hover:shadow-lg transition-all hover:border-primary/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          {event.name}
                        </CardTitle>
                        <CardDescription>
                          {event.type} • {event.game}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{eventRegs} registered</span>
                          </div>
                          <Link href={`/fixtures?event=${event.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${event.id}`}>
                              View Bracket
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="container mx-auto max-w-4xl text-center space-y-6">
            <Clock className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-3xl font-bold">Ready to Compete?</h2>
            <p className="text-muted-foreground text-lg">
              Registration is open! Sign up now and showcase your skills.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2" data-testid="button-register-cta">
                Register Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
