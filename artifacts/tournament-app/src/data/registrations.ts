export interface Registration {
  id: string;
  employeeId: string;
  tournamentId: string;
  eventId: string;
  partnerId?: string;
  registrationDate: string;
}

// Generate 120 mock registrations
const generateRegistrations = (): Registration[] => {
  const regs: Registration[] = [];
  let regId = 1;
  
  // Singles events: E001, E003, E005 - 20 each
  ["E001", "E003", "E005"].forEach(eventId => {
    for (let i = 0; i < 20; i++) {
      regs.push({
        id: `REG${String(regId++).padStart(3, '0')}`,
        employeeId: `EMP${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
        tournamentId: "T001",
        eventId,
        registrationDate: new Date(2026, 0, 15 + Math.floor(Math.random() * 25)).toISOString()
      });
    }
  });
  
  // Doubles events: E002, E004 - 30 pairs each (60 registrations)
  ["E002", "E004"].forEach(eventId => {
    for (let i = 0; i < 30; i++) {
      const emp1 = Math.floor(Math.random() * 100) + 1;
      let emp2 = Math.floor(Math.random() * 100) + 1;
      while (emp2 === emp1) emp2 = Math.floor(Math.random() * 100) + 1;
      
      const emp1Id = `EMP${String(emp1).padStart(3, '0')}`;
      const emp2Id = `EMP${String(emp2).padStart(3, '0')}`;
      
      regs.push({
        id: `REG${String(regId++).padStart(3, '0')}`,
        employeeId: emp1Id,
        tournamentId: "T001",
        eventId,
        partnerId: emp2Id,
        registrationDate: new Date(2026, 0, 15 + Math.floor(Math.random() * 25)).toISOString()
      });
    }
  });
  
  return regs;
};

export let registrations: Registration[] = generateRegistrations();

export const addRegistration = (reg: Omit<Registration, 'id'>) => {
  const newId = `REG${String(registrations.length + 1).padStart(3, '0')}`;
  const newReg = { ...reg, id: newId };
  registrations.push(newReg);
  return newReg;
};

export const getRegistrationsByEvent = (eventId: string) =>
  registrations.filter(r => r.eventId === eventId);

export const getRegistrationsByEmployee = (employeeId: string) =>
  registrations.filter(r => r.employeeId === employeeId);
