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
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffInMilliseconds = end.getTime() - start.getTime();
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
  return Math.round(diffInHours * 10) / 10; // Round to 1 decimal place
};
