import React, { useState, useEffect, useMemo } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  fetchEvents,
  fetchRegistrations,
  registerBatch,
  type AppEvent,
  type AppRegistration
} from '@/lib/api';
import {
  CheckCircle2,
  Users,
  User,
  AlertCircle,
  Trophy,
  UserPlus,
  Square,
  CheckSquare,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type EventPartnerData = {
  mode: 'with_partner' | 'partial';
  partnerId: string;
  partnerName: string;
  partnerProject: string;
};

type SubmittedRegistrationDetail = {
  event: AppEvent;
  category: 'Singles' | 'Doubles';
  player1Name: string;
  player1Id: string;
  player1Project: string;
  player2Name?: string;
  player2Id?: string;
  player2Project?: string;
  isPartial?: boolean;
};

type SubmittedData = {
  location: string;
  category: 'Singles' | 'Doubles';
  registrations: SubmittedRegistrationDetail[];
};

export default function Register() {
  const { toast } = useToast();
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [existingRegs, setExistingRegs] = useState<AppRegistration[]>([]);

  // Registration Category: 'Singles' or 'Doubles'
  const [category, setCategory] = useState<'Singles' | 'Doubles'>('Singles');

  // Selected Event IDs (supports selecting multiple events)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Primary Player Details (Player 1)
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [project, setProject] = useState('');
  const [location, setLocation] = useState<'Irrum Manzil' | 'Hitech City' | ''>('');

  // Dynamic Partner Data per Doubles Event: Map of eventId -> EventPartnerData
  const [eventPartners, setEventPartners] = useState<Record<string, EventPartnerData>>({});

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<SubmittedData | null>(null);

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

  // Toggle selection for an event
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

  // Helper to get partner data for a specific event
  const getEventPartner = (eventId: string): EventPartnerData => {
    return eventPartners[eventId] || {
      mode: 'with_partner',
      partnerId: '',
      partnerName: '',
      partnerProject: '',
    };
  };

  // Helper to update a partner field for a specific event
  const setEventPartnerField = (eventId: string, field: keyof EventPartnerData, value: string) => {
    setValidationError(null);
    setEventPartners(prev => {
      const current = prev[eventId] || {
        mode: 'with_partner',
        partnerId: '',
        partnerName: '',
        partnerProject: '',
      };
      return {
        ...prev,
        [eventId]: {
          ...current,
          [field]: value
        }
      };
    });
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
      const partnersUsed = new Map<string, string>(); // partnerIdClean -> evName

      for (const evId of selectedEventIds) {
        const ev = eventsList.find(e => e.id === evId);
        const evName = ev?.name || 'this event';
        const partnerData = getEventPartner(evId);

        if (partnerData.mode === 'with_partner') {
          const p2 = partnerData.partnerId.trim();
          const p2Name = partnerData.partnerName.trim();

          if (!p2) {
            return `Please enter Partner Employee ID for ${evName}.`;
          }
          if (!p2.toLowerCase().startsWith('sg')) {
            return `Partner Employee ID for ${evName} must start with SG prefix (e.g. SG123, sg101).`;
          }
          if (!p2Name) {
            return `Please enter Partner Full Name for ${evName}.`;
          }
          if (p1.toLowerCase() === p2.toLowerCase()) {
            return `A player cannot be their own Doubles partner in ${evName}.`;
          }

          // Check if Player 1 is already in a team for this event
          const p1InEvent = existingRegs.find(
            r => r.eventId === evId && (
              r.employeeId.toLowerCase() === p1.toLowerCase() ||
              r.providedEmployeeId.toLowerCase() === p1.toLowerCase() ||
              (r.partnerId && r.partnerId.toLowerCase() === p1.toLowerCase())
            )
          );
          if (p1InEvent) {
            return `Player is already registered in a Doubles team for ${evName}.`;
          }

          // Check if Partner 2 is already in a team for this event
          const p2InEvent = existingRegs.find(
            r => r.eventId === evId && (
              r.employeeId.toLowerCase() === p2.toLowerCase() ||
              r.providedEmployeeId.toLowerCase() === p2.toLowerCase() ||
              (r.partnerId && r.partnerId.toLowerCase() === p2.toLowerCase())
            )
          );
          if (p2InEvent) {
            return `Partner (${p2}) is already registered in a Doubles team for ${evName}.`;
          }

          // Check normalized duplicate team in this event (A+B == B+A)
          const teamKey = [p1.toLowerCase(), p2.toLowerCase()].sort().join('___');
          const teamInEvent = existingRegs.some(
            r => r.eventId === evId && r.partnerId && [r.employeeId.toLowerCase(), r.partnerId.toLowerCase()].sort().join('___') === teamKey
          );
          if (teamInEvent) {
            return `This Doubles team is already registered for ${evName}.`;
          }

          // Check cross-event exact same team (different partners required across events)
          const teamInOtherEvent = existingRegs.some(
            r => r.eventId !== evId && r.partnerId && [r.employeeId.toLowerCase(), r.partnerId.toLowerCase()].sort().join('___') === teamKey
          );
          if (teamInOtherEvent) {
            return `A player must have a different partner in each Doubles event. You are already paired with ${p2Name || p2} in another event.`;
          }

          // Check if user selected the exact same partner for multiple events in the CURRENT submission
          const p2Key = p2.toLowerCase();
          if (partnersUsed.has(p2Key)) {
            return `A player must have a different partner in each Doubles event. You selected ${p2Name || p2} for both ${partnersUsed.get(p2Key)} and ${evName}.`;
          }
          partnersUsed.set(p2Key, evName);
        } else {
          // Partial Doubles across selected events
          const p1InEvent = existingRegs.find(
            r => r.eventId === evId && (
              r.employeeId.toLowerCase() === p1.toLowerCase() ||
              r.providedEmployeeId.toLowerCase() === p1.toLowerCase() ||
              (r.partnerId && r.partnerId.toLowerCase() === p1.toLowerCase())
            )
          );
          if (p1InEvent) {
            return `Player is already registered for ${evName}.`;
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
    const submittedDetails: SubmittedRegistrationDetail[] = [];

    for (const evId of selectedEventIds) {
      const ev = eventsList.find(e => e.id === evId);
      if (!ev) continue;
      const tournId = ev.tournamentId || 'T001';

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

        submittedDetails.push({
          event: ev,
          category: 'Singles',
          player1Name: p1NameClean,
          player1Id: p1Clean,
          player1Project: p1ProjectClean
        });
      } else {
        const partnerData = getEventPartner(evId);
        if (partnerData.mode === 'with_partner') {
          const p2Clean = partnerData.partnerId.trim();
          const p2NameClean = partnerData.partnerName.trim();
          const p2ProjectClean = partnerData.partnerProject.trim() || p1ProjectClean;

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

          submittedDetails.push({
            event: ev,
            category: 'Doubles',
            player1Name: p1NameClean,
            player1Id: p1Clean,
            player1Project: p1ProjectClean,
            player2Name: p2NameClean,
            player2Id: p2Clean,
            player2Project: p2ProjectClean,
            isPartial: false
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

          submittedDetails.push({
            event: ev,
            category: 'Doubles',
            player1Name: p1NameClean,
            player1Id: p1Clean,
            player1Project: p1ProjectClean,
            isPartial: true
          });
        }
      }
    }

    try {
      const res = await registerBatch(payloads);

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
      setSubmittedData({
        location,
        category,
        registrations: submittedDetails
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
    setEventPartners({});
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
                      You are successfully registered for {submittedData.registrations.length} tournament event{submittedData.registrations.length > 1 ? 's' : ''}.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-2 pb-8 px-6">
                    {/* Registered Events Breakdown */}
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Registered Events Breakdown ({submittedData.registrations.length})
                      </Label>
                      <div className="space-y-2.5">
                        {submittedData.registrations.map((reg, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-muted/40 border space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-sky-500" />
                                <span className="font-bold text-sm text-foreground">{reg.event.name}</span>
                                <span className="text-xs text-muted-foreground">({reg.event.game})</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-2xs font-bold",
                                  reg.category === 'Doubles'
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                    : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                )}
                              >
                                {reg.category}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1.5 border-t border-border/50">
                              <div>
                                <span className="text-muted-foreground block text-2xs">Player 1</span>
                                <span className="font-semibold">{reg.player1Name}</span>
                                <span className="text-muted-foreground font-mono ml-1">({reg.player1Id})</span>
                                <span className="text-muted-foreground block text-2xs">{reg.player1Project} • {submittedData.location}</span>
                              </div>

                              {reg.category === 'Doubles' && (
                                <div>
                                  {reg.isPartial ? (
                                    <div className="text-amber-600 dark:text-amber-400 text-2xs font-medium pt-1">
                                      <span>Solo entry (Partner can be assigned later)</span>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground block text-2xs">Partner (Player 2)</span>
                                      <span className="font-semibold text-purple-600 dark:text-purple-400">{reg.player2Name}</span>
                                      <span className="text-muted-foreground font-mono ml-1">({reg.player2Id})</span>
                                      <span className="text-muted-foreground block text-2xs">{reg.player2Project || reg.player1Project}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        onClick={handleRegisterAnother}
                        variant="outline"
                        className="flex-1 rounded-xl text-sm font-semibold py-5 cursor-pointer"
                      >
                        Register For More Events
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/fixtures'}
                        className="flex-1 rounded-xl text-sm font-bold py-5 bg-gradient-to-r from-blue-600 to-sky-500 text-white cursor-pointer"
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

                      {/* Step 5: Doubles Specific Partner Section - Dynamic Per Event */}
                      <AnimatePresence>
                        {category === 'Doubles' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pt-4 border-t"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-500" />
                                <div>
                                  <h3 className="font-semibold text-base text-purple-600 dark:text-purple-400">
                                    Doubles Partner Selection (Per Event)
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    Every selected doubles event gets its own dedicated partner field.
                                  </p>
                                </div>
                              </div>
                              {selectedEventIds.length > 0 && (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs">
                                  {selectedEventIds.length} Event{selectedEventIds.length !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>

                            {selectedEventIds.length === 0 ? (
                              <div className="p-6 border border-dashed rounded-xl text-center text-xs text-muted-foreground bg-muted/20">
                                Please select one or more Doubles events in Step 2 above to configure partners.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {selectedEventIds.map((evId, idx) => {
                                  const ev = eventsList.find(e => e.id === evId);
                                  const pData = getEventPartner(evId);
                                  const evName = ev?.name || `Doubles Event #${idx + 1}`;

                                  return (
                                    <div
                                      key={evId}
                                      className="p-4 border border-purple-500/25 bg-purple-500/5 dark:bg-purple-950/15 rounded-xl space-y-4 transition-all shadow-xs"
                                      data-testid={`partner-section-${evId}`}
                                    >
                                      {/* Event Header Banner */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-500/20">
                                        <div className="flex items-center gap-2">
                                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold">
                                            {idx + 1}
                                          </span>
                                          <span className="font-bold text-sm text-foreground">{evName}</span>
                                          <span className="text-xs text-muted-foreground">({ev?.game})</span>
                                        </div>
                                        <Badge variant="secondary" className="text-2xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                                          Partner for {evName}
                                        </Badge>
                                      </div>

                                      {/* Partnership Mode Selector for this Event */}
                                      <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          Partnership Option
                                        </Label>
                                        <RadioGroup
                                          value={pData.mode}
                                          onValueChange={(v: any) => setEventPartnerField(evId, 'mode', v)}
                                          className="flex flex-col sm:flex-row gap-2.5"
                                        >
                                          <label className={cn(
                                            "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer flex-1 transition-all text-xs",
                                            pData.mode === 'with_partner'
                                              ? "bg-purple-500/15 border-purple-500 font-semibold text-foreground ring-1 ring-purple-500/30"
                                              : "border-border hover:bg-muted/50 text-muted-foreground bg-card"
                                          )}>
                                            <RadioGroupItem value="with_partner" id={`mode_partner_${evId}`} />
                                            <span>I have a partner (Complete Team)</span>
                                          </label>

                                          <label className={cn(
                                            "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer flex-1 transition-all text-xs",
                                            pData.mode === 'partial'
                                              ? "bg-purple-500/15 border-purple-500 font-semibold text-foreground ring-1 ring-purple-500/30"
                                              : "border-border hover:bg-muted/50 text-muted-foreground bg-card"
                                          )}>
                                            <RadioGroupItem value="partial" id={`mode_partial_${evId}`} />
                                            <span>Register solo for now (Add partner later)</span>
                                          </label>
                                        </RadioGroup>
                                      </div>

                                      {/* Partner Input Fields */}
                                      {pData.mode === 'with_partner' ? (
                                        <div className="space-y-3 pt-2">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                              <Label htmlFor={`partnerId_${evId}`} className="text-xs font-semibold flex items-center justify-between">
                                                <span>Partner Employee ID *</span>
                                                <span className="text-2xs text-muted-foreground font-mono">Must start with SG</span>
                                              </Label>
                                              <Input
                                                id={`partnerId_${evId}`}
                                                placeholder="e.g. SG-1043, sg456"
                                                value={pData.partnerId}
                                                onChange={(e) => setEventPartnerField(evId, 'partnerId', e.target.value)}
                                                required={pData.mode === 'with_partner'}
                                                className="rounded-xl bg-background text-sm h-9"
                                                data-testid={`input-partner-id-${evId}`}
                                              />
                                            </div>

                                            <div className="space-y-1.5">
                                              <Label htmlFor={`partnerName_${evId}`} className="text-xs font-semibold">
                                                Partner Full Name *
                                              </Label>
                                              <Input
                                                id={`partnerName_${evId}`}
                                                placeholder="e.g. Jordan Smith"
                                                value={pData.partnerName}
                                                onChange={(e) => setEventPartnerField(evId, 'partnerName', e.target.value)}
                                                required={pData.mode === 'with_partner'}
                                                className="rounded-xl bg-background text-sm h-9"
                                                data-testid={`input-partner-name-${evId}`}
                                              />
                                            </div>
                                          </div>

                                          <div className="space-y-1.5">
                                            <Label htmlFor={`partnerProject_${evId}`} className="text-xs font-semibold">
                                              Partner Project
                                            </Label>
                                            <Input
                                              id={`partnerProject_${evId}`}
                                              placeholder="e.g. Core Engineering, Digital Platform"
                                              value={pData.partnerProject}
                                              onChange={(e) => setEventPartnerField(evId, 'partnerProject', e.target.value)}
                                              className="rounded-xl bg-background text-sm h-9"
                                              data-testid={`input-partner-project-${evId}`}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                                          <Info className="h-4 w-4 shrink-0 text-amber-600" />
                                          <span>Solo entry for {evName}. Admin can pair you with a partner before tournament draws.</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Error Banner */}
                      {validationError && (
                        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm font-medium flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <span>{validationError}</span>
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || selectedEventIds.length === 0}
                        className={cn(
                          "w-full rounded-xl text-base font-bold py-6 shadow-md transition-all cursor-pointer text-white",
                          category === 'Doubles'
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25"
                            : "bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 shadow-sky-500/25"
                        )}
                        data-testid="button-submit-registration"
                      >
                        {isSubmitting
                          ? 'Submitting Registrations…'
                          : `Complete Registration for ${selectedEventIds.length} Event${selectedEventIds.length !== 1 ? 's' : ''}`}
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
