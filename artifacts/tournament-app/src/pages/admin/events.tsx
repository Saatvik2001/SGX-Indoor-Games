import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Gamepad2,
  Plus,
  Users,
  Trash2,
  Edit,
  MapPin,
  Sparkles,
  Trophy,
  Copy,
  Network
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  fetchEvents,
  fetchTournaments,
  fetchRegistrations,
  apiUrl,
  type AppEvent,
  type AppTournament,
  type AppRegistration
} from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Events() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tournamentList, setTournamentList] = useState<AppTournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('All');
  const [eventList, setEventList] = useState<AppEvent[]>([]);
  const [regs, setRegs] = useState<AppRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeLocationFilter, setActiveLocationFilter] = useState<'All' | 'Irrum Manzil' | 'Hitech City' | string>('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formTournamentId, setFormTournamentId] = useState<string>('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Singles' | 'Doubles'>('Singles');
  const [formGame, setFormGame] = useState('Table Tennis');
  const [formLocation, setFormLocation] = useState<'Irrum Manzil' | 'Hitech City' | 'All Locations' | string>('Irrum Manzil');
  const [formFormat, setFormFormat] = useState<'Single Elimination' | 'Round Robin' | 'Double Round Robin'>('Single Elimination');
  const [createForBothLocations, setCreateForBothLocations] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, regsData, tournsData] = await Promise.all([
        fetchEvents(),
        fetchRegistrations(),
        fetchTournaments()
      ]);
      setEventList(eventsData);
      setRegs(regsData);
      setTournamentList(tournsData);

      const params = new URLSearchParams(window.location.search);
      const tournParam = params.get('tournament');
      if (tournParam && tournsData.some(t => t.id === tournParam)) {
        setSelectedTournamentId(tournParam);
      } else if (tournsData.length > 0 && selectedTournamentId === 'All') {
        setSelectedTournamentId('All');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setFormTournamentId(selectedTournamentId !== 'All' ? selectedTournamentId : (tournamentList[0]?.id || 'T001'));
    setFormName('Badminton Singles');
    setFormType('Singles');
    setFormGame('Badminton');
    setFormLocation('Irrum Manzil');
    setFormFormat('Single Elimination');
    setCreateForBothLocations(false);
    setShowModal(true);
  };

  const handleOpenEdit = (event: AppEvent) => {
    setModalMode('edit');
    setEditingId(event.id);
    setFormTournamentId(event.tournamentId || (tournamentList[0]?.id || 'T001'));
    setFormName(event.name);
    setFormType(event.type || 'Singles');
    setFormGame(event.game || 'Table Tennis');
    const evLoc = (event.meta?.location as string) || (event.name.includes('Hitech City') ? 'Hitech City' : event.name.includes('Irrum Manzil') ? 'Irrum Manzil' : (event.name.includes('Bangalore') ? 'Hitech City' : event.name.includes('Hyderabad') ? 'Irrum Manzil' : 'All Locations'));
    setFormLocation(evLoc);
    setFormFormat((event.format as any) || (event.meta?.format as any) || 'Single Elimination');
    setCreateForBothLocations(false);
    setShowModal(true);
  };

  const handleSaveEvent = async () => {
    if (!formName.trim()) {
      toast({ title: 'Missing Name', description: 'Please enter an event category name.' });
      return;
    }

    const effectiveTournamentId = formTournamentId || (tournamentList[0]?.id || 'T001');

    setSaving(true);
    try {
      if (modalMode === 'create') {
        if (createForBothLocations) {
          // Create two separate categories for the two locations
          const loc1 = 'Irrum Manzil';
          const loc2 = 'Hitech City';
          const baseName = formName.trim().replace(/\s*-\s*(Irrum Manzil|Hitech City|Hyderabad|Bangalore)/i, '');

          const p1 = {
            id: `EV-${Date.now().toString(36)}-IRM`,
            tournamentId: effectiveTournamentId,
            name: `${baseName} - ${loc1}`,
            type: formType,
            game: formGame.trim(),
            meta: { location: loc1, format: formFormat }
          };

          const p2 = {
            id: `EV-${(Date.now() + 1).toString(36)}-HTC`,
            tournamentId: effectiveTournamentId,
            name: `${baseName} - ${loc2}`,
            type: formType,
            game: formGame.trim(),
            meta: { location: loc2, format: formFormat }
          };

          await Promise.all([
            fetch(apiUrl('/api/events'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p1)
            }),
            fetch(apiUrl('/api/events'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p2)
            })
          ]);

          toast({
            title: 'Two Categories Created! 🏆',
            description: `Generated separate events for ${loc1} and ${loc2}.`
          });
        } else {
          // Single category
          const id = `EV-${Date.now().toString(36)}`;
          const payload = {
            id,
            tournamentId: effectiveTournamentId,
            name: formName.trim(),
            type: formType,
            game: formGame.trim(),
            meta: { location: formLocation, format: formFormat }
          };

          const res = await fetch(apiUrl('/api/events'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error('Failed to create event');
          toast({ title: 'Event Created! 🎉', description: `Created ${formName}.` });
        }

        setShowModal(false);
        await loadData();
      } else {
        // Edit Mode
        const payload = {
          name: formName.trim(),
          type: formType,
          game: formGame.trim(),
          meta: { location: formLocation, format: formFormat }
        };

        const res = await fetch(apiUrl(`/api/events/${editingId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to update event');
        toast({ title: 'Event Updated! ✅', description: `Updated ${formName}.` });
        setShowModal(false);
        await loadData();
      }
    } catch {
      toast({ title: 'Error', description: 'Network error saving event category.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (event: AppEvent) => {
    if (!window.confirm(`Delete event "${event.name}" and all its fixtures & registrations?`)) return;

    try {
      const res = await fetch(apiUrl(`/api/events/${event.id}`), { method: 'DELETE' });
      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to delete event.' });
        return;
      }

      toast({ title: 'Event Deleted', description: `Deleted ${event.name}.` });
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Network error deleting event.' });
    }
  };

  // Helper to extract location for an event
  const getEventLocation = (event: AppEvent) => {
    if (event.meta?.location) {
      const l = String(event.meta.location);
      if (l === 'Hyderabad') return 'Irrum Manzil';
      if (l === 'Bangalore') return 'Hitech City';
      return l;
    }
    if (event.name.includes('Hitech City') || event.name.includes('Bangalore')) return 'Hitech City';
    if (event.name.includes('Irrum Manzil') || event.name.includes('Hyderabad')) return 'Irrum Manzil';
    return 'All Locations';
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    let list = eventList;
    if (selectedTournamentId !== 'All') {
      list = list.filter(ev => ev.tournamentId === selectedTournamentId);
    }
    if (activeLocationFilter !== 'All') {
      list = list.filter(ev => {
        const loc = getEventLocation(ev);
        return loc === activeLocationFilter || loc === 'All Locations';
      });
    }
    return list;
  }, [eventList, selectedTournamentId, activeLocationFilter]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-['Outfit'] tracking-tight">Events & Categories Management</h1>
            <p className="text-sm text-muted-foreground">
              Configure sports categories, single/doubles formats, and location-specific brackets
            </p>
          </div>
          <Button className="gap-2 rounded-xl font-semibold shadow-xs" data-testid="button-create-event" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Create New Category
          </Button>
        </div>

        {/* Filters Bar: Tournament Filter + Location Filter */}
        <div className="p-4 rounded-2xl bg-muted/40 border space-y-4">
          {/* Tournament Filter Pills if multiple tournaments exist */}
          {tournamentList.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Filter by Tournament:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTournamentId('All')}
                  className={cn(
                    'px-3 py-1 rounded-xl text-xs font-semibold transition-all',
                    selectedTournamentId === 'All'
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'bg-background hover:bg-muted text-foreground border'
                  )}
                >
                  All Tournaments ({eventList.length})
                </button>
                {tournamentList.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTournamentId(t.id)}
                    className={cn(
                      'px-3 py-1 rounded-xl text-xs font-semibold transition-all',
                      selectedTournamentId === t.id
                        ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                        : 'bg-background hover:bg-muted text-foreground border'
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Location Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Filter by Location:</span>
            </div>

            <div className="flex gap-2">
              {['All', 'Irrum Manzil', 'Hitech City'].map(loc => {
                const count = loc === 'All'
                  ? (selectedTournamentId === 'All' ? eventList.length : eventList.filter(e => e.tournamentId === selectedTournamentId).length)
                  : eventList.filter(e => (selectedTournamentId === 'All' || e.tournamentId === selectedTournamentId) && (getEventLocation(e) === loc || getEventLocation(e) === 'All Locations')).length;

                return (
                  <button
                    key={loc}
                    onClick={() => setActiveLocationFilter(loc)}
                    className={cn(
                      'px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5',
                      activeLocationFilter === loc
                        ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                        : 'bg-background hover:bg-muted text-foreground border'
                    )}
                  >
                    <span>{loc === 'All' ? 'All Locations' : loc}</span>
                    <span className={cn('text-2xs px-1.5 py-0.2 rounded-md font-mono', activeLocationFilter === loc ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading events…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => {
              const eventRegs = regs.filter(r => r.eventId === event.id);
              const eventLoc = getEventLocation(event);
              const format = event.format || (event.meta?.format as string) || 'Single Elimination';

              return (
                <Card key={event.id} className="hover:shadow-lg transition-all border rounded-2xl bg-card overflow-hidden">
                  <div className={cn(
                    "h-2",
                    eventLoc === 'Irrum Manzil'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      : eventLoc === 'Hitech City'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-r from-primary to-violet-500'
                  )} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Gamepad2 className="h-6 w-6" />
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <Badge variant="outline" className="text-3xs font-bold">
                          {event.type}
                        </Badge>
                        <Badge variant="secondary" className="text-3xs font-bold">
                          {event.game}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-3xs font-bold",
                            eventLoc === 'Irrum Manzil'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : eventLoc === 'Hitech City'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-primary/10 text-primary border-primary/30'
                          )}
                        >
                          <MapPin className="h-2.5 w-2.5 mr-0.5 inline" />
                          {eventLoc}
                        </Badge>
                      </div>
                    </div>

                    <CardTitle className="mt-3 text-lg font-bold font-['Outfit']">
                      {event.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {event.game} &bull; {event.type} format ({format})
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 bg-muted/40 rounded-xl">
                        <span className="text-muted-foreground block text-2xs">Registered Athletes</span>
                        <span className="font-bold text-sm font-mono text-foreground">{eventRegs.length}</span>
                      </div>
                      <div className="p-3 bg-muted/40 rounded-xl">
                        <span className="text-muted-foreground block text-2xs">Venue / Location</span>
                        <span className="font-bold text-xs truncate block text-foreground">{eventLoc}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        variant="default"
                        size="sm"
                        className="rounded-xl flex-1 font-semibold text-xs gap-1.5"
                        data-testid={`button-fixtures-${event.id}`}
                        onClick={() => navigate(`/admin/fixtures?event=${event.id}`)}
                      >
                        <Network className="h-3.5 w-3.5" /> Fixtures & Schedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs gap-1"
                        onClick={() => handleOpenEdit(event)}
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteEvent(event)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create / Edit Category Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold font-['Outfit'] text-lg">
                <Gamepad2 className="h-5 w-5 text-primary" />
                {modalMode === 'create' ? 'Create Event Category' : 'Edit Event Category'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure competition category, sport discipline, and venue allocation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Tournament Assignment */}
              {tournamentList.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Attach to Tournament</Label>
                  <select
                    value={formTournamentId}
                    onChange={(e) => setFormTournamentId(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs font-medium"
                  >
                    {tournamentList.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Event Name */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Category / Event Name *</Label>
                <Input
                  placeholder="e.g., Badminton Singles Championship"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sport / Game */}
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Sport / Game</Label>
                  <Input
                    placeholder="e.g., Badminton, Table Tennis, Chess"
                    value={formGame}
                    onChange={(e) => setFormGame(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Type</Label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs font-medium"
                  >
                    <option value="Singles">Singles</option>
                    <option value="Doubles">Doubles</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Event Location</Label>
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  disabled={modalMode === 'create' && createForBothLocations}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-medium"
                >
                  <option value="Irrum Manzil">Irrum Manzil</option>
                  <option value="Hitech City">Hitech City</option>
                  <option value="All Locations">All Locations (Combined)</option>
                </select>
              </div>

              {/* Tournament Format */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Default Tournament Format</Label>
                <select
                  value={formFormat}
                  onChange={(e) => setFormFormat(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-medium"
                >
                  <option value="Single Elimination">Single Elimination (Knockout)</option>
                  <option value="Round Robin">Single Round-Robin (Circle Method)</option>
                  <option value="Double Round Robin">Double Round-Robin (Home & Away)</option>
                </select>
              </div>

              {/* Quick Create for Both Locations Option (Only in Create Mode) */}
              {modalMode === 'create' && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForBothLocations}
                      onChange={(e) => setCreateForBothLocations(e.target.checked)}
                      className="h-4 w-4 rounded text-primary border-primary/40"
                    />
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Copy className="h-3.5 w-3.5 text-primary" />
                      Quick Create Separate Categories for Both Locations
                    </span>
                  </label>
                  <p className="text-2xs text-muted-foreground pl-6">
                    Automatically generates 2 distinct categories: <strong>"{formName} - Irrum Manzil"</strong> and <strong>"{formName} - Hitech City"</strong>.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSaveEvent} disabled={saving} className="rounded-xl font-semibold gap-1.5">
                <Sparkles className="h-4 w-4" />
                {saving ? 'Saving…' : modalMode === 'create' ? 'Create Category' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
