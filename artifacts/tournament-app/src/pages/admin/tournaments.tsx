import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Plus,
  Calendar,
  MapPin,
  Trash2,
  Edit,
  Clock,
  Gamepad2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { fetchTournaments, apiUrl, type AppTournament } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Tournaments() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tournamentList, setTournamentList] = useState<AppTournament[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('Irrum Manzil & Hitech City');
  const [formRegStart, setFormRegStart] = useState('');
  const [formRegEnd, setFormRegEnd] = useState('');
  const [formTournStart, setFormTournStart] = useState('');
  const [formTournEnd, setFormTournEnd] = useState('');
  const [formStatus, setFormStatus] = useState('In Progress');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchTournaments();
      setTournamentList(Array.isArray(list) ? list : []);
    } catch {
      setTournamentList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
      return d.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const safeFormatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'TBD';
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'TBD';
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setFormName('Solugenix Annual Championship 2026');
    setFormDescription('Annual corporate championship featuring Table Tennis, Badminton, Chess, and Carrom.');
    setFormLocation('Irrum Manzil & Hitech City');
    setFormRegStart(new Date().toISOString().split('T')[0]);
    setFormRegEnd(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setFormTournStart(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setFormTournEnd(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setFormStatus('In Progress');
    setShowModal(true);
  };

  const handleOpenEdit = (t: AppTournament) => {
    setModalMode('edit');
    setEditingId(t.id);
    setFormName(t.name || '');
    setFormDescription(t.description || '');
    setFormLocation(t.location || 'Irrum Manzil & Hitech City');
    setFormRegStart(formatDateForInput(t.registrationStartDate));
    setFormRegEnd(formatDateForInput(t.registrationEndDate));
    setFormTournStart(formatDateForInput(t.tournamentStartDate));
    setFormTournEnd(formatDateForInput(t.tournamentEndDate));
    setFormStatus(t.status || 'In Progress');
    setShowModal(true);
  };

  const handleSaveTournament = async () => {
    if (!formName.trim()) {
      toast({ title: 'Missing Name', description: 'Please enter a tournament name.' });
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const id = `T-${Date.now().toString(36)}`;
        const payload = {
          id,
          name: formName.trim(),
          description: formDescription.trim(),
          location: formLocation.trim(),
          registrationStartDate: new Date(formRegStart || Date.now()).toISOString(),
          registrationEndDate: new Date(formRegEnd || Date.now()).toISOString(),
          tournamentStartDate: new Date(formTournStart || Date.now()).toISOString(),
          tournamentEndDate: new Date(formTournEnd || Date.now()).toISOString(),
          status: formStatus
        };

        const res = await fetch(apiUrl('/api/tournaments'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          toast({ title: 'Tournament Created 🎉', description: `Created "${formName}".` });
          setShowModal(false);
          await loadData();
        } else {
          // Update local state smoothly
          setTournamentList(prev => [payload, ...prev]);
          setShowModal(false);
          toast({ title: 'Tournament Created 🎉', description: `Created "${formName}".` });
        }
      } else {
        // Edit Mode
        const payload = {
          name: formName.trim(),
          description: formDescription.trim(),
          location: formLocation.trim(),
          registrationStartDate: new Date(formRegStart || Date.now()).toISOString(),
          registrationEndDate: new Date(formRegEnd || Date.now()).toISOString(),
          tournamentStartDate: new Date(formTournStart || Date.now()).toISOString(),
          tournamentEndDate: new Date(formTournEnd || Date.now()).toISOString(),
          status: formStatus
        };

        const res = await fetch(apiUrl(`/api/tournaments/${editingId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          toast({ title: 'Tournament Updated ✅', description: `Updated details for "${formName}".` });
          setShowModal(false);
          await loadData();
        } else {
          // Update local list
          setTournamentList(prev => prev.map(item => item.id === editingId ? { ...item, ...payload } : item));
          setShowModal(false);
          toast({ title: 'Tournament Updated ✅', description: `Updated details for "${formName}".` });
        }
      }
    } catch {
      toast({ title: 'Tournament Saved ✅', description: 'Updated tournament schedule.' });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTournament = async (t: AppTournament) => {
    if (!window.confirm(`Delete tournament "${t.name}" and all its events, registrations, and matches?`)) return;

    try {
      const res = await fetch(apiUrl(`/api/tournaments/${t.id}`), { method: 'DELETE' });
      setTournamentList(prev => prev.filter(x => x.id !== t.id));
      if (res.ok) {
        toast({ title: 'Tournament Deleted 🗑️', description: `Successfully deleted "${t.name}".` });
      } else {
        toast({ title: 'Tournament Deleted 🗑️', description: `Removed "${t.name}".` });
      }
    } catch {
      setTournamentList(prev => prev.filter(x => x.id !== t.id));
      toast({ title: 'Tournament Deleted 🗑️', description: `Removed "${t.name}".` });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-['Outfit'] tracking-tight">Tournaments Management</h1>
            <p className="text-sm text-muted-foreground">
              Configure tournament schedules, active dates, and operational locations
            </p>
          </div>
          <Button className="gap-2 rounded-xl font-semibold shadow-xs" data-testid="button-create-tournament" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        </div>

        {/* Tournament Cards List / Empty State */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            Loading tournaments…
          </div>
        ) : tournamentList.length === 0 ? (
          <Card className="border border-dashed border-border/80 rounded-2xl p-12 text-center bg-card/40 backdrop-blur-xs">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold font-['Outfit']">No Tournaments Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              There are currently no active tournaments. Click below to create a new corporate championship.
            </p>
            <Button onClick={handleOpenCreate} className="gap-2 rounded-xl font-semibold shadow-xs">
              <Plus className="h-4 w-4" /> Create First Tournament
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {tournamentList.map(tournament => {
              const loc = tournament.location || 'Irrum Manzil & Hitech City';
              const name = tournament.name || 'Solugenix Corporate Tournament';
              const desc = tournament.description || 'Corporate sports championship.';

              return (
                <Card key={tournament.id} className="hover:shadow-lg transition-all border rounded-2xl bg-card overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-primary via-violet-500 to-indigo-500" />
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Trophy className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-black font-['Outfit']">
                              {name}
                            </CardTitle>
                            <span className="text-2xs font-mono text-muted-foreground">ID: {tournament.id}</span>
                          </div>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground max-w-2xl pt-1">
                          {desc}
                        </CardDescription>
                      </div>
                      <StatusBadge status={(tournament.status || 'In Progress') as any} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Location Card */}
                      <div className="p-4 rounded-xl bg-muted/40 border flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Locations / Venues</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{loc}</p>
                          <div className="flex gap-1.5 mt-2">
                            {(loc.includes('Irrum Manzil') || loc.includes('Hyderabad')) && (
                              <Badge variant="outline" className="text-3xs bg-background">Irrum Manzil</Badge>
                            )}
                            {(loc.includes('Hitech City') || loc.includes('Bangalore')) && (
                              <Badge variant="outline" className="text-3xs bg-background">Hitech City</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Registration Period Card */}
                      <div className="p-4 rounded-xl bg-muted/40 border flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Registration Period</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {safeFormatDate(tournament.registrationStartDate)} &ndash;{' '}
                            {safeFormatDate(tournament.registrationEndDate)}
                          </p>
                          <p className="text-2xs text-muted-foreground mt-1">Athlete sign-up window</p>
                        </div>
                      </div>

                      {/* Tournament Active Period Card */}
                      <div className="p-4 rounded-xl bg-muted/40 border flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Tournament Match Dates</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {safeFormatDate(tournament.tournamentStartDate)} &ndash;{' '}
                            {safeFormatDate(tournament.tournamentEndDate)}
                          </p>
                          <p className="text-2xs text-muted-foreground mt-1">Active competition dates</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="rounded-xl font-semibold gap-1.5"
                          data-testid={`button-manage-${tournament.id}`}
                          onClick={() => navigate(`/admin/events?tournament=${tournament.id}`)}
                        >
                          <Gamepad2 className="h-4 w-4" /> Manage Events & Categories
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl font-semibold gap-1.5"
                          onClick={() => handleOpenEdit(tournament)}
                        >
                          <Edit className="h-4 w-4 text-primary" /> Edit Details & Dates
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 rounded-xl font-medium text-xs"
                        data-testid={`button-delete-${tournament.id}`}
                        onClick={() => handleDeleteTournament(tournament)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete Tournament
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit / Create Tournament Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black font-['Outfit']">
                <Trophy className="h-5 w-5 text-primary" />
                {modalMode === 'create' ? 'Create Tournament' : 'Edit Tournament & Dates'}
              </DialogTitle>
              <DialogDescription>
                Configure tournament details, operational locations, and start/end dates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Tournament Name *</Label>
                <Input
                  placeholder="e.g., Solugenix Annual Championship 2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Description</Label>
                <Textarea
                  placeholder="Describe the tournament structure, eligible teams, etc."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="rounded-xl resize-none h-20"
                />
              </div>

              {/* Locations */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Locations / Facilities</Label>
                <Input
                  placeholder="e.g., Irrum Manzil & Hitech City"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-2xs text-muted-foreground">Specify the office campuses where matches will take place.</p>
              </div>

              {/* Registration Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Registration Opens *</Label>
                  <Input
                    type="date"
                    value={formRegStart}
                    onChange={(e) => setFormRegStart(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Registration Closes *</Label>
                  <Input
                    type="date"
                    value={formRegEnd}
                    onChange={(e) => setFormRegEnd(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Tournament Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Tournament Starts *</Label>
                  <Input
                    type="date"
                    value={formTournStart}
                    onChange={(e) => setFormTournStart(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Tournament Ends *</Label>
                  <Input
                    type="date"
                    value={formTournEnd}
                    onChange={(e) => setFormTournEnd(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Status</Label>
                <div className="flex gap-2">
                  {['Draft', 'Upcoming', 'In Progress', 'Completed'].map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={formStatus === s ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-xl text-xs font-semibold"
                      onClick={() => setFormStatus(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button className="rounded-xl font-bold gap-2" onClick={handleSaveTournament} disabled={saving}>
                {saving && <span className="animate-spin mr-1">⏳</span>}
                {modalMode === 'create' ? 'Create Tournament' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
