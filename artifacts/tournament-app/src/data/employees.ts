export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  location: "Hyderabad" | "Bangalore";
}


// Remove mock employee data to avoid exposing employee IDs/names.
export const employees: Employee[] = [];

export const getEmployeeById = (id: string): Employee | undefined => undefined;
export const getEmployeesByLocation = (location: "Hyderabad" | "Bangalore"): Employee[] => [];
