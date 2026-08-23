import { useMemo, useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  fetchEvents,
  fetchRegistrations,
  type AppEvent,
  type AppRegistration
} from '@/lib/api';

type RegistrationRow = {
  providedEmployeeId: string;
  id: string;
  employeeName: string;
  department: string;
  location: string;
  eventName: string;
  eventId: string;
  registrationDate: string;
};

export default function Registrations() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [eventsList, setEventsList] = useState<AppEvent[]>([]);
  const [regs, setRegs] = useState<AppRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, regsData] = await Promise.all([
        fetchEvents(),
        fetchRegistrations()
      ]);
      setEventsList(eventsData);
      setRegs(regsData);

      // check URL query for preselected event
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
      return {
        id: reg.id,
        providedEmployeeId: reg.providedEmployeeId || reg.employeeId || '-',
        employeeName: reg.employeeName || 'Unknown',
        department: reg.department || 'General',
        location: reg.location || 'Unknown',
        eventName: event?.name || reg.eventId || 'Unknown',
        eventId: reg.eventId,
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

  const columnHelper = createColumnHelper<RegistrationRow>();

  const columns = useMemo<ColumnDef<RegistrationRow, any>[]>(() => [
    columnHelper.accessor('providedEmployeeId', {
      header: 'Employee ID',
      cell: info => <span className="font-mono text-sm font-semibold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('employeeName', {
      header: 'Employee Name',
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
      cell: info => <span className="text-sm font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('registrationDate', {
      header: 'Registration Date',
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
            View and search all participants registered in the tournament database
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
                  placeholder="Search by participant name, ID, or department..."
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
                      {event.name}
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
                  <SelectItem value="Other">Other</SelectItem>
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
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
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
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
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
    </AdminLayout>
  );
}
