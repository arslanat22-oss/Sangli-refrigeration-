
export enum MachineType {
  AC = 'AC',
  FRIDGE = 'Fridge',
  WASHING_MACHINE = 'Washing Machine'
}

export type PaymentMethod = 'Cash' | 'Online' | 'Khata';

export type StockAdjustmentReason = 'Breakage' | 'Lost' | 'Free Replacement' | 'Sample Given' | 'Audit Correction' | 'New Stock' | 'Return Restock';

export interface StockLog {
  id: string;
  date: string;
  productId: string;
  productName: string;
  change: number; 
  reason: StockAdjustmentReason;
  newStock: number;
}

export interface PriceLog {
  id: string;
  date: string;
  productId: string;
  productName: string;
  field: 'Purchase' | 'Technician' | 'Customer';
  oldVal: number;
  newVal: number;
  user: string;
}

export interface TrackingInfo {
  batchNumber?: string;
  supplierInvoice?: string;
  purchaseDate?: string;
}

export interface SplitPayment {
  method: PaymentMethod;
  amount: number;
}

export interface Product {
  id: string;
  barcode: string;
  machineType: MachineType;
  brand: string;
  partType: string;
  partName: string;
  compatibleModels: string[];
  rackLocation: string;
  stockQuantity: number;
  lowStockThreshold: number;
  supplierName: string;
  purchasePrice: number;
  technicianPrice: number;
  customerPrice: number;
  images: string[];
  isFastMoving: boolean;
  notes?: string;
  lastSoldDate?: string;
  ownerNotes?: string;
  trackingInfo?: TrackingInfo; // Box/Lot Tracking
}

export interface BillItem {
  productId: string;
  partName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Bill {
  id: string;
  date: string;
  items: BillItem[];
  subtotal: number;
  gst: number;
  total: number;
  type: 'Estimate' | 'Final';
  customerName: string;
  customerMobile: string;
  paymentMethod: PaymentMethod | 'Split';
  payments?: SplitPayment[];
  isPaid: boolean;
  notes?: string; 
}

export interface Technician {
  id: string;
  name: string;
  company?: string;
  address?: string;
  mobile: string;
  balance: number;
  limit: number;
  trustScore?: number;
  trustLevel?: 'Reliable' | 'Average' | 'Risky';
}

export interface LedgerEntry {
  id: string;
  technicianId: string;
  date: string;
  description: string;
  amount: number;
  type: 'Debit' | 'Credit';
}

export interface SyncStatus {
  status: 'Synced' | 'Syncing' | 'Disconnected';
  lastSync: string;
}

export interface SecurityLog {
  id: string;
  type: 'VOID_BILL' | 'PRICE_CHECK' | 'STOCK_EDIT' | 'SAFE_MODE';
  details: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}
