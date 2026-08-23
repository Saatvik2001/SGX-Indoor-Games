import { useState, useEffect, useMemo } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy,
  CheckCircle2,
  UserPlus,
  Users,
  User,
  AlertCircle,
  Info,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEvents, fetchRegistrations, apiUrl, type AppEvent, type AppRegistration } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Register() {
  const { toast } = useToast();
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [existingRegs, setExistingRegs] = useState<AppRegistration[]>([]);

  // Category Selection: 'Singles' or 'Doubles'
  const [category, setCategory] = useState<'Singles' | 'Doubles'>('Singles');
  // Multiple selected event IDs
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Primary Player (Player 1)
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [project, setProject] = useState('');
  const [location, setLocation] = useState<'Irrum Manzil' | 'Hitech City' | ''>('');

  // Partner (Player 2 - for Doubles)
  const [doublesMode, setDoublesMode] = useState<'with_partner' | 'partial'>('with_partner');
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerProject, setPartnerProject] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    events: AppEvent[];
    category: 'Singles' | 'Doubles';
    location: string;
    player1Name: string;
    player1Id: string;
    player1Project: string;
    player2Name?: string;
    player2Id?: string;
    player2Project?: string;
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

      // Auto-select first single event by default if available
      const initialSingle = events.find(e => e.type !== 'Doubles');
      if (initialSingle) {
        setSelectedEventIds([initialSingle.id]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filter events based on selected category (Singles vs Doubles)
  const availableEvents = useMemo(() => {
    if (category === 'Singles') {
      return eventsList.filter(e => e.type !== 'Doubles');
    } else {
      return eventsList.filter(e => e.type === 'Doubles');
    }
  }, [eventsList, category]);

  // When category changes, reset selected events to default first event in that category
  const handleCategoryChange = (newCategory: 'Singles' | 'Doubles') => {
    setCategory(newCategory);
    setValidationError(null);
    const matching = eventsList.filter(e => newCategory === 'Doubles' ? e.type === 'Doubles' : e.type !== 'Doubles');
    if (matching.length > 0) {
      setSelectedEventIds([matching[0].id]);
    } else {
      setSelectedEventIds([]);
    }
  };

  // Toggle selection for a single event in multiple event list
  const toggleEventSelection = (eventId: string) => {
    setValidationError(null);
    setSelectedEventIds(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId);
      } else {
        return [...prev, eventId];
      }
    });
  };

  const selectAllEvents = () => {
    setSelectedEventIds(availableEvents.map(e => e.id));
  };

  const clearAllEvents = () => {
    setSelectedEventIds([]);
  };

  // Real-time client validation helper
  const validateForm = (): string | null => {
    if (selectedEventIds.length === 0) {
      return `Please select at least one ${category} event to register.`;
    }

    const p1 = employeeId.trim();
    if (!p1) return 'Employee ID is required.';

    // Case-insensitive SG prefix check (e.g. SG, Sg, sG, sg)
    if (!p1.toLowerCase().startsWith('sg')) {
      return 'Employee ID must start with SG prefix (e.g. SG123, sg101).';
    }

    if (!name.trim()) return 'Player Full Name is required.';
    if (!location) return 'Please select an office location.';

    if (category === 'Singles') {
      // Singles Validation across all selected events
      for (const evId of selectedEventIds) {
        const ev = eventsList.find(e => e.id === evId);
        const evName = ev?.name || 'the event';
        const alreadyInEvent = existingRegs.find(
          r => r.eventId === evId && (
            r.employeeId.toLowerCase() === p1.toLowerCase() ||
            r.providedEmployeeId.toLowerCase() === p1.toLowerCase()
          )
        );
        if (alreadyInEvent) {
          return `This player is already registered for ${evName}.`;
        }
      }
    } else {
      // Doubles Validation across all selected events
      if (doublesMode === 'with_partner') {
        const p2 = partnerId.trim();
        if (!p2 || !partnerName.trim()) {
          return 'Please enter partner details to complete the Doubles registration.';
        }
        if (!p2.toLowerCase().startsWith('sg')) {
          return 'Partner Employee ID must start with SG prefix (e.g. SG123, sg101).';
        }
        if (p1.toLowerCase() === p2.toLowerCase()) {
          return 'A player cannot be their own Doubles partner.';
        }

        for (const evId of selectedEventIds) {
          const ev = eventsList.find(e => e.id === evId);
          const evName = ev?.name || 'this event';

          // Check if Player 1 is already in a team for this event
          const p1InEvent = existingRegs.find(
            r => r.eventId === evId && (
              r.employeeId.toLowerCase() === p1.toLowerCase() ||
              r.providedEmployeeId.toLowerCase() === p1.toLowerCase() ||
              (r.partnerId && r.partnerId.toLowerCase() === p1.toLowerCase())
            )
          );
          if (p1InEvent) {
            return `This player is already part of another Doubles team for ${evName}.`;
          }

          // Check if Player 2 is already in a team for this event
          const p2InEvent = existingRegs.find(
            r => r.eventId === evId && (
              r.employeeId.toLowerCase() === p2.toLowerCase() ||
              r.providedEmployeeId.toLowerCase() === p2.toLowerCase() ||
              (r.partnerId && r.partnerId.toLowerCase() === p2.toLowerCase())
            )
          );
          if (p2InEvent) {
            return `Partner (${p2}) is already part of another Doubles team for ${evName}.`;
          }

          // Check normalized duplicate team
          const teamKey = [p1.toLowerCase(), p2.toLowerCase()].sort().join('___');
          const teamInEvent = existingRegs.some(
            r => r.eventId === evId && r.partnerId && [r.employeeId.toLowerCase(), r.partnerId.toLowerCase()].sort().join('___') === teamKey
          );
          if (teamInEvent) {
            return `This Doubles team is already registered for ${evName}.`;
          }
        }
      } else {
        // Partial Doubles across selected events
        for (const evId of selectedEventIds) {
          const ev = eventsList.find(e => e.id === evId);
          const evName = ev?.name || 'this event';
          const p1InEvent = existingRegs.find(
            r => r.eventId === evId && (
              r.employeeId.toLowerCase() === p1.toLowerCase() ||
              r.providedEmployeeId.toLowerCase() === p1.toLowerCase() ||
              (r.partnerId && r.partnerId.toLowerCase() === p1.toLowerCase())
            )
          );
          if (p1InEvent) {
            return `This player is already registered for ${evName}.`;
          }
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

    if (selectedEventIds.length === 0) return;

    setIsSubmitting(true);
    const p1Clean = employeeId.trim();
    const p1NameClean = name.trim();
    const p1ProjectClean = project.trim() || 'General';

    // Build payload array for all selected events
    const payloads: Record<string, unknown>[] = [];

    for (const evId of selectedEventIds) {
      const ev = eventsList.find(e => e.id === evId);
      const tournId = ev?.tournamentId || 'T001';

      if (category === 'Singles') {
        payloads.push({
          employeeId: p1Clean,
          providedEmployeeId: p1Clean,
          employeeName: p1NameClean,
          project: p1ProjectClean,
          department: p1ProjectClean,
          tournamentId: tournId,
          eventId: evId,
          eventType: 'Singles',
          partnerId: null,
          location,
          registrationDate: new Date().toISOString()
        });
      } else {
        if (doublesMode === 'with_partner') {
          const p2Clean = partnerId.trim();
          const p2NameClean = partnerName.trim();
          const p2ProjectClean = partnerProject.trim() || p1ProjectClean;

          payloads.push({
            employeeId: p1Clean,
            providedEmployeeId: p1Clean,
            employeeName: p1NameClean,
            project: p1ProjectClean,
            department: p1ProjectClean,
            tournamentId: tournId,
            eventId: evId,
            eventType: 'Doubles',
            partnerId: p2Clean,
            partnerName: p2NameClean,
            partnerProject: p2ProjectClean,
            partnerDepartment: p2ProjectClean,
            location,
            registrationDate: new Date().toISOString()
          });
        } else {
          payloads.push({
            employeeId: p1Clean,
            providedEmployeeId: p1Clean,
            employeeName: p1NameClean,
            project: p1ProjectClean,
            department: p1ProjectClean,
            tournamentId: tournId,
            eventId: evId,
            eventType: 'Doubles',
            partnerId: null,
            location,
            registrationDate: new Date().toISOString()
          });
        }
      }
    }

    try {
      const res = await fetch(apiUrl('/api/registrations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrations: payloads })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || 'Failed to submit registration.';
        setValidationError(errorMsg);
        toast({
          title: 'Registration Rejected',
          description: errorMsg,
          variant: 'destructive'
        });
        return;
      }

      // Success!
      const selectedEventsObjects = eventsList.filter(e => selectedEventIds.includes(e.id));
      setSubmittedData({
        events: selectedEventsObjects,
        category,
        location,
        player1Name: p1NameClean,
        player1Id: p1Clean,
        player1Project: p1ProjectClean,
        player2Name: doublesMode === 'with_partner' ? partnerName.trim() : undefined,
        player2Id: doublesMode === 'with_partner' ? partnerId.trim() : undefined,
        player2Project: doublesMode === 'with_partner' ? (partnerProject.trim() || p1ProjectClean) : undefined,
        isPartial: category === 'Doubles' && doublesMode === 'partial'
      });
      setIsSubmitted(true);

      // Refresh existing registrations list
      fetchRegistrations().then(setExistingRegs).catch(() => {});

      toast({
        title: 'Registration Confirmed! 🎉',
        description: `Successfully registered for ${selectedEventIds.length} event${selectedEventIds.length > 1 ? 's' : ''}.`
      });
    } catch {
      setValidationError('Network error. Please verify your connection and try again.');
      toast({
        title: 'Network Error',
        description: 'Failed to submit registration.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setIsSubmitted(false);
    setSubmittedData(null);
    setEmployeeId('');
    setName('');
    setProject('');
    setPartnerId('');
    setPartnerName('');
    setPartnerProject('');
    setValidationError(null);
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-blue-500/10 border border-sky-500/25 text-xs font-bold text-sky-700 dark:text-sky-300 shadow-xs">
              <UserPlus className="h-3.5 w-3.5 text-sky-500" />
              <span>Solugenix Games 2026</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight font-['Outfit']">
              Tournament Event Registration
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Select your category, choose one or multiple events, and complete your tournament entry.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isSubmitted && submittedData ? (
              /* Success Screen */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="max-w-2xl mx-auto"
              >
                <Card className="border-sky-500/30 bg-card shadow-xl overflow-hidden rounded-2xl">
                  <div className="h-2 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />
                  <CardHeader className="text-center pb-4 pt-8">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold font-['Outfit']">
                      Registration Confirmed!
                    </CardTitle>
                    <CardDescription className="text-sm">
                      You are successfully registered for {submittedData.events.length} tournament event{submittedData.events.length > 1 ? 's' : ''}.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-2 pb-8 px-6">
                    {/* Registered Events List */}
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Registered Events ({submittedData.events.length})
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {submittedData.events.map(ev => (
                          <div key={ev.id} className="p-3 rounded-xl bg-muted/40 border flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{ev.name}</p>
                              <p className="text-xs text-muted-foreground">{ev.game}</p>
                            </div>
                            <Badge variant="outline" className="text-2xs font-bold text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10">
                              {submittedData.category}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Participant Details Summary */}
                    <div className="p-4 rounded-xl bg-muted/30 border space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b">
                        <div>
                          <span className="text-xs text-muted-foreground block">Player 1</span>
                          <span className="font-bold text-foreground">{submittedData.player1Name}</span>
                          <span className="text-xs text-muted-foreground block font-mono">{submittedData.player1Id}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Project & Location</span>
                          <span className="font-semibold text-foreground">{submittedData.player1Project}</span>
                          <span className="text-xs text-muted-foreground block">{submittedData.location}</span>
                        </div>
                      </div>

                      {submittedData.category === 'Doubles' && (
                        <div>
                          {submittedData.isPartial ? (
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs">
                              <Info className="h-4 w-4 shrink-0" />
                              <span>Solo / Partial entry. Partner can be assigned before tournament draws.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs text-muted-foreground block">Partner (Player 2)</span>
                                <span className="font-bold text-foreground">{submittedData.player2Name}</span>
                                <span className="text-xs text-muted-foreground block font-mono">{submittedData.player2Id}</span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block">Partner Project</span>
                                <span className="font-semibold text-foreground">{submittedData.player2Project}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        onClick={handleRegisterAnother}
                        variant="outline"
                        className="flex-1 rounded-xl text-sm font-semibold py-5"
                      >
                        Register For More Events
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/fixtures'}
                        className="flex-1 rounded-xl text-sm font-bold py-5 bg-gradient-to-r from-blue-600 to-sky-500 text-white"
                      >
                        View Fixtures & Brackets
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Registration Form */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-border/80 shadow-lg backdrop-blur-sm bg-card/90 rounded-2xl overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-sky-500" />
                      Player & Event Details
                    </CardTitle>
                    <CardDescription>
                      Choose between Singles or Doubles, pick your events, and enter participant details.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 pt-2">
                    <form onSubmit={handleSubmit} className="space-y-6">

                      {/* Step 1: Category Selection (Singles vs Doubles) */}
                      <div className="space-y-3">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>1. Select Category *</span>
                          <span className="text-xs font-normal normal-case text-muted-foreground">
                            Single or Double events
                          </span>
                        </Label>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleCategoryChange('Singles')}
                            className={cn(
                              "p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center",
                              category === 'Singles'
                                ? "bg-sky-500/15 border-sky-500 text-foreground shadow-xs ring-2 ring-sky-500/30 font-bold"
                                : "bg-card hover:bg-muted/40 text-muted-foreground border-border"
                            )}
                            data-testid="category-singles"
                          >
                            <User className={cn("h-6 w-6", category === 'Singles' ? "text-sky-500" : "text-muted-foreground")} />
                            <div>
                              <div className="text-sm font-bold">Singles</div>
                              <div className="text-2xs text-muted-foreground">Individual 1-Player Events</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCategoryChange('Doubles')}
                            className={cn(
                              "p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center",
                              category === 'Doubles'
                                ? "bg-purple-500/15 border-purple-500 text-foreground shadow-xs ring-2 ring-purple-500/30 font-bold"
                                : "bg-card hover:bg-muted/40 text-muted-foreground border-border"
                            )}
                            data-testid="category-doubles"
                          >
                            <Users className={cn("h-6 w-6", category === 'Doubles' ? "text-purple-500" : "text-muted-foreground")} />
                            <div>
                              <div className="text-sm font-bold">Doubles</div>
                              <div className="text-2xs text-muted-foreground">2-Player Team Events</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Step 2: Multiple Event Selection */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            2. Choose {category} Events *
                          </Label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={selectAllEvents}
                              className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-muted-foreground text-xs">•</span>
                            <button
                              type="button"
                              onClick={clearAllEvents}
                              className="text-xs text-muted-foreground font-semibold hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {availableEvents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {availableEvents.map((ev) => {
                              const isSelected = selectedEventIds.includes(ev.id);
                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => toggleEventSelection(ev.id)}
                                  className={cn(
                                    "p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between select-none",
                                    isSelected
                                      ? category === 'Doubles'
                                        ? "bg-purple-500/10 border-purple-500/60 shadow-xs ring-1 ring-purple-500/40"
                                        : "bg-sky-500/10 border-sky-500/60 shadow-xs ring-1 ring-sky-500/40"
                                      : "hover:bg-muted/40 border-border bg-card"
                                  )}
                                  data-testid={`event-card-${ev.id}`}
                                >
                                  <div className="flex items-center gap-3">
                                    {isSelected ? (
                                      <CheckSquare className={cn("h-5 w-5 shrink-0", category === 'Doubles' ? "text-purple-500" : "text-sky-500")} />
                                    ) : (
                                      <Square className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="space-y-0.5">
                                      <p className="font-semibold text-sm leading-tight text-foreground">{ev.name}</p>
                                      <p className="text-xs text-muted-foreground">{ev.game}</p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-2xs font-bold",
                                      category === 'Doubles'
                                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                    )}
                                  >
                                    {ev.type}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-6 border rounded-xl text-center text-xs text-muted-foreground bg-muted/20">
                            No {category} events currently available for registration.
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>
                            {selectedEventIds.length === 0
                              ? "No events selected yet."
                              : `${selectedEventIds.length} event${selectedEventIds.length > 1 ? 's' : ''} selected.`}
                          </span>
                          <span className="text-2xs text-muted-foreground italic">
                            You can register for multiple {category.toLowerCase()} events simultaneously
                          </span>
                        </div>
                      </div>

                      {/* Step 3: Office Location Selection */}
                      <div className="space-y-2 pt-4 border-t">
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

                      {/* Step 4: Primary Player Details */}
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-sky-500" />
                          <h3 className="font-semibold text-base">
                            {category === 'Doubles' ? 'Player 1 (Primary Registrant)' : 'Player Details'}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="employeeId" className="text-sm font-semibold flex items-center justify-between">
                              <span>Employee ID *</span>
                              <span className="text-2xs text-muted-foreground font-mono">Must start with SG</span>
                            </Label>
                            <Input
                              id="employeeId"
                              placeholder="e.g. SG-1042, sg123"
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
                          <Label htmlFor="project" className="text-sm font-semibold">Project</Label>
                          <Input
                            id="project"
                            placeholder="e.g. Core Engineering, Digital Platform, UI/UX"
                            value={project}
                            onChange={(e) => setProject(e.target.value)}
                            className="rounded-xl"
                            data-testid="input-project"
                          />
                        </div>
                      </div>

                      {/* Step 5: Doubles Specific Partner Section */}
                      <AnimatePresence>
                        {category === 'Doubles' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pt-4 border-t"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-500" />
                              <h3 className="font-semibold text-base text-purple-600 dark:text-purple-400">
                                Doubles Partner Details
                              </h3>
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
                                    : "border-border hover:bg-muted/50 text-muted-foreground bg-card"
                                )}>
                                  <RadioGroupItem value="with_partner" id="mode_with_partner" />
                                  <span>I have a partner (Complete Team)</span>
                                </label>

                                <label className={cn(
                                  "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer flex-1 transition-all text-xs",
                                  doublesMode === 'partial'
                                    ? "bg-purple-500/10 border-purple-500/50 font-semibold text-foreground"
                                    : "border-border hover:bg-muted/50 text-muted-foreground bg-card"
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
                                    <Label htmlFor="partnerId" className="text-sm font-semibold flex items-center justify-between">
                                      <span>Partner Employee ID *</span>
                                      <span className="text-2xs text-muted-foreground font-mono">Must start with SG</span>
                                    </Label>
                                    <Input
                                      id="partnerId"
                                      placeholder="e.g. SG-1043, sg456"
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
                                  <Label htmlFor="partnerProject" className="text-sm font-semibold">Partner Project</Label>
                                  <Input
                                    id="partnerProject"
                                    placeholder="e.g. Marketing, QA, Product"
                                    value={partnerProject}
                                    onChange={(e) => setPartnerProject(e.target.value)}
                                    className="rounded-xl bg-background"
                                    data-testid="input-partner-project"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>
                                  You are submitting a partial Doubles registration. You will be able to assign or be paired with a partner before fixtures are drawn.
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

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full text-base font-bold py-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-lg shadow-blue-500/25 transition-all"
                        disabled={
                          isSubmitting ||
                          selectedEventIds.length === 0 ||
                          !employeeId.trim() ||
                          !name.trim() ||
                          !location
                        }
                        data-testid="button-submit-registration"
                      >
                        {isSubmitting
                          ? 'Submitting Registration…'
                          : selectedEventIds.length > 1
                            ? `Submit ${selectedEventIds.length} Event Registrations`
                            : category === 'Doubles'
                              ? doublesMode === 'with_partner'
                                ? 'Register Doubles Team'
                                : 'Submit Partial Doubles Entry'
                              : 'Complete Singles Registration'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PublicLayout>
  );
}
