import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Registration } from '@/data/registrations';
import { getEventById, events } from '@/data/events';
import { Users, Search } from 'lucide-react';
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

type RegistrationRow = {
  providedEmployeeId: string;
  id: string;
  employeeName: string;
  department: string;
  location: string;
  eventName: string;
  partner: string;
  registrationDate: string;
};

export default function Registrations() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const [regs, setRegs] = useState<Registration[]>([]);
  const [, setLocation] = useLocation();

  const query = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);

  useEffect(() => {
    let mounted = true;

    const fetchRegs = async () => {
      try {
        const eventId = query.get('event');
        const params = new URLSearchParams();
        if (eventId) params.set('eventId', eventId);
        const url = '/api/registrations' + (params.toString() ? `?${params.toString()}` : '');
        const res = await fetch(url);
        if (res.ok) {
          const rows = await res.json();
          if (mounted) setRegs(rows.map((r: any) => ({
            id: String(r.id),
            employeeId: r.employee_id,
            providedEmployeeId: r.provided_employee_id,
            employeeName: r.employee_name,
            department: r.department || '',
            location: r.location,
            eventId: r.event_id,
            partnerId: r.partner_id,
            partnerName: r.partner_id ? 'Auto-paired' : '-',
            registrationDate: r.registration_date,
          })));
          return;
        }
      } catch (err) {
        if (mounted) setRegs([]);
      }
    };

    fetchRegs();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'registrations:update') {
        fetchRegs();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => { mounted = false; window.removeEventListener('storage', onStorage); };
  }, []);

  const data = useMemo<RegistrationRow[]>(() => {
    return regs.map(reg => {
      const event = getEventById(reg.eventId);

      return {
        id: reg.id,
        providedEmployeeId: reg.providedEmployeeId || '-',
        employeeName: reg.employeeName || 'Unknown',
        department: reg.department || 'Unknown',
        location: reg.location || 'Unknown',
        eventName: event?.name || 'Unknown',
        partner: reg.partnerName || '-',
        registrationDate: new Date(reg.registrationDate).toLocaleDateString(),
      };
    });
  }, [regs]);

  const filteredData = useMemo(() => {
    let filtered = data;
    
    if (eventFilter !== 'all') {
      filtered = filtered.filter(row => {
        const event = events.find(e => e.name === row.eventName);
        return event?.id === eventFilter;
      });
    }
    
    if (locationFilter !== 'all') {
      filtered = filtered.filter(row => row.location === locationFilter);
    }
    
    return filtered;
  }, [data, eventFilter, locationFilter]);

  const columnHelper = createColumnHelper<RegistrationRow>();
  
  const columns = useMemo<ColumnDef<RegistrationRow, any>[]>(() => [
    columnHelper.accessor('providedEmployeeId', {
      header: 'Employee ID',
      cell: info => <span className="font-mono text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('employeeName', {
      header: 'Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('department', {
      header: 'Department',
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      cell: info => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('eventName', {
      header: 'Event',
      cell: info => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('partner', {
      header: 'Partner',
      cell: info => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor('registrationDate', {
      header: 'Registration Date',
      cell: info => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
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
          <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
          <p className="text-muted-foreground">
            Manage and view all tournament registrations
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  All Registrations
                </CardTitle>
                <CardDescription className="mt-1">
                  {filteredData.length} total registrations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, department..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-event-filter">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-location-filter">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                  <SelectItem value="Bangalore">Bangalore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            className="text-left p-3 text-sm font-semibold text-muted-foreground cursor-pointer hover:bg-muted/70"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map(row => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
