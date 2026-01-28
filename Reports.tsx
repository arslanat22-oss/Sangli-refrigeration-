
// ... (imports remain same)
import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon,
  ArrowUp,
  FileText,
  IndianRupee,
  History,
  Clock,
  ExternalLink,
  X,
  Share2,
  Printer
} from 'lucide-react';
import { 
  AreaChart, Area, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Bill } from '../types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { playSound } from '../services/sound';

interface ReportsProps {
  bills: Bill[];
}

const salesData = [
  { month: 'Jan', revenue: 45000, profit: 12000 },
  { month: 'Feb', revenue: 52000, profit: 15000 },
  { month: 'Mar', revenue: 48000, profit: 13000 },
  { month: 'Apr', revenue: 61000, profit: 18000 },
  { month: 'May', revenue: 55000, profit: 16500 },
  { month: 'Jun', revenue: 72000, profit: 21000 },
];

const categoryData = [
  { name: 'AC Spares', value: 45 },
  { name: 'Fridge Spares', value: 30 },
  { name: 'Washing Machine', value: 25 },
];

const COLORS = ['#4f46e5', '#10b981', '#f59e0b'];

const Reports: React.FC<ReportsProps> = ({ bills }) => {
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const handleDownloadBillPDF = (bill: Bill) => {
    playSound('click');
    const doc = new jsPDF();
    
    // --- 1. ENCHANTED GRAPHICS & BACKGROUND ---
    // Add a subtle decorative circle in the background
    doc.setFillColor(245, 247, 255);
    doc.circle(200, 0, 80, 'F');
    
    // Header Banner (Indigo Gradient Simulation)
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 210, 45, 'F');
    
    // Company Title with Shadow Effect
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0, 0.2); // Shadow
    doc.text("Sangli Refrigeration", 15, 23);
    doc.setTextColor(255, 255, 255); // Main
    doc.text("Sangli Refrigeration", 14, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Original Spare Parts & Professional Services", 14, 30);
    doc.text("GSTIN: 27ABCDE1234F1Z5 | Mob: +91 98765 43210", 14, 35);

    // Bill Badge (Right Side) - 3D Pill
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(150, 12, 45, 18, 9, 9, 'F');
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", 172.5, 24, { align: "center" });

    let yPos = 60;

    // --- 2. 3D INFO CARDS ---
    const draw3DCard = (x: number, y: number, w: number, h: number, title: string, content: string[]) => {
        // Shadow Layer (Offset)
        doc.setFillColor(226, 232, 240); // Slate 200
        doc.roundedRect(x + 2, y + 2, w, h, 3, 3, 'F');
        
        // Main Card Layer
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.1);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        
        // Title Strip
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x + 0.5, y + 0.5, w - 1, 9, 3, 3, 'F');
        // Fix corners of title strip to be straight at bottom
        doc.rect(x + 0.5, y + 5, w - 1, 5, 'F'); 
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), x + 5, y + 7);

        // Content
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        let cy = y + 16;
        content.forEach((line, i) => {
            if (i > 0) doc.setFont("helvetica", "normal"); // First line bold
            doc.text(line, x + 5, cy);
            cy += 5;
        });
    };

    draw3DCard(14, yPos, 85, 35, "Billed To", [
        bill.customerName || "Walk-in Customer",
        `Mobile: ${bill.customerMobile || "N/A"}`,
        "Sangli, Maharashtra"
    ]);

    draw3DCard(110, yPos, 85, 35, "Invoice Details", [
        `Invoice #: ${bill.id.slice(-8)}`,
        `Date: ${new Date(bill.date).toLocaleDateString()}`,
        `Payment: ${bill.paymentMethod} (${bill.type})`
    ]);

    yPos += 45;

    // --- 3. ITEMS TABLE ---
    const tableBody = bill.items.map(item => [
        item.partName,
        item.quantity.toString(),
        `Rs. ${Math.abs(item.price).toLocaleString()}`,
        `Rs. ${item.total.toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Item Description', 'Qty', 'Price', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: [79, 70, 229], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            halign: 'left'
        },
        styles: { 
            fontSize: 10, 
            cellPadding: 5,
            textColor: [51, 65, 85],
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 90 },
            3: { halign: 'right', fontStyle: 'bold' },
            2: { halign: 'right' },
            1: { halign: 'center' }
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        }
    });

    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY || yPos + 20;

    // --- 4. 3D TOTALS BOX ---
    finalY += 10;
    
    const summaryX = 115;
    const summaryW = 80;
    
    // Shadow
    doc.setFillColor(79, 70, 229, 0.1); 
    doc.roundedRect(summaryX + 3, finalY + 3, summaryW, 40, 2, 2, 'F');
    // Main Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.roundedRect(summaryX, finalY, summaryW, 40, 2, 2, 'FD');

    let textY = finalY + 10;
    
    const drawRow = (label: string, value: string, isTotal = false) => {
        doc.setFontSize(isTotal ? 14 : 10);
        doc.setFont("helvetica", isTotal ? "bold" : "normal");
        doc.setTextColor(isTotal ? 79 : 100, isTotal ? 70 : 116, isTotal ? 229 : 139); // Indigo for total
        
        doc.text(label, summaryX + 6, textY);
        doc.text(value, summaryX + summaryW - 6, textY, { align: 'right' });
        textY += isTotal ? 0 : 8;
    };

    drawRow("Subtotal", `Rs. ${bill.subtotal.toLocaleString()}`);
    if (bill.gst > 0) drawRow("GST (18%)", `Rs. ${bill.gst.toLocaleString()}`);
    
    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(summaryX + 5, textY - 2, summaryX + summaryW - 5, textY - 2);
    textY += 6;

    drawRow("Grand Total", `Rs. ${bill.total.toLocaleString()}`, true);

    // --- 5. DIGITAL STAMP & SIGNATURE ---
    const stampX = 165;
    const stampY = textY + 25;

    // Outer ring
    doc.setDrawColor(220, 38, 38); // Red-600
    doc.setLineWidth(0.6);
    doc.circle(stampX, stampY, 15, 'S');
    
    // Inner ring
    doc.setLineWidth(0.2);
    doc.circle(stampX, stampY, 13, 'S');

    // Stamp Content
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("SANGLI", stampX, stampY - 5, { align: 'center' });
    doc.text("REFRIGERATION", stampX, stampY, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text("PAID", stampX, stampY + 6, { align: 'center' });

    // Signature Line
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85); // Slate
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", stampX, stampY + 25, { align: 'center' });

    // --- 6. FOOTER ---
    const pageHeight = doc.internal.pageSize.height;
    
    // Decorative bottom bar
    doc.setFillColor(79, 70, 229);
    doc.rect(0, pageHeight - 15, 210, 15, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Thank you for your business!", 105, pageHeight - 9, { align: "center" });
    
    // Terms floating above
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Goods once sold will not be taken back. Subject to Sangli jurisdiction.", 105, pageHeight - 20, { align: "center" });

    // Save
    doc.save(`Sangli_Invoice_${bill.id}.pdf`);
  };

  const handleShare = async (bill: Bill) => {
      // ... (existing share logic)
      const itemsList = bill.items.map(item => `${item.partName} x ${item.quantity} = Rs.${item.total}`).join('\n');
      const billText = `
*Sangli Refrigeration & Spares*
Bill ID: ${bill.id}
Date: ${new Date(bill.date).toLocaleString()}
------------------------------
${itemsList}
------------------------------
Subtotal: Rs.${bill.subtotal}
GST: Rs.${bill.gst}
*Total: Rs.${bill.total}*
      `.trim();
  
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Sangli Refrigeration Bill',
                  text: billText,
              });
          } catch (error) {
              console.log('Error sharing', error);
          }
      } else {
          try {
              await navigator.clipboard.writeText(billText);
              alert("Bill copied to clipboard!");
          } catch (err) {
              alert("Could not share automatically.");
          }
      }
    };

  return (
    <div className="space-y-8 pb-20">
      {/* ... (existing UI code for charts and lists) ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Reports & History</h1>
          <p className="text-slate-500 mt-1">Sales performance and transaction history</p>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all">
            <Calendar size={18} />
            <span>This Month</span>
          </button>
          <button className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-lg font-bold text-slate-800">Growth Analysis</h3>
             <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded bg-indigo-600"></div>
                  <span className="text-xs font-bold text-slate-500">Revenue</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span className="text-xs font-bold text-slate-500">Profit</span>
                </div>
             </div>
           </div>
           <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={salesData}>
                 <defs>
                   <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                 <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProf)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Categories Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Sales Category</h3>
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
             {categoryData.map((item, i) => (
               <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i]}}></div>
                    <span className="text-sm font-semibold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{item.value}%</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <History size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Recent Sales History</h3>
          </div>
          <button className="text-sm font-bold text-indigo-600 hover:underline flex items-center">
            View All <ExternalLink size={14} className="ml-1" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {bills.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">No transactions recorded yet</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Bill ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bills.map((bill) => (
                  <tr 
                    key={bill.id} 
                    onClick={() => setSelectedBill(bill)}
                    className="hover:bg-indigo-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 text-xs font-mono font-bold text-indigo-600">{bill.id}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(bill.date).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{bill.customerName}</p>
                      <p className="text-[10px] text-slate-400">{bill.customerMobile}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        bill.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-700' :
                        bill.paymentMethod === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {bill.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${bill.type === 'Final' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {bill.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-black text-slate-800">₹{bill.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Bill Details</h3>
                        <p className="text-xs text-slate-500 font-mono">{selectedBill.id}</p>
                    </div>
                    <button onClick={() => setSelectedBill(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">Date & Time</p>
                            <p className="text-sm font-semibold text-slate-800">{new Date(selectedBill.date).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">Payment Mode</p>
                            <p className="text-sm font-semibold text-slate-800">{selectedBill.paymentMethod}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">Customer</p>
                            <p className="text-sm font-semibold text-slate-800">{selectedBill.customerName}</p>
                            <p className="text-xs text-slate-500">{selectedBill.customerMobile}</p>
                        </div>
                         <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">Type</p>
                            <span className="text-sm font-semibold text-indigo-600">{selectedBill.type}</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-6">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-200">
                                <tr>
                                    <th className="pb-2">Item</th>
                                    <th className="pb-2 text-center">Qty</th>
                                    <th className="pb-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {selectedBill.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2">
                                            <p className="font-bold text-slate-700">{item.partName}</p>
                                            <p className="text-[10px] text-slate-400">@ ₹{item.price}</p>
                                        </td>
                                        <td className="py-2 text-center font-semibold">{item.quantity}</td>
                                        <td className="py-2 text-right font-bold">₹{item.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="font-semibold">₹{selectedBill.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">GST</span>
                            <span className="font-semibold">₹{selectedBill.gst}</span>
                        </div>
                        <div className="flex justify-between text-lg mt-2">
                            <span className="font-bold text-slate-800">Grand Total</span>
                            <span className="font-black text-indigo-600">₹{selectedBill.total}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t bg-slate-50 grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleDownloadBillPDF(selectedBill)}
                      className="flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-100 shadow-sm active:scale-95 transition-all"
                    >
                        <Printer size={18} />
                        <span>Print PDF</span>
                    </button>
                    <button 
                      onClick={() => handleShare(selectedBill)}
                      className="flex items-center justify-center space-x-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-sm active:scale-95 transition-all"
                    >
                        <Share2 size={18} />
                        <span>Share</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
