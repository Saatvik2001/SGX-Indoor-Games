export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  location: "Irrum Manzil" | "Hitech City";
}


// Remove mock employee data to avoid exposing employee IDs/names.
export const employees: Employee[] = [];

export const getEmployeeById = (id: string): Employee | undefined => undefined;
export const getEmployeesByLocation = (location: "Irrum Manzil" | "Hitech City"): Employee[] => [];
