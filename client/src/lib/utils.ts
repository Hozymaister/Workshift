import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getWorkplaceTypeColor = (type: string | undefined) => {
  switch (type) {
    case "warehouse":
      return "bg-primary";
    case "event":
      return "bg-amber-500";
    case "club":
      return "bg-indigo-500";
    default:
      return "bg-slate-500";
  }
};

export const getWorkplaceTypeBgClass = (type: string | undefined) => {
  switch (type) {
    case "warehouse":
      return "bg-blue-100 text-blue-700";
    case "event":
      return "bg-amber-100 text-amber-700";
    case "club":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const formatDateTime = (dateString: string, timeString?: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }),
    time: timeString ? timeString : date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
    full: `${date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })} ${timeString || date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0
  }).format(value);
};

export const calculateDuration = (startTime: string, endTime: string) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMilliseconds = end.getTime() - start.getTime();
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
    return Math.round(diffInHours * 10) / 10; // Round to 1 decimal place
  } catch (e) {
    return 0;
  }
};

// Funkce pro výpočet hodin a minut v textovém formátu
export const formatDuration = (durationInHours: number) => {
  if (isNaN(durationInHours)) return "0h 0m";
  
  const hours = Math.floor(durationInHours);
  const minutes = Math.round((durationInHours - hours) * 60);
  
  if (minutes === 60) {
    return `${hours + 1}h 0m`;
  }
  
  return `${hours}h ${minutes}m`;
};

// Funkce pro výpočet měsíčního součtu hodin
export const calculateMonthlyHours = (
  shifts: { startTime: string | null; endTime: string | null; date: string | null }[],
  year: number,
  month: number
) => {
  // Filtrujeme směny podle daného měsíce
  const monthlyShifts = shifts.filter((shift) => {
    if (!shift.date) return false;
    const shiftDate = new Date(shift.date);
    return shiftDate.getFullYear() === year && shiftDate.getMonth() === month;
  });

  // Počítáme celkový počet hodin
  return monthlyShifts.reduce((total, shift) => {
    if (!shift.startTime || !shift.endTime) return total;
    return total + calculateDuration(shift.startTime, shift.endTime);
  }, 0);
};

// Funkce pro výpočet celkového počtu hodin
export const calculateTotalHours = (
  shifts: { startTime: string | null; endTime: string | null }[]
) => {
  return shifts.reduce((total, shift) => {
    if (!shift.startTime || !shift.endTime) return total;
    return total + calculateDuration(shift.startTime, shift.endTime);
  }, 0);
};

// Funkce pro přehledný výstup počtu hodin
export const formatTotalHours = (durationInHours: number) => {
  if (isNaN(durationInHours)) return "0 hodin";
  
  const hours = Math.floor(durationInHours);
  const minutes = Math.round((durationInHours - hours) * 60);
  
  let result = "";
  
  if (hours > 0) {
    result += `${hours} ${hours === 1 ? "hodina" : hours >= 2 && hours <= 4 ? "hodiny" : "hodin"}`;
  }
  
  if (minutes > 0) {
    if (result) result += " ";
    result += `${minutes} ${minutes === 1 ? "minuta" : minutes >= 2 && minutes <= 4 ? "minuty" : "minut"}`;
  }
  
  if (!result) {
    return "0 hodin";
  }
  
  return result;
};
