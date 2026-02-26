import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  
  // Handle ISO strings by taking only the date part
  const datePart = dateString.split('T')[0];
  
  // Split YYYY-MM-DD
  const [year, month, day] = datePart.split('-');
  
  // Return DD/MM/YYYY
  return `${day}/${month}/${year}`;
};
