import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { events, getEventById } from '@/data/events';
import { Trophy, CheckCircle2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const { toast } = useToast();
  // collect provided Employee ID and also generate an internal anonymized id
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState<'Hyderabad' | 'Bangalore' | ''>('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hideEventSelection, setHideEventSelection] = useState(false);

  const availableEvents = location ? events : [];
  const doublesEvents = selectedEvents.filter(eventId => {
    const event = getEventById(eventId);
    return event?.type === 'Doubles';
  });

  const locationEmployees = [];

  const handleEventToggle = (eventId: string, checked: boolean) => {
    if (checked) {
      setSelectedEvents([...selectedEvents, eventId]);
    } else {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
      // partner selection removed; auto-pairing handled by server
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Partner selection removed: server will auto-assign partners for Doubles

    const anonId = `ANON${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
    const employeeIdValue = employeeId.trim() || anonId;

    // Build payloads for each selected event
    const payloads = selectedEvents.map(eventId => ({
      employeeId: employeeIdValue,
      providedEmployeeId: employeeIdValue,
      employeeName: name,
      // department intentionally omitted
      tournamentId: 'T001',
      eventId,
      eventType: getEventById(eventId)?.type,
      partnerId: undefined,
      location,
      registrationDate: new Date().toISOString()
    }));

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrations: payloads })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'server error');
      }

      setIsSubmitted(true);
      toast({
        title: 'Registration Successful!',
        description: `You have been registered for ${selectedEvents.length} event(s).`
      });
    } catch (err) {
      toast({
        title: 'Registration Failed',
        description: 'Could not complete registration. Please try again when the database is available.'
      });
      return;
    }
  };

  // If admin has set open events (admin can set localStorage 'openEvents' as csv of eventIds), preselect and hide event selection
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('openEvents');
        if (raw) {
          const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
          if (ids.length) {
            setSelectedEvents(ids);
            setHideEventSelection(true);
          }
        }
      }
    } catch (e) {}
  }, []);

  if (isSubmitted) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <Card className="border-primary/50">
              <CardHeader className="text-center">
                <div className="space-y-2">
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-green-500/10 p-4">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Registration Complete</CardTitle>
                  <CardDescription>
                    Thank you — your registration has been recorded. The admin will review registrations.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee ID:</span>
                    <span className="font-medium">{employeeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Events:</span>
                    <span className="font-medium">{selectedEvents.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Registered Events:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {selectedEvents.map(eventId => {
                      const event = getEventById(eventId);
                      return (
                        <li key={eventId} className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-primary" />
                          {event?.name}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Event Registration</h1>
            <p className="text-muted-foreground">
              Register for Office Indoor Games 2026
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registration Form</CardTitle>
              <CardDescription>
                Fill in your details and select the events you want to participate in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Employee Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Employee Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} data-testid="input-employee-id" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Select value={location} onValueChange={(v) => setLocation(v as any)}>
                        <SelectTrigger id="location" data-testid="select-location">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                          <SelectItem value="Bangalore">Bangalore</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Event Selection */}
                {location && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Select Events</h3>
                    <div className="space-y-3">
                      {availableEvents.map(event => (
                        <div key={event.id} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={event.id}
                              checked={selectedEvents.includes(event.id)}
                              onCheckedChange={(checked) => handleEventToggle(event.id, checked as boolean)}
                              data-testid={`checkbox-event-${event.id}`}
                            />
                            <Label htmlFor={event.id} className="cursor-pointer flex-1">
                              <span className="font-medium">{event.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({event.type})
                              </span>
                            </Label>
                          </div>

                          {/* Partner Selection for Doubles */}
                          {/* Partner selection removed - server will auto-assign partners for Doubles */}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!employeeId || !name || selectedEvents.length === 0}
                    data-testid="button-submit-registration"
                  >
                    Complete Registration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
