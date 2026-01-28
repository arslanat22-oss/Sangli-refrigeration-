
import React from 'react';
import { MachineType, Product, Technician } from './types';

export const ADMIN_PIN = "1234";
export const TECH_CODE = "TECH";
export const CUST_CODE = "CUST";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    barcode: 'LG-PCB-001',
    machineType: MachineType.AC,
    brand: 'LG',
    partType: 'PCB',
    partName: 'LG Dual Inverter Universal PCB',
    compatibleModels: ['LG 1.5 Ton', 'LG 2 Ton Inverter'],
    rackLocation: 'A-12',
    stockQuantity: 15,
    lowStockThreshold: 5,
    supplierName: 'Reliable Spares',
    purchasePrice: 2200,
    technicianPrice: 2800,
    customerPrice: 3500,
    images: ['https://picsum.photos/seed/pcb/400/300'],
    isFastMoving: true,
  },
  {
    id: '2',
    barcode: 'SAM-CMP-002',
    machineType: MachineType.FRIDGE,
    brand: 'Samsung',
    partType: 'Compressor',
    partName: 'Samsung 190L Inverter Compressor',
    compatibleModels: ['Samsung Single Door', 'Whirlpool Pro'],
    rackLocation: 'B-04',
    stockQuantity: 4,
    lowStockThreshold: 5,
    supplierName: 'Metro Refrigeration',
    purchasePrice: 4500,
    technicianPrice: 5200,
    customerPrice: 6500,
    images: ['https://picsum.photos/seed/comp/400/300'],
    isFastMoving: false,
  }
];

export const MOCK_TECHNICIANS: Technician[] = [
  { id: 'T1', name: 'Ramesh Kumar', mobile: '9876543210', balance: 1250, limit: 5000 },
  { id: 'T2', name: 'Sunil Refrigeration', mobile: '9123456780', balance: -400, limit: 10000 },
];
