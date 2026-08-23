import { 
  Clock, Package, Truck, AlertCircle, CheckCircle, AlertTriangle 
} from 'lucide-react';

export const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  AWAITING_PAYMENT:    { icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Awaiting Payment' },
  PAYMENT_RECEIVED:    { icon: Package,       color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Awaiting Shipping' },
  DELIVERY_IN_PROGRESS:{ icon: Truck,         color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'In Transit' },
  INSPECTION_PERIOD:   { icon: AlertCircle,   color: 'text-purple-600', bg: 'bg-purple-50', label: 'Inspection' },
  COMPLETED:           { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'Completed' },
  DISPUTED:            { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',    label: 'Disputed' },
  CANCELLED:           { icon: AlertTriangle, color: 'text-gray-600',   bg: 'bg-gray-50',   label: 'Cancelled' },
  REFUNDED:            { icon: CheckCircle,   color: 'text-teal-600',   bg: 'bg-teal-50',   label: 'Refunded' },
};
