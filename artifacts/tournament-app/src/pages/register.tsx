import { useState, useEffect, useMemo } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Trophy, CheckCircle2, UserPlus, Users, User, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEvents, fetchRegistrations, apiUrl, type AppEvent, type AppRegistration } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Register() {
  const { toast } = useToast();
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [existingRegs, setExistingRegs] = useState<AppRegistration[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Primary Player (Player 1)
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState<'Irrum Manzil' | 'Hitech City' | ''>('');

  // Partner (Player 2 - for Doubles)
  const [doublesMode, setDoublesMode] = useState<'with_partner' | 'partial'>('with_partner');
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerDepartment, setPartnerDepartment] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    eventName: string;
    eventType: 'Singles' | 'Doubles';
    location: string;
    player1Name: string;
    player1Id: string;
    player2Name?: string;
    player2Id?: string;
    isPartial?: boolean;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [events, regs] = await Promise.all([
        fetchEvents(),
        fetchRegistrations()
      ]);
      if (!mounted) return;
      setEventsList(events);
      setExistingRegs(regs);
      if (events.length > 0 && !selectedEventId) {
        setSelectedEventId(events[0].id);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const selectedEvent = useMemo(() => {
    return eventsList.find(e => e.id === selectedEventId) || null;
  }, [eventsList, selectedEventId]);

  const isDoubles = selectedEvent?.type === 'Doubles';

  // Real-time client validation helper
  const validateForm = (): string | null => {
    if (!selectedEvent) return 'Please select an event.';
    const p1 = employeeId.trim();
    if (!p1) return 'Player Employee ID is required.';
    if (!name.trim()) return 'Player Full Name is required.';
    if (!location) return 'Please select an office location.';

    if (!isDoubles) {
      // Singles Validation
      const alreadyInEvent = existingRegs.find(
        r => r.eventId === selectedEvent.id && (
          r.employeeId.toLowerCase() === p1.toLowerCase() ||
          r.providedEmployeeId.toLowerCase() === p1.toLowerCase()
        )
      );
      if (alreadyInEvent) {
        return 'This player is already registered for this event.';
      }
    } else {
      // Doubles Validation
      if (doublesMode === 'with_partner') {
        const p2 = partnerId.trim();
        if (!p2 || !partnerName.trim()) {
          return 'Please select a partner to complete the Doubles registration.';
        }
        if (p1.toLowerCase() === p2.toLowerCase()) {
          return 'A player cannot be their own Doubles partner.';
        }

        // Check if player 1 is already in a team for this event
        const p1InEvent = existingRegs.find(
          r => r.eventId === selectedEvent.id && (
            r.employeeId.toLowerCase() === p1.toLowerCase() ||
            r.providedEmployeeId.toLowerCase() === p1.toLowerCase() ||
            (r.partnerId && r.partnerId.toLowerCase() === p1.toLowerCase())
          )
        );
        if (p1InEvent) {
          return 'This player is already part of another Doubles team for this event.';
        }

        // Check if player 2 is already in a team for this event
        const p2InEvent = existingRegs.find(
          r => r.eventId === selectedEvent.id && (
            r.employeeId.toLowerCase() === p2.toLowerCase() ||
            r.providedEmployeeId.toLowerCase() === p2.toLowerCase() ||
            (r.partnerId && r.partnerId.toLowerCase() === p2.toLowerCase())
          )
        );
        if (p2InEvent) {
          return 'This player is already part of another Doubles team for this event.';
        }

        // Check normalized duplicate team in this event
        const teamKey = [p1.toLowerCase(), p2.toLowerCase()].sort().join('___');
        const teamInEvent = existingRegs.some(
          r => r.eventId === selectedEvent.id && r.partnerId && [r.employeeId.toLowerCase(), r.partnerId.toLowerCase()].sort().join('___') === teamKey
        );
        if (teamInEvent) {
          return 'This Doubles team is already registered.';
        }
      } else {
        // Partial Doubles
        const p1InEvent = existingRegs.find(
          r => r.eventId === selectedEvent.id && (
            r.employeeId.toLowerCase() === p1.toLowerCase() ||
            r.providedEmployeeId.toLowerCase() === p1.toLowerCase() ||
            (r.partnerId && r.partnerId.toLowerCase() === p1.toLowerCase())
          )
        );
        if (p1InEvent) {
          return 'This player is already registered for this event.';
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const clientError = validateForm();
    if (clientError) {
      setValidationError(clientError);
      toast({
        title: 'Registration Validation',
        description: clientError,
        variant: 'destructive'
      });
      return;
    }

    if (!selectedEvent) return;

    setIsSubmitting(true);
    const p1Clean = employeeId.trim();
    const p1NameClean = name.trim();
    const p1DeptClean = department.trim() || 'General';

    let payload: Record<string, unknown>;

    if (!isDoubles) {
      payload = {
        employeeId: p1Clean,
        providedEmployeeId: p1Clean,
        employeeName: p1NameClean,
        department: p1DeptClean,
        tournamentId: selectedEvent.tournamentId || 'T001',
        eventId: selectedEvent.id,
        eventType: 'Singles',
        partnerId: null,
        location,
        registrationDate: new Date().toISOString()
      };
    } else {
      if (doublesMode === 'with_partner') {
        const p2Clean = partnerId.trim();
        const p2NameClean = partnerName.trim();
        const p2DeptClean = partnerDepartment.trim() || p1DeptClean;
        payload = {
          employeeId: p1Clean,
          providedEmployeeId: p1Clean,
          employeeName: p1NameClean,
          department: p1DeptClean,
          tournamentId: selectedEvent.tournamentId || 'T001',
          eventId: selectedEvent.id,
          eventType: 'Doubles',
          partnerId: p2Clean,
          partnerName: p2NameClean,
          partnerDepartment: p2DeptClean,
          location,
          registrationDate: new Date().toISOString()
        };
      } else {
        // Partial Doubles
        payload = {
          employeeId: p1Clean,
          providedEmployeeId: p1Clean,
          employeeName: p1NameClean,
          department: p1DeptClean,
          tournamentId: selectedEvent.tournamentId || 'T001',
          eventId: selectedEvent.id,
          eventType: 'Doubles',
          partnerId: null,
          location,
          registrationDate: new Date().toISOString()
        };
      }
    }

    try {
      const res = await fetch(apiUrl('/api/registrations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrations: [payload] })
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || 'Registration failed');
      }

      // Refresh existing registrations
      const updatedRegs = await fetchRegistrations();
      setExistingRegs(updatedRegs);

      setSubmittedData({
        eventName: selectedEvent.name,
        eventType: selectedEvent.type,
        location,
        player1Name: p1NameClean,
        player1Id: p1Clean,
        player2Name: isDoubles && doublesMode === 'with_partner' ? partnerName.trim() : undefined,
        player2Id: isDoubles && doublesMode === 'with_partner' ? partnerId.trim() : undefined,
        isPartial: isDoubles && doublesMode === 'partial'
      });

      setIsSubmitted(true);
      toast({
        title: 'Registration Successful! 🎉',
        description: isDoubles && doublesMode === 'with_partner'
          ? `Successfully registered team ${p1NameClean} & ${partnerName.trim()} for ${selectedEvent.name}.`
          : `Successfully registered ${p1NameClean} for ${selectedEvent.name}.`
      });
    } catch (err: any) {
      const msg = err?.message || 'Could not complete registration. Please try again.';
      setValidationError(msg);
      toast({
        title: 'Registration Blocked',
        description: msg,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && submittedData) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <Card className="text-center p-8 space-y-6 border-emerald-500/30 shadow-xl shadow-emerald-500/5 rounded-2xl">
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
                Your entry has been recorded for <strong className="text-foreground">{submittedData.eventName}</strong>.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl text-left space-y-2.5 text-xs border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event:</span>
                <span className="font-semibold">{submittedData.eventName} ({submittedData.eventType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold">{submittedData.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Player 1:</span>
                <span className="font-semibold">{submittedData.player1Name} ({submittedData.player1Id})</span>
              </div>
              {submittedData.eventType === 'Doubles' && (
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Doubles Team Status:</span>
                  {submittedData.isPartial ? (
                    <span className="text-amber-600 font-semibold">Partial Entry (Partner to be assigned)</span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">
                      Complete Team: {submittedData.player2Name} ({submittedData.player2Id})
                    </span>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full text-base font-bold py-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white"
              onClick={() => {
                setIsSubmitted(false);
                setEmployeeId('');
                setName('');
                setDepartment('');
                setLocation('');
                setPartnerId('');
                setPartnerName('');
                setPartnerDepartment('');
                setValidationError(null);
              }}
            >
              Register for Another Event
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
              <span>Tournament Registration</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-['Outfit'] tracking-tight">
              Event Registration Portal
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Select your event category and enter participant details. Registration adapts automatically for Singles and Doubles.
            </p>
          </div>

          <Card className="border border-sky-500/20 shadow-lg shadow-blue-500/5 rounded-2xl overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-bold font-['Outfit'] flex items-center justify-between">
                <span>Registration Form</span>
                {selectedEvent && (
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                    isDoubles ? "bg-purple-500/10 text-purple-600 border border-purple-500/30" : "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                  )}>
                    {selectedEvent.type} Event
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Fields marked with an asterisk (*) are required.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Category Selection */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="eventSelect" className="text-sm font-bold flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-sky-500" />
                      <span>Select Tournament Event *</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose the sport and category you want to participate in
                    </p>
                  </div>

                  {eventsList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {eventsList.map(event => {
                        const isSelected = selectedEventId === event.id;
                        return (
                          <div
                            key={event.id}
                            onClick={() => {
                              setSelectedEventId(event.id);
                              setValidationError(null);
                            }}
                            className={cn(
                              "p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between",
                              isSelected
                                ? "bg-sky-500/10 border-sky-500/60 shadow-xs ring-1 ring-sky-500/40"
                                : "hover:bg-muted/40 border-border"
                            )}
                            data-testid={`event-card-${event.id}`}
                          >
                            <div className="space-y-1">
                              <p className="font-semibold text-sm leading-tight text-foreground">{event.name}</p>
                              <p className="text-xs text-muted-foreground">{event.game}</p>
                            </div>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-md font-medium",
                              event.type === 'Doubles' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            )}>
                              {event.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground">
                      Loading available tournament events…
                    </div>
                  )}
                </div>

                {/* Common Location Selection */}
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="location" className="text-sm font-semibold">Office Location *</Label>
                  <Select value={location} onValueChange={(v) => setLocation(v as any)}>
                    <SelectTrigger id="location" className="rounded-xl" data-testid="select-location">
                      <SelectValue placeholder="Select your office location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Irrum Manzil">Irrum Manzil</SelectItem>
                      <SelectItem value="Hitech City">Hitech City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Player 1 Details */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-500" />
                    <h3 className="font-semibold text-base">
                      {isDoubles ? 'Player 1 (Primary Registrant)' : 'Player Details'}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId" className="text-sm font-semibold">Employee ID *</Label>
                      <Input
                        id="employeeId"
                        placeholder="e.g. EMP-1042"
                        value={employeeId}
                        onChange={(e) => {
                          setEmployeeId(e.target.value);
                          setValidationError(null);
                        }}
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

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-semibold">Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g. Engineering, Sales, Operations"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="rounded-xl"
                      data-testid="input-department"
                    />
                  </div>
                </div>

                {/* Doubles Specific Section */}
                <AnimatePresence>
                  {isDoubles && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-500" />
                          <h3 className="font-semibold text-base text-purple-600 dark:text-purple-400">
                            Doubles Partner Details
                          </h3>
                        </div>
                      </div>

                      {/* Partner Option Selector */}
                      <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Partnership Option
                        </Label>
                        <RadioGroup
                          value={doublesMode}
                          onValueChange={(v: any) => {
                            setDoublesMode(v);
                            setValidationError(null);
                          }}
                          className="flex flex-col sm:flex-row gap-3"
                        >
                          <label className={cn(
                            "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer flex-1 transition-all text-xs",
                            doublesMode === 'with_partner'
                              ? "bg-purple-500/10 border-purple-500/50 font-semibold text-foreground"
                              : "border-border hover:bg-muted/50 text-muted-foreground"
                          )}>
                            <RadioGroupItem value="with_partner" id="mode_with_partner" />
                            <span>I have a partner (Complete Team)</span>
                          </label>

                          <label className={cn(
                            "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer flex-1 transition-all text-xs",
                            doublesMode === 'partial'
                              ? "bg-purple-500/10 border-purple-500/50 font-semibold text-foreground"
                              : "border-border hover:bg-muted/50 text-muted-foreground"
                          )}>
                            <RadioGroupItem value="partial" id="mode_partial" />
                            <span>Register solo for now (Add partner later)</span>
                          </label>
                        </RadioGroup>
                      </div>

                      {doublesMode === 'with_partner' ? (
                        <div className="space-y-4 p-4 border border-purple-500/20 bg-purple-500/5 rounded-xl">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="partnerId" className="text-sm font-semibold">Partner Employee ID *</Label>
                              <Input
                                id="partnerId"
                                placeholder="e.g. EMP-1043"
                                value={partnerId}
                                onChange={(e) => {
                                  setPartnerId(e.target.value);
                                  setValidationError(null);
                                }}
                                required={doublesMode === 'with_partner'}
                                className="rounded-xl bg-background"
                                data-testid="input-partner-id"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="partnerName" className="text-sm font-semibold">Partner Full Name *</Label>
                              <Input
                                id="partnerName"
                                placeholder="e.g. Jordan Smith"
                                value={partnerName}
                                onChange={(e) => setPartnerName(e.target.value)}
                                required={doublesMode === 'with_partner'}
                                className="rounded-xl bg-background"
                                data-testid="input-partner-name"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="partnerDepartment" className="text-sm font-semibold">Partner Department</Label>
                            <Input
                              id="partnerDepartment"
                              placeholder="e.g. Marketing, QA"
                              value={partnerDepartment}
                              onChange={(e) => setPartnerDepartment(e.target.value)}
                              className="rounded-xl bg-background"
                              data-testid="input-partner-department"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                          <Info className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            You are submitting a partial Doubles registration. You will be able to assign or be paired with a partner before fixtures are drawn. Incomplete teams are excluded from fixture generation until completed.
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Validation Error Alert */}
                {validationError && (
                  <div className="p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full text-base font-bold py-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-lg shadow-blue-500/25 transition-all"
                  disabled={isSubmitting || !employeeId.trim() || !name.trim() || !location || !selectedEventId}
                  data-testid="button-submit-registration"
                >
                  {isSubmitting
                    ? 'Submitting Registration…'
                    : isDoubles
                      ? doublesMode === 'with_partner'
                        ? 'Register Doubles Team'
                        : 'Submit Partial Doubles Entry'
                      : 'Complete Singles Registration'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
