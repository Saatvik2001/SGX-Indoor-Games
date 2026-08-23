export interface Registration {
  id: string;
  employeeId: string; // internal id (can be anonymized)
  employeeName?: string; // store the provided participant name
  providedEmployeeId?: string; // the Employee ID entered by the user
  department?: string;
  tournamentId: string;
  eventId: string;
  partnerId?: string;
  partnerName?: string;
  location?: string;
  registrationDate: string;
}
import { employees } from './employees';

// Keep an in-memory registration store for the demo.
export let registrations: Registration[] = [];

// Hydrate from localStorage if available (client-side)
try {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('registrations');
    if (raw) registrations = JSON.parse(raw) as Registration[];
  }
} catch (e) {
  // ignore
}

export const addRegistration = (reg: Omit<Registration, 'id'> & { employeeName?: string; partnerName?: string; location?: string; providedEmployeeId?: string }) => {
  const newId = `REG${String(registrations.length + 1).padStart(3, '0')}`;
  const newReg: Registration = { ...reg, id: newId } as Registration;
  registrations.push(newReg);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('registrations', JSON.stringify(registrations));
      // notify other tabs
      window.localStorage.setItem('registrations:update', Date.now().toString());
    }
  } catch (e) {
    // ignore
  }
  return newReg;
};

export const getRegistrationsByEvent = (eventId: string) =>
  registrations.filter(r => r.eventId === eventId);

export const getRegistrationsByEmployee = (employeeId: string) =>
  registrations.filter(r => r.employeeId === employeeId);

export const getRegisteredEmployeeIdsByEventAndLocation = (eventId: string, location: 'Irrum Manzil' | 'Hitech City' | string) => {
  // Return anonymized IDs from registrations that match the event and location.
  const regs = getRegistrationsByEvent(eventId).filter(r => r.location === location).map(r => r.employeeId);
  return regs;
};
