import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Trophy, CheckCircle2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchEvents, type AppEvent } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Register() {
  const { toast } = useToast();
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState<'Irrum Manzil' | 'Hitech City' | 'Other' | ''>('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await fetchEvents();
      if (!mounted) return;
      setEventsList(list);
    })();
    return () => { mounted = false; };
  }, []);

  const handleEventToggle = (eventId: string, checked: boolean) => {
    if (checked) {
      setSelectedEvents(prev => [...prev, eventId]);
    } else {
      setSelectedEvents(prev => prev.filter(id => id !== eventId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId.trim() || !name.trim() || !location || selectedEvents.length === 0) {
      toast({
        title: 'Incomplete Form',
        description: 'Please fill in Employee ID, Name, Location, and select at least one event.'
      });
      return;
    }

    setIsSubmitting(true);
    const empIdClean = employeeId.trim();

    const payloads = selectedEvents.map(eventId => {
      const ev = eventsList.find(e => e.id === eventId);
      return {
        employeeId: empIdClean,
        providedEmployeeId: empIdClean,
        employeeName: name.trim(),
        department: department.trim() || 'General',
        tournamentId: ev?.tournamentId || 'T001',
        eventId,
        eventType: ev?.type || 'Singles',
        location,
        registrationDate: new Date().toISOString()
      };
    });

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrations: payloads })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Server error saving registration');
      }

      setIsSubmitted(true);
      toast({
        title: 'Registration Successful! 🎉',
        description: `Successfully registered ${name.trim()} (${empIdClean}) for ${selectedEvents.length} event(s) at ${location}.`
      });
    } catch (err: any) {
      toast({
        title: 'Registration Failed',
        description: err?.message || 'Could not complete registration. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <Card className="text-center p-8 space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-['Outfit']">Registration Confirmed!</h2>
              <p className="text-sm text-muted-foreground">
                Thank you <strong className="text-foreground">{name}</strong> ({employeeId}). Your registrations have been logged for <strong className="text-foreground">{location}</strong>.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold">{location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-semibold">{department || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Events Count:</span>
                <span className="font-semibold">{selectedEvents.length}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setIsSubmitted(false);
                setEmployeeId('');
                setName('');
                setDepartment('');
                setLocation('');
                setSelectedEvents([]);
              }}
            >
              Register Another Athlete
            </Button>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 to-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-bold shadow-xs">
              <UserPlus className="h-3.5 w-3.5 text-sky-500" />
              <span>Athlete Enrollment</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-['Outfit'] tracking-tight">
              Register for Tournament Events
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Enter your employee details and select the sports and categories you want to compete in.
            </p>
          </div>

          <Card className="border border-sky-500/20 shadow-lg shadow-blue-500/5 rounded-2xl overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-bold font-['Outfit']">Athlete Registration Form</CardTitle>
              <CardDescription className="text-xs">
                All fields marked with an asterisk (*) are mandatory
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">Participant Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId" className="text-sm font-semibold">Employee ID *</Label>
                      <Input
                        id="employeeId"
                        placeholder="e.g. EMP-1042"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        required
                        className="rounded-xl"
                        data-testid="input-employee-id"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Alex Johnson"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="rounded-xl"
                        data-testid="input-name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-sm font-semibold">Department</Label>
                      <Input
                        id="department"
                        placeholder="e.g. Engineering, Sales"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="rounded-xl"
                        data-testid="input-department"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-semibold">Office Location *</Label>
                      <Select value={location} onValueChange={(v) => setLocation(v as any)}>
                        <SelectTrigger id="location" className="rounded-xl" data-testid="select-location">
                          <SelectValue placeholder="Select office location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Irrum Manzil">Irrum Manzil</SelectItem>
                          <SelectItem value="Hitech City">Hitech City</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Event Selection */}
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <h3 className="font-semibold text-base">Select Events *</h3>
                    <p className="text-xs text-muted-foreground">Select one or more events to compete in</p>
                  </div>

                  {eventsList.length > 0 ? (
                    <div className="space-y-2.5">
                      {eventsList.map(event => (
                        <label
                          key={event.id}
                          className={cn(
                            "flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all",
                            selectedEvents.includes(event.id)
                              ? "bg-sky-500/10 border-sky-500/40 shadow-xs"
                              : "hover:bg-muted/50 border-border"
                          )}
                        >
                          <Checkbox
                            id={event.id}
                            checked={selectedEvents.includes(event.id)}
                            onCheckedChange={(checked) => handleEventToggle(event.id, Boolean(checked))}
                            data-testid={`checkbox-event-${event.id}`}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-sm text-foreground">{event.name}</span>
                            <span className="text-xs text-muted-foreground ml-2 font-normal">
                              ({event.type} • {event.game})
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground">
                      Loading available tournament events…
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full text-base font-bold py-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-lg shadow-blue-500/25 transition-all"
                  disabled={isSubmitting || !employeeId.trim() || !name.trim() || !location || selectedEvents.length === 0}
                  data-testid="button-submit-registration"
                >
                  {isSubmitting ? 'Submitting Registration…' : 'Complete Registration'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
