import { useMemo, useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Search, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  fetchEvents,
  fetchRegistrations,
  assignPartner,
  type AppEvent,
  type AppRegistration
} from '@/lib/api';
import { cn } from '@/lib/utils';

type RegistrationRow = {
  id: string;
  providedEmployeeId: string;
  employeeName: string;
  department: string;
  location: string;
  eventName: string;
  eventId: string;
  eventType: 'Singles' | 'Doubles';
  partnerId?: string | null;
  partnerName?: string | null;
  registrationDate: string;
};

export default function Registrations() {
  const { toast } = useToast();
  const [globalFilter, setGlobalFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [regs, setRegs] = useState<AppRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  // Partner Assignment Modal State
  const [assigningRow, setAssigningRow] = useState<RegistrationRow | null>(null);
  const [assignPartnerId, setAssignPartnerId] = useState('');
  const [assignPartnerName, setAssignPartnerName] = useState('');
  const [assignPartnerDept, setAssignPartnerDept] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, regsData] = await Promise.all([
        fetchEvents(),
        fetchRegistrations()
      ]);
      setEventsList(eventsData);
      setRegs(regsData);

      const query = new URLSearchParams(window.location.search);
      const evParam = query.get('event');
      if (evParam && eventsData.some(e => e.id === evParam)) {
        setEventFilter(evParam);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const data = useMemo<RegistrationRow[]>(() => {
    return regs.map(reg => {
      const event = eventsList.find(e => e.id === reg.eventId);
      const partner = reg.partnerId
        ? regs.find(r => r.eventId === reg.eventId && (r.employeeId === reg.partnerId || r.providedEmployeeId === reg.partnerId))
        : null;

      return {
        id: reg.id,
        providedEmployeeId: reg.providedEmployeeId || reg.employeeId || '-',
        employeeName: reg.employeeName || 'Unknown',
        department: reg.department || 'General',
        location: reg.location || 'Unknown',
        eventName: event?.name || reg.eventId || 'Unknown',
        eventId: reg.eventId,
        eventType: event?.type || 'Singles',
        partnerId: reg.partnerId || null,
        partnerName: partner?.employeeName || null,
        registrationDate: new Date(reg.registrationDate).toLocaleDateString(),
      };
    });
  }, [regs, eventsList]);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (eventFilter !== 'all') {
      filtered = filtered.filter(row => row.eventId === eventFilter);
    }
    if (locationFilter !== 'all') {
      filtered = filtered.filter(row => row.location === locationFilter);
    }
    return filtered;
  }, [data, eventFilter, locationFilter]);

  const handleOpenAssignModal = (row: RegistrationRow) => {
    setAssigningRow(row);
    setAssignPartnerId('');
    setAssignPartnerName('');
    setAssignPartnerDept('');
    setAssignError(null);
  };

  const handleSavePartner = async () => {
    if (!assigningRow) return;
    if (!assignPartnerId.trim()) {
      setAssignError('Partner Employee ID is required.');
      return;
    }
    if (assignPartnerId.trim().toLowerCase() === assigningRow.providedEmployeeId.trim().toLowerCase()) {
      setAssignError('A player cannot be their own Doubles partner.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    const res = await assignPartner(
      assigningRow.id,
      assignPartnerId.trim(),
      assignPartnerName.trim() || undefined,
      assignPartnerDept.trim() || undefined
    );

    setIsAssigning(false);

    if (!res.ok) {
      setAssignError(res.error || 'Failed to assign partner');
      return;
    }

    toast({
      title: 'Partner Assigned! 🎉',
      description: `Successfully paired ${assigningRow.employeeName} with ${assignPartnerName || assignPartnerId}.`
    });

    setAssigningRow(null);
    await loadData();
  };

  const columnHelper = createColumnHelper<RegistrationRow>();

  const columns = useMemo<ColumnDef<RegistrationRow, any>[]>(() => [
    columnHelper.accessor('providedEmployeeId', {
      header: 'Employee ID',
      cell: info => <span className="font-mono text-sm font-semibold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('employeeName', {
      header: 'Player Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('department', {
      header: 'Department',
      cell: info => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      cell: info => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('eventName', {
      header: 'Event',
      cell: info => {
        const row = info.row.original;
        return (
          <div className="space-y-0.5">
            <span className="text-sm font-medium block">{info.getValue()}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider",
              row.eventType === 'Doubles' ? "bg-purple-500/10 text-purple-600" : "bg-sky-500/10 text-sky-600"
            )}>
              {row.eventType}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('partnerId', {
      header: 'Doubles Team / Partner',
      cell: info => {
        const row = info.row.original;
        if (row.eventType !== 'Doubles') {
          return <span className="text-xs text-muted-foreground">-</span>;
        }

        if (row.partnerId) {
          return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>Partner: {row.partnerName || row.partnerId} ({row.partnerId})</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-500/20">
              Partial (No Partner)
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
              onClick={() => handleOpenAssignModal(row)}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Assign
            </Button>
          </div>
        );
      },
    }),
    columnHelper.accessor('registrationDate', {
      header: 'Registered',
      cell: info => <span className="text-xs text-muted-foreground font-mono">{info.getValue()}</span>,
    }),
  ], [columnHelper]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registrations Management</h1>
          <p className="text-muted-foreground">
            View, search, and manage participants, Doubles team pairings, and partial entries across all events.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  All Participant Registrations
                </CardTitle>
                <CardDescription className="mt-1">
                  {filteredData.length} participant(s) found
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by participant name, ID, department, or partner..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-full sm:w-56" data-testid="select-event-filter">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events ({regs.length})</SelectItem>
                  {eventsList.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} ({event.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-location-filter">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Irrum Manzil">Irrum Manzil</SelectItem>
                  <SelectItem value="Hitech City">Hitech City</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground cursor-pointer hover:bg-muted/70"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Loading registrations…
                        </td>
                      </tr>
                    ) : table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map(row => (
                        <tr
                          key={row.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          data-testid={`row-${row.original.id}`}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="p-3 text-sm">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No registrations found matching the filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {filteredData.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    filteredData.length
                  )}{' '}
                  of {filteredData.length} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    data-testid="button-previous-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Partner Dialog */}
      <Dialog open={!!assigningRow} onOpenChange={(open) => !open && setAssigningRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Doubles Partner</DialogTitle>
            <DialogDescription>
              Pair a partner with <strong className="text-foreground">{assigningRow?.employeeName}</strong> ({assigningRow?.providedEmployeeId}) for {assigningRow?.eventName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="assignPartnerId" className="text-sm font-semibold">Partner Employee ID *</Label>
              <Input
                id="assignPartnerId"
                placeholder="e.g. EMP-1043"
                value={assignPartnerId}
                onChange={(e) => {
                  setAssignPartnerId(e.target.value);
                  setAssignError(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignPartnerName" className="text-sm font-semibold">Partner Full Name</Label>
              <Input
                id="assignPartnerName"
                placeholder="e.g. Jordan Smith"
                value={assignPartnerName}
                onChange={(e) => setAssignPartnerName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignPartnerDept" className="text-sm font-semibold">Partner Department</Label>
              <Input
                id="assignPartnerDept"
                placeholder="e.g. Engineering, Sales"
                value={assignPartnerDept}
                onChange={(e) => setAssignPartnerDept(e.target.value)}
              />
            </div>

            {assignError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningRow(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePartner}
              disabled={isAssigning || !assignPartnerId.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isAssigning ? 'Pairing...' : 'Assign & Complete Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
