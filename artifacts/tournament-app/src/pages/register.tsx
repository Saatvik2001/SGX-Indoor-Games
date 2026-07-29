import { useState } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { events, getEventById } from '@/data/events';
import { employees, getEmployeesByLocation, getEmployeeById } from '@/data/employees';
import { addRegistration } from '@/data/registrations';
import { Trophy, CheckCircle2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState<'Hyderabad' | 'Bangalore' | ''>('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const availableEvents = location ? events : [];
  const doublesEvents = selectedEvents.filter(eventId => {
    const event = getEventById(eventId);
    return event?.type === 'Doubles';
  });

  const locationEmployees = location ? getEmployeesByLocation(location as any) : [];

  const handleEmployeeIdChange = (value: string) => {
    setEmployeeId(value);
    const employee = getEmployeeById(value);
    if (employee) {
      setName(employee.name);
      setEmail(employee.email);
      setDepartment(employee.department);
      setLocation(employee.location);
    }
  };

  const handleEventToggle = (eventId: string, checked: boolean) => {
    if (checked) {
      setSelectedEvents([...selectedEvents, eventId]);
    } else {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
      const newPartners = { ...partners };
      delete newPartners[eventId];
      setPartners(newPartners);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate doubles partner selection
    for (const eventId of doublesEvents) {
      if (!partners[eventId]) {
        toast({
          title: "Partner Required",
          description: `Please select a partner for ${getEventById(eventId)?.name}`,
          variant: "destructive"
        });
        return;
      }
    }

    // Submit registrations
    selectedEvents.forEach(eventId => {
      addRegistration({
        employeeId,
        tournamentId: 'T001',
        eventId,
        partnerId: partners[eventId],
        registrationDate: new Date().toISOString()
      });
    });

    setIsSubmitted(true);
    toast({
      title: "Registration Successful!",
      description: `You have been registered for ${selectedEvents.length} event(s).`
    });
  };

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
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-green-500/10 p-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Registration Successful!</CardTitle>
                <CardDescription>
                  You have been successfully registered for the tournament.
                </CardDescription>
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
                      const partner = partners[eventId];
                      const partnerEmployee = partner ? getEmployeeById(partner) : null;
                      return (
                        <li key={eventId} className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-primary" />
                          {event?.name}
                          {partnerEmployee && (
                            <span className="text-xs">
                              (with {partnerEmployee.name})
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <Button
                  onClick={() => setIsSubmitted(false)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-register-another"
                >
                  Register Another Employee
                </Button>
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
                    <Select value={employeeId} onValueChange={handleEmployeeIdChange} required>
                      <SelectTrigger id="employeeId" data-testid="select-employee-id">
                        <SelectValue placeholder="Select your Employee ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.id} - {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} disabled data-testid="input-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={email} disabled data-testid="input-email" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" value={department} disabled data-testid="input-department" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" value={location} disabled data-testid="input-location" />
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
                          {selectedEvents.includes(event.id) && event.type === 'Doubles' && (
                            <div className="ml-6 space-y-2">
                              <Label htmlFor={`partner-${event.id}`}>Select Partner</Label>
                              <Select
                                value={partners[event.id] || ''}
                                onValueChange={(value) => setPartners({ ...partners, [event.id]: value })}
                                required
                              >
                                <SelectTrigger id={`partner-${event.id}`} data-testid={`select-partner-${event.id}`}>
                                  <SelectValue placeholder="Choose your partner" />
                                </SelectTrigger>
                                <SelectContent>
                                  {locationEmployees
                                    .filter(emp => emp.id !== employeeId)
                                    .map(emp => (
                                      <SelectItem key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.department})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!employeeId || selectedEvents.length === 0}
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
