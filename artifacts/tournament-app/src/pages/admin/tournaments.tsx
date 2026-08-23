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
  Sparkles,
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
      setTournamentList(list);
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
    setFormName(t.name);
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
          toast({ title: 'Error', description: 'Failed to create tournament.' });
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
          toast({ title: 'Error', description: 'Failed to update tournament.' });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Network error saving tournament.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTournament = async (t: AppTournament) => {
    if (!window.confirm(`Delete tournament "${t.name}" and all its events, registrations, and matches?`)) return;

    try {
      const res = await fetch(apiUrl(`/api/tournaments/${t.id}`), { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Tournament Deleted' });
        await loadData();
      } else {
        toast({ title: 'Error', description: 'Failed to delete tournament.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error deleting tournament.' });
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

        {/* Tournament Cards List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading tournaments…</div>
        ) : (
          <div className="grid gap-6">
            {tournamentList.map(tournament => (
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
                            {tournament.name}
                          </CardTitle>
                          <span className="text-2xs font-mono text-muted-foreground">ID: {tournament.id}</span>
                        </div>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground max-w-2xl pt-1">
                        {tournament.description}
                      </CardDescription>
                    </div>
                    <StatusBadge status={tournament.status as any} />
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
                        <p className="text-sm font-bold text-foreground mt-0.5">{tournament.location}</p>
                        <div className="flex gap-1.5 mt-2">
                          {(tournament.location.includes('Irrum Manzil') || tournament.location.includes('Hyderabad')) && (
                            <Badge variant="outline" className="text-3xs bg-background">Irrum Manzil</Badge>
                          )}
                          {(tournament.location.includes('Hitech City') || tournament.location.includes('Bangalore')) && (
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
                          {new Date(tournament.registrationStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} &ndash;{' '}
                          {new Date(tournament.registrationEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
                          {new Date(tournament.tournamentStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} &ndash;{' '}
                          {new Date(tournament.tournamentEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
            ))}

            {tournamentList.length === 0 && (
              <Card className="py-16 text-center text-muted-foreground border rounded-2xl bg-muted/20">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                <div className="font-bold text-base">No Tournaments Configured</div>
                <p className="text-xs text-muted-foreground mt-1">Click "Create Tournament" above to start your championship.</p>
              </Card>
            )}
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
                  placeholder="Brief summary of tournament rules and sport categories..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="rounded-xl resize-none h-20 text-xs"
                />
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <Label className="font-semibold text-xs">Tournament Locations / Venues *</Label>
                <Input
                  placeholder="e.g., Irrum Manzil & Hitech City"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="rounded-xl"
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-2xs text-muted-foreground font-medium">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() => setFormLocation('Irrum Manzil & Hitech City')}
                    className="text-2xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold border transition-colors"
                  >
                    Irrum Manzil & Hitech City
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLocation('Irrum Manzil')}
                    className="text-2xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold border transition-colors"
                  >
                    Irrum Manzil
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLocation('Hitech City')}
                    className="text-2xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold border transition-colors"
                  >
                    Hitech City
                  </button>
                </div>
              </div>

              {/* Registration Dates */}
              <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Registration Window Dates
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Registration Start Date</Label>
                    <Input
                      type="date"
                      value={formRegStart}
                      onChange={(e) => setFormRegStart(e.target.value)}
                      className="rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Registration End Date</Label>
                    <Input
                      type="date"
                      value={formRegEnd}
                      onChange={(e) => setFormRegEnd(e.target.value)}
                      className="rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Tournament Match Dates */}
              <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  Tournament Competition Dates
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Tournament Start Date</Label>
                    <Input
                      type="date"
                      value={formTournStart}
                      onChange={(e) => setFormTournStart(e.target.value)}
                      className="rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Tournament End Date</Label>
                    <Input
                      type="date"
                      value={formTournEnd}
                      onChange={(e) => setFormTournEnd(e.target.value)}
                      className="rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Tournament Status</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-medium"
                >
                  <option value="Draft">Draft (Setup Phase)</option>
                  <option value="Registration Open">Registration Open</option>
                  <option value="In Progress">In Progress (Active Matches)</option>
                  <option value="Completed">Completed (Concluded)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSaveTournament} disabled={saving} className="rounded-xl font-semibold gap-1.5">
                <Sparkles className="h-4 w-4" />
                {saving ? 'Saving…' : modalMode === 'create' ? 'Create Tournament' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
