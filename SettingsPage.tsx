
import React, { useState, useRef } from 'react';
import { 
  Database, Bluetooth, Shield, Save, Smartphone, CheckCircle, AlertTriangle, FileDown, Upload, X, Lock, Download, Info, Menu, FileUp, SmartphoneCharging, ArrowRight, ShieldAlert, AlertOctagon, History, Eye, Tag, FileText, Printer, Calendar
} from 'lucide-react';
import { Product, Bill, Technician, LedgerEntry, SecurityLog, StockLog, PriceLog } from '../types';
import { playSound } from '../services/sound';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface SettingsProps {
  adminPin: string;
  setAdminPin: (val: string) => void;
  techCode: string;
  setTechCode: (val: string) => void;
  installApp: () => void;
  canInstall: boolean;
  
  // Data for Backup/Import
  inventory: Product[];
  bills: Bill[];
  technicians: Technician[];
  ledger: LedgerEntry[];
  securityLogs: SecurityLog[];
  stockLogs: StockLog[];
  priceLogs: PriceLog[];
  safeMode: boolean;
  onImport: (data: any) => void;
  noBillNoExit: boolean;
  setNoBillNoExit: (val: boolean) => void;
}

const SettingsPage: React.FC<SettingsProps> = ({ 
  adminPin, setAdminPin, techCode, setTechCode, installApp, canInstall,
  inventory, bills, technicians, ledger, securityLogs, stockLogs, priceLogs, safeMode, onImport, noBillNoExit, setNoBillNoExit
}) => {
  const [activeTab, setActiveTab] = useState<'General' | 'Logs'>('General');
  const [lastBackup, setLastBackup] = useState("Not performed yet");
  const [showPinModal, setShowPinModal] = useState<{ type: 'admin' | 'tech', value: string } | null>(null);
  const [transferStep, setTransferStep] = useState(0); 
  
  // Report Generation State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState<'today' | 'custom' | 'all'>('today');
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const runFullBackup = () => {
    playSound('click');
    setLastBackup(new Date().toLocaleString());
    const backupData = JSON.stringify({
      version: "1.0",
      timestamp: new Date().toISOString(),
      inventory, bills, technicians, ledger, adminPin, techCode, securityLogs, stockLogs, priceLogs,
      note: "Sangli POS Full Backup"
    }, null, 2);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sangli_FULL_DB_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSound('payment-success');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (!data.inventory && !data.bills) throw new Error("Invalid backup file format");
            const confirmMsg = `Found backup from ${new Date(data.timestamp).toLocaleString()}.\nThis will overwrite current data. Continue?`;
            if (window.confirm(confirmMsg)) {
                onImport(data);
                playSound('payment-success');
                alert("Database Restored Successfully!");
                if (transferStep > 0) setTransferStep(3); 
            }
        } catch (err) {
            playSound('scan-error');
            alert("Error importing file. Invalid format.");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCodeUpdate = () => {
    if (!showPinModal) return;
    if (showPinModal.type === 'admin') setAdminPin(showPinModal.value);
    else setTechCode(showPinModal.value.toUpperCase());
    setShowPinModal(null);
  };

  const generateReportData = () => {
      let filteredBills = bills;
      
      if (reportRange === 'today') {
          const today = new Date().toISOString().split('T')[0];
          filteredBills = bills.filter(b => b.date.startsWith(today));
      } else if (reportRange === 'custom') {
          const start = new Date(reportStartDate).getTime();
          const end = new Date(reportEndDate).getTime() + (24*60*60*1000); // end of day
          filteredBills = bills.filter(b => {
              const d = new Date(b.date).getTime();
              return d >= start && d < end;
          });
      }

      const totalSales = filteredBills.reduce((acc, curr) => acc + curr.total, 0);
      const totalItems = filteredBills.reduce((acc, curr) => acc + curr.items.reduce((a,c) => a + c.quantity, 0), 0);
      const khataTotal = technicians.reduce((acc, curr) => acc + curr.balance, 0);

      return {
          filteredBills,
          totalSales,
          totalItems,
          khataTotal
      };
  };

  const handleDownloadPDF = () => {
      playSound('click');
      setIsGeneratingPdf(true);

      setTimeout(() => {
          try {
              const doc = new jsPDF();
              const data = generateReportData();
              
              // --- CALCULATE METRICS ---
              const stockAssetValue = inventory.reduce((acc, curr) => acc + (curr.purchasePrice * curr.stockQuantity), 0);
              const totalStockItems = inventory.reduce((acc, curr) => acc + curr.stockQuantity, 0);

              const ninetyDaysAgo = new Date();
              ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
              const deadStockList = inventory.filter(p => {
                  if (p.stockQuantity <= 0) return false;
                  if (!p.lastSoldDate) return true; 
                  return new Date(p.lastSoldDate) < ninetyDaysAgo;
              });

              const dateStr = new Date().toLocaleDateString();
              const rangeStr = reportRange === 'today' ? `Date: ${dateStr}` : 
                               reportRange === 'all' ? 'All Time History' : 
                               `From ${reportStartDate} To ${reportEndDate}`;

              // --- 1. GRAPHICAL HEADER ---
              doc.setFillColor(79, 70, 229); // Indigo 600
              doc.rect(0, 0, 210, 40, 'F'); // Top bar background

              doc.setTextColor(255, 255, 255);
              doc.setFontSize(22);
              doc.setFont("helvetica", "bold");
              doc.text("Sangli Refrigeration & Spares", 14, 18);
              
              doc.setFontSize(10);
              doc.setFont("helvetica", "normal");
              doc.text("Inventory • Sales • POS Billing System", 14, 25);
              doc.text("Generated Report", 14, 32);

              doc.setFontSize(12);
              doc.text(rangeStr, 196, 25, { align: 'right' });

              // --- 2. SUMMARY CARDS (PPT Style) ---
              const drawCard = (x: number, y: number, title: string, value: string, color: [number, number, number]) => {
                  doc.setDrawColor(230, 230, 230);
                  doc.setFillColor(255, 255, 255);
                  doc.roundedRect(x, y, 45, 24, 2, 2, 'FD');
                  
                  // Color Stripe
                  doc.setFillColor(color[0], color[1], color[2]);
                  doc.rect(x + 2, y + 4, 1.5, 16, 'F');

                  doc.setFontSize(8);
                  doc.setTextColor(120, 120, 120);
                  doc.text(title.toUpperCase(), x + 6, y + 8);
                  
                  doc.setFontSize(11);
                  doc.setTextColor(30, 30, 30);
                  doc.setFont("helvetica", "bold");
                  doc.text(value, x + 6, y + 18);
              };

              let startY = 50;
              
              drawCard(14, startY, "Total Revenue", `Rs. ${data.totalSales.toLocaleString()}`, [79, 70, 229]); // Indigo
              drawCard(64, startY, "Items Sold", `${data.totalItems}`, [16, 185, 129]); // Emerald
              drawCard(114, startY, "Stock Asset Val", `Rs. ${stockAssetValue.toLocaleString()}`, [245, 158, 11]); // Amber
              drawCard(164, startY, "Dead Stock", `${deadStockList.length} Items`, [239, 68, 68]); // Red

              // --- 3. DETAILED SALES TABLE WITH RETURNS ---
              startY += 35;
              doc.setFontSize(14);
              doc.setTextColor(30, 41, 59); // Slate 800
              doc.text("Sales & Returns Register (A-Z Details)", 14, startY);

              const salesTableBody = data.filteredBills.map(bill => {
                  let paymentDetails = bill.paymentMethod;
                  if (bill.paymentMethod === 'Split' && bill.payments) {
                      paymentDetails = bill.payments
                          .filter(p => p.amount !== 0)
                          .map(p => `${p.method}: ${p.amount}`)
                          .join('\n');
                  }

                  // Format Items
                  const itemDetails = bill.items.map(i => {
                      const returnTag = i.price < 0 ? "(RETURN) " : "";
                      return `${returnTag}${i.partName} x${i.quantity}`;
                  }).join('\n');

                  const isReturn = bill.total < 0;

                  return [
                      bill.id.slice(-6),
                      new Date(bill.date).toLocaleDateString(),
                      bill.customerName || 'Walk-in',
                      itemDetails,
                      paymentDetails,
                      bill.notes || (isReturn ? "Return Processed" : "-"),
                      `Rs. ${bill.total}`
                  ];
              });

              autoTable(doc, {
                  startY: startY + 5,
                  head: [['Bill #', 'Date', 'Customer', 'Items & Details', 'Payment', 'Notes / Return Reason', 'Total']],
                  body: salesTableBody,
                  theme: 'grid',
                  headStyles: { 
                      fillColor: [241, 245, 249], 
                      textColor: [71, 85, 105],
                      fontStyle: 'bold',
                      lineWidth: 0.1,
                      lineColor: [200, 200, 200]
                  },
                  styles: { 
                      fontSize: 8, 
                      cellPadding: 3, 
                      textColor: [51, 65, 85],
                      valign: 'top',
                      lineColor: [230, 230, 230],
                      lineWidth: 0.1
                  },
                  columnStyles: {
                      3: { cellWidth: 50 }, // Items column wider
                      6: { halign: 'right', fontStyle: 'bold' } // Amount right aligned
                  },
                  didParseCell: function(data) {
                      // Highlight Returns in Red
                      if (data.section === 'body' && data.column.index === 6) {
                          const val = data.cell.raw as string;
                          if (val && val.includes("-")) {
                              data.cell.styles.textColor = [220, 38, 38]; // Red
                          } else {
                              data.cell.styles.textColor = [21, 128, 61]; // Green
                          }
                      }
                  }
              });

              // --- 4. DEAD STOCK TABLE ---
              // @ts-ignore
              let finalY = doc.lastAutoTable.finalY || 150;

              if (deadStockList.length > 0) {
                  if (finalY > 200) { doc.addPage(); finalY = 20; } else { finalY += 15; }
                  
                  doc.setFontSize(14);
                  doc.setTextColor(185, 28, 28); 
                  doc.text("Dead Stock Alert (Unsold > 90 Days)", 14, finalY);
                  
                  const deadStockBody = deadStockList.map(p => [
                      p.partName,
                      p.brand,
                      p.stockQuantity.toString(),
                      `Rs. ${p.purchasePrice}`,
                      `Rs. ${p.purchasePrice * p.stockQuantity}`,
                      p.lastSoldDate ? new Date(p.lastSoldDate).toLocaleDateString() : 'Never'
                  ]);

                  autoTable(doc, {
                      startY: finalY + 5,
                      head: [['Product', 'Brand', 'Qty', 'Cost', 'Total Value', 'Last Sold']],
                      body: deadStockBody,
                      theme: 'striped',
                      headStyles: { fillColor: [254, 202, 202], textColor: [153, 27, 27] }, // Red header
                      styles: { fontSize: 8 },
                  });
                   // @ts-ignore
                  finalY = doc.lastAutoTable.finalY || finalY;
              }

              // --- 5. KHATA TABLE WITH COLOR LOGIC ---
              if (finalY > 220) { doc.addPage(); finalY = 20; } else { finalY += 15; }

              doc.setFontSize(14);
              doc.setTextColor(30, 41, 59);
              doc.text("Technician Khata Summary", 14, finalY);

              const techTableBody = technicians.map(t => [
                  t.name,
                  t.mobile,
                  t.trustLevel || 'Unknown',
                  t.balance // Pass raw number for parsing
              ]);

              autoTable(doc, {
                  startY: finalY + 5,
                  head: [['Technician', 'Mobile', 'Trust Level', 'Current Balance']],
                  body: techTableBody,
                  theme: 'grid',
                  headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
                  styles: { fontSize: 9, valign: 'middle' },
                  columnStyles: {
                      3: { halign: 'right', fontStyle: 'bold' }
                  },
                  didParseCell: function(data) {
                      // Custom Coloring for Balance
                      if (data.section === 'body' && data.column.index === 3) {
                          const balance = data.cell.raw as number;
                          
                          // Formatting the text for display
                          const prefix = balance < 0 ? "- " : "+ ";
                          data.cell.text = [prefix + "Rs. " + Math.abs(balance).toLocaleString()];

                          // Color Logic: Minus = Red, Plus = Green
                          if (balance < 0) {
                              data.cell.styles.textColor = [220, 38, 38]; // Red 600
                          } else if (balance > 0) {
                              data.cell.styles.textColor = [22, 163, 74]; // Green 600
                          } else {
                              data.cell.styles.textColor = [100, 116, 139]; // Slate 500 (Zero)
                          }
                      }
                  }
              });

              // Footer
              const pageCount = doc.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFillColor(248, 250, 252);
                  doc.rect(0, 280, 210, 17, 'F'); // Footer background
                  
                  doc.setFontSize(8);
                  doc.setTextColor(100, 116, 139);
                  doc.text('Sangli Refrigeration POS System • Generated on ' + new Date().toLocaleString(), 14, 290);
                  doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
              }

              // Save
              doc.save(`Sangli_Report_${new Date().toISOString().split('T')[0]}.pdf`);
              playSound('payment-success');
              setShowReportModal(false);
          } catch (e) {
              console.error(e);
              alert("Error generating PDF. Please try again.");
          } finally {
              setIsGeneratingPdf(false);
          }
      }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">System Settings</h1>
            <p className="text-slate-500 mt-1">Configure sync, security, and data recovery</p>
        </div>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            <button onClick={() => setActiveTab('General')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'General' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}>General</button>
            <button onClick={() => setActiveTab('Logs')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Logs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500'}`}>System Logs</button>
        </div>
      </div>

      {activeTab === 'General' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            {/* Safe Mode Alert */}
            {safeMode && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex items-center gap-4 animate-pulse md:col-span-2">
                    <AlertOctagon size={32} className="text-red-500" />
                    <div>
                        <h3 className="font-bold text-red-800 text-lg">System in Safe Mode</h3>
                        <p className="text-sm text-red-600">The application encountered a data error. Please Restore a backup immediately.</p>
                    </div>
                </div>
            )}

            {/* Counter Rules */}
            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-4">
                <div className="flex items-center space-x-3 text-slate-800">
                    <Shield size={24} /><h3 className="text-lg font-bold">Counter Rules</h3>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                        <p className="font-bold text-slate-800">"No Bill, No Exit" Mode</p>
                        <p className="text-xs text-slate-500">Prevents cart clearing or closing without a bill or Admin PIN.</p>
                    </div>
                    <button 
                        onClick={() => setNoBillNoExit(!noBillNoExit)}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${noBillNoExit ? 'bg-red-500' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${noBillNoExit ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
            </section>

            {/* Data Management (Simple) */}
            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm md:col-span-1 space-y-6">
                <div className="flex items-center space-x-3 text-slate-800"><Database size={24} /><h3 className="text-lg font-bold">Data Management</h3></div>
                <div className="space-y-3">
                    <button onClick={() => setShowReportModal(true)} className="w-full flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors group">
                        <div className="flex items-center space-x-3">
                            <div className="bg-indigo-200 p-2 rounded-lg text-indigo-800"><FileText size={18} /></div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-indigo-900">Generate PDF Report</p>
                                <p className="text-[10px] text-indigo-700">Detailed Sales, Returns, Khata</p>
                            </div>
                        </div>
                    </button>

                    <button onClick={runFullBackup} className="w-full flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors group">
                        <div className="flex items-center space-x-3">
                            <div className="bg-emerald-200 p-2 rounded-lg text-emerald-800"><Download size={18} /></div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-emerald-900">Backup Database</p>
                                <p className="text-[10px] text-emerald-700">Last: {lastBackup}</p>
                            </div>
                        </div>
                    </button>
                    
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors group">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-200 p-2 rounded-lg text-blue-800"><Upload size={18} /></div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-blue-900">Restore Database</p>
                                <p className="text-[10px] text-blue-700">Overwrites current data</p>
                            </div>
                        </div>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json"/>
                </div>
            </section>

            {/* Device Transfer Wizard */}
            <section className="bg-indigo-900 p-6 rounded-2xl shadow-xl text-white overflow-hidden relative md:col-span-1">
                <div className="absolute top-0 right-0 p-10 bg-indigo-800 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4"><SmartphoneCharging size={28} /><h2 className="text-xl font-bold">Device Transfer</h2></div>
                    {transferStep === 0 && (
                        <div>
                            <p className="text-indigo-200 text-sm mb-6">Switching phones? Use the wizard to safely move data.</p>
                            <button onClick={() => setTransferStep(1)} className="bg-white text-indigo-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-50 transition-all w-full">Start Wizard</button>
                        </div>
                    )}
                    {transferStep === 1 && <div className="space-y-4"><p className="text-sm">Step 1: Download Backup</p><button onClick={() => {runFullBackup(); setTransferStep(2);}} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full"><Download size={16} /> Download</button></div>}
                    {transferStep === 2 && <div className="space-y-4"><p className="text-sm">Step 2: Upload on New Phone</p><button onClick={() => fileInputRef.current?.click()} className="bg-white text-indigo-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full"><Upload size={16} /> Select File</button></div>}
                    {transferStep === 3 && <div className="text-center"><CheckCircle size={48} className="mx-auto text-emerald-400 mb-2" /><h3>Complete!</h3><button onClick={() => setTransferStep(0)} className="underline mt-2 text-sm">Close</button></div>}
                </div>
            </section>

            {/* Security Controls */}
            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-6">
                <div className="flex items-center space-x-3 text-slate-800"><Shield size={24} /><h3 className="text-lg font-bold">Security Controls</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Master Admin PIN</label>
                        <div className="flex space-x-2">
                        <input type="text" value={adminPin} readOnly className="flex-1 bg-slate-50 border-none rounded-lg p-3 text-sm font-mono font-bold text-slate-600" />
                        <button onClick={() => setShowPinModal({ type: 'admin', value: adminPin })} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">Change</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Technician Code</label>
                        <div className="flex space-x-2">
                        <input type="text" value={techCode} readOnly className="flex-1 bg-slate-50 border-none rounded-lg p-3 text-sm font-mono font-bold text-slate-600" />
                        <button onClick={() => setShowPinModal({ type: 'tech', value: techCode })} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">Change</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right">
            {/* Stock Logs */}
            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 text-amber-600 mb-4"><History size={24} /><h3 className="text-lg font-bold text-slate-800">Stock Adjustment Logs</h3></div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {stockLogs.length === 0 && <p className="text-slate-400 text-sm">No adjustments recorded.</p>}
                    {stockLogs.map(log => (
                        <div key={log.id} className="p-3 bg-amber-50 border-l-4 border-amber-300 rounded-r-lg text-sm flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-700">{log.productName}</p>
                                <p className="text-xs text-slate-500">{new Date(log.date).toLocaleString()} • {log.reason}</p>
                            </div>
                            <span className={`font-mono font-bold ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>{log.change > 0 ? '+' : ''}{log.change}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Price Logs */}
            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 text-blue-600 mb-4"><Tag size={24} /><h3 className="text-lg font-bold text-slate-800">Price Change History</h3></div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {priceLogs.length === 0 && <p className="text-slate-400 text-sm">No price changes recorded.</p>}
                    {priceLogs.map(log => (
                        <div key={log.id} className="p-3 bg-blue-50 border-l-4 border-blue-300 rounded-r-lg text-sm">
                            <div className="flex justify-between">
                                <p className="font-bold text-slate-700">{log.productName}</p>
                                <span className="text-xs font-bold uppercase bg-white px-2 rounded border border-blue-100">{log.field} Price</span>
                            </div>
                            <div className="flex justify-between mt-1 items-center">
                                <span className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString()} by {log.user}</span>
                                <div className="text-xs font-mono font-bold">
                                    <span className="text-slate-400 line-through mr-2">₹{log.oldVal}</span>
                                    <span className="text-blue-600">₹{log.newVal}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Security Logs */}
            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 text-red-600 mb-4"><ShieldAlert size={24} /><h3 className="text-lg font-bold text-slate-800">Security & Fraud Alerts</h3></div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {securityLogs.length === 0 && <p className="text-slate-400 text-sm">No security events recorded.</p>}
                    {securityLogs.map(log => (
                        <div key={log.id} className="p-3 bg-slate-50 border-l-4 border-slate-300 rounded-r-lg text-sm">
                            <div className="flex justify-between items-start">
                                <span className={`font-bold text-xs px-2 py-0.5 rounded uppercase ${log.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{log.type}</span>
                                <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 text-slate-700 font-medium">{log.details}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-3 text-indigo-600">
                          <Printer size={24} />
                          <h3 className="text-lg font-bold text-slate-800">Generate Report</h3>
                      </div>
                      <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
                  </div>

                  <div className="space-y-4 mb-6">
                      <label className="text-sm font-bold text-slate-600">Select Date Range</label>
                      <div className="flex gap-2">
                          <button onClick={() => setReportRange('today')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${reportRange === 'today' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 border-slate-200'}`}>Today</button>
                          <button onClick={() => setReportRange('custom')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${reportRange === 'custom' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 border-slate-200'}`}>Custom</button>
                          <button onClick={() => setReportRange('all')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${reportRange === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 border-slate-200'}`}>All Time</button>
                      </div>

                      {reportRange === 'custom' && (
                          <div className="grid grid-cols-2 gap-3 mt-2 animate-slide-up">
                              <div>
                                  <label className="text-[10px] text-slate-400 font-bold uppercase">From</label>
                                  <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                              </div>
                              <div>
                                  <label className="text-[10px] text-slate-400 font-bold uppercase">To</label>
                                  <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                              </div>
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={handleDownloadPDF} 
                      disabled={isGeneratingPdf}
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                      {isGeneratingPdf ? 'Generating PDF...' : (
                          <>
                             <Download size={18} /> Download PDF Report
                          </>
                      )}
                  </button>
              </div>
          </div>
      )}

      {/* Modal for PIN/Code change ... (Same as before) */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6"><div className="flex items-center space-x-3 text-indigo-600"><Lock size={20} /><h3 className="font-bold text-slate-800">Update Code</h3></div><button onClick={() => setShowPinModal(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18} /></button></div>
             <input autoFocus type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-center text-2xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500 mb-6" value={showPinModal.value} onChange={e => setShowPinModal({...showPinModal, value: e.target.value})} />
             <button onClick={handleCodeUpdate} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700">Save Changes</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
