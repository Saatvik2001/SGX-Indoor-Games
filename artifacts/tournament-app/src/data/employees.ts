export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  location: "Hyderabad" | "Bangalore";
}

const firstNames = ["Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Ananya", "Karthik", "Divya", "Rahul", "Kavya", "Arun", "Meera", "Sanjay", "Pooja", "Nikhil", "Ishita", "Suresh", "Nandini", "Arjun", "Riya"];
const lastNames = ["Kumar", "Sharma", "Reddy", "Patel", "Singh", "Iyer", "Nair", "Rao", "Gupta", "Mehta", "Joshi", "Desai", "Kulkarni", "Verma", "Menon", "Pillai", "Agarwal", "Chopra", "Bhat", "Shetty"];
const departments = ["Engineering", "HR", "Finance", "Marketing", "Operations", "Sales", "Design", "Legal"];

export const employees: Employee[] = Array.from({ length: 100 }, (_, i) => {
  const id = `EMP${String(i + 1).padStart(3, '0')}`;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`;
  const department = departments[Math.floor(Math.random() * departments.length)];
  const location = i % 2 === 0 ? "Hyderabad" : "Bangalore";
  
  return { id, name, email, department, location };
});

export const getEmployeeById = (id: string) => employees.find(e => e.id === id);
export const getEmployeesByLocation = (location: "Hyderabad" | "Bangalore") => 
  employees.filter(e => e.location === location);
