
import React, { useState } from 'react';
import { Search, UserPlus, Phone, IndianRupee, History, Send, AlertCircle, X, Check, ArrowDownLeft, ArrowUpRight, ArrowLeft, Building2, MapPin, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Technician, LedgerEntry } from '../types';

interface KhataProps {
  technicians: Technician[];
  setTechnicians: React.Dispatch<React.SetStateAction<Technician[]>>;
  updateTechBalance: (id: string, amount: number, type: 'Debit' | 'Credit', description?: string) => void;
  ledger: LedgerEntry[];
  addTechnician: (tech: Technician) => void;
}

const Khata: React.FC<KhataProps> = ({ technicians, setTechnicians, updateTechBalance, ledger, addTechnician }) => {
  const [activeTech, setActiveTech] = useState<Technician>(technicians[0]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  
  // New Entry State
  const [entryType, setEntryType] = useState<'Debit' | 'Credit'>('Debit');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDesc, setEntryDesc] = useState('');

  // New Technician State
  const [newTechData, setNewTechData] = useState<Partial<Technician>>({
    name: '',
    mobile: '',
    company: '',
    address: '',
    limit: 5000,
    balance: 0
  });
  
  // Mobile View State
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const handleNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryAmount || Number(entryAmount) <= 0) return;
    updateTechBalance(activeTech.id, Number(entryAmount), entryType, entryDesc);
    setShowEntryModal(false);
    setEntryAmount('');
    setEntryDesc('');
    alert(`Transaction recorded successfully!`);
  };

  const handleAddTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechData.name || !newTechData.mobile) return;

    const tech: Technician = {
        id: `T${Date.now()}`,
        name: newTechData.name,
        mobile: newTechData.mobile,
        company: newTechData.company || '',
        address: newTechData.address || '',
        balance: newTechData.balance || 0,
        limit: newTechData.limit || 5000,
        trustScore: 100, // Default start
        trustLevel: 'Reliable'
    };

    addTechnician(tech);
    setShowAddTechModal(false);
    setActiveTech(tech);
    setNewTechData({ name: '', mobile: '', company: '', address: '', limit: 5000, balance: 0 });
    alert("New Technician Added!");
  };

  const handleTechClick = (tech: Technician) => {
    setActiveTech(tech);
    setIsMobileDetailOpen(true);
  };

  const currentActiveTech = technicians.find(t => t.id === activeTech.id) || technicians[0];
  const techHistory = ledger.filter(l => l.technicianId === currentActiveTech.id);

  // Helper for Trust Badge
  const getTrustBadge = (tech: Technician) => {
      if (tech.trustLevel === 'Risky') return <ShieldAlert size={14} className="text-red-500" />;
      if (tech.trustLevel === 'Average') return <Shield size={14} className="text-yellow-500" />;
      return <ShieldCheck size={14} className="text-green-500" />;
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative">
      {/* Technician List */}
      <div className={`w-full md:w-80 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden transition-all ${isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Technicians</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search technician..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {technicians.map(tech => (
            <button
              key={tech.id}
              onClick={() => handleTechClick(tech)}
              className={`w-full text-left p-4 border-b border-slate-50 transition-colors hover:bg-slate-50 ${currentActiveTech.id === tech.id ? 'bg-indigo-50/50 border-r-4 border-r-indigo-600' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 flex items-center justify-center rounded-full font-bold shrink-0">{tech.name[0]}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate flex items-center gap-1">{tech.name} {getTrustBadge(tech)}</p>
                    <p className="text-xs text-slate-400">{tech.mobile}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tech.balance >= 0 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                   {tech.balance >= 0 ? 'Collect' : 'Give'} ₹{Math.abs(tech.balance)}
                 </span>
                 <div className="flex items-center space-x-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                   <span className="text-[10px] text-slate-400">Limit: ₹{tech.limit}</span>
                 </div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setShowAddTechModal(true)} className="p-4 bg-indigo-600 text-white font-bold text-sm flex items-center justify-center space-x-2 shrink-0 hover:bg-indigo-700 transition-colors">
          <UserPlus size={18} /><span>New Technician</span>
        </button>
      </div>

      {/* Ledger Details */}
      <div className={`flex-1 flex flex-col space-y-6 ${!isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="md:hidden flex items-center space-x-2 text-slate-500 mb-2">
            <button onClick={() => setIsMobileDetailOpen(false)} className="p-2 bg-white rounded-lg shadow-sm"><ArrowLeft size={20} /></button>
            <span className="font-bold">Back to List</span>
        </div>

        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
             <div className="w-16 h-16 bg-indigo-600 text-white flex items-center justify-center rounded-2xl text-2xl font-black shrink-0">{currentActiveTech.name[0]}</div>
             <div>
               <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-extrabold text-slate-800">{currentActiveTech.name}</h3>
                  <div className={`flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${
                      currentActiveTech.trustLevel === 'Risky' ? 'bg-red-50 text-red-600 border-red-100' : 
                      currentActiveTech.trustLevel === 'Average' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-green-50 text-green-600 border-green-100'
                  }`}>
                      {currentActiveTech.trustScore || 100}% Trust
                  </div>
               </div>
               {currentActiveTech.company && <p className="text-sm font-bold text-slate-500">{currentActiveTech.company}</p>}
               
               <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="flex items-center text-sm text-slate-500 font-medium"><Phone size={14} className="mr-1.5 text-slate-400" /> {currentActiveTech.mobile}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block"></span>
                  <span className="text-sm text-indigo-600 font-bold">TECH-{currentActiveTech.id}</span>
               </div>
             </div>
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
             <button onClick={() => setShowEntryModal(true)} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
               <IndianRupee size={18} /><span>New Entry</span>
             </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="font-bold text-slate-800 flex items-center"><History size={18} className="mr-2 text-slate-400" /> Transaction History</h4>
            <div className="flex space-x-4 text-sm justify-between sm:justify-end bg-slate-50 p-2 rounded-xl sm:bg-transparent sm:p-0">
               <div className="text-right">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Balance</p>
                 <p className={`font-black ${currentActiveTech.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{currentActiveTech.balance.toLocaleString()}</p>
               </div>
               <div className="w-[1px] h-8 bg-slate-200 sm:bg-slate-100"></div>
               <div className="text-right">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remaining Limit</p>
                 <p className="font-black text-slate-800">₹{(currentActiveTech.limit + currentActiveTech.balance).toLocaleString()}</p>
               </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {techHistory.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400"><History size={48} className="mb-2 opacity-20" /><p className="text-sm font-medium">No transactions yet</p></div>
            ) : (
                <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 sticky top-0"><tr><th className="px-4 md:px-6 py-3">Details</th><th className="px-4 md:px-6 py-3 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                    {techHistory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 md:px-6 py-4">
                        <p className="text-sm font-bold text-slate-700 line-clamp-2">{entry.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs font-medium text-slate-500">{new Date(entry.date).toLocaleDateString()}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${entry.type === 'Credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{entry.type}</span>
                        </div>
                        </td>
                        <td className={`px-4 md:px-6 py-4 text-right font-bold font-mono ${entry.type === 'Credit' ? 'text-green-600' : 'text-slate-700'}`}>{entry.type === 'Credit' ? '+' : '-'} ₹{entry.amount.toLocaleString()}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals remain mostly the same, updated with consistent styling if needed */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           {/* ... Entry Modal Content ... */}
           <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800">New Entry</h3><button onClick={() => setShowEntryModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button></div>
              <form onSubmit={handleNewEntry} className="space-y-6">
                 <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button type="button" onClick={() => setEntryType('Debit')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${entryType === 'Debit' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}><ArrowUpRight size={14} /> <span>Debit (-)</span></button>
                    <button type="button" onClick={() => setEntryType('Credit')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${entryType === 'Credit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}><ArrowDownLeft size={14} /> <span>Credit (+)</span></button>
                 </div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</label><div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input required type="number" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00"/></div></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label><input required type="text" value={entryDesc} onChange={e => setEntryDesc(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Received Cash Payment"/></div>
                 <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center space-x-2"><Check size={20} /><span>Save Transaction</span></button>
              </form>
           </div>
        </div>
      )}

      {showAddTechModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
             {/* ... Add Tech Modal ... */}
             <div className="flex justify-between items-center mb-6"><div className="flex items-center space-x-2 text-indigo-600"><UserPlus size={24} /><h3 className="text-xl font-bold text-slate-800">Add Technician</h3></div><button onClick={() => setShowAddTechModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button></div>
             <form onSubmit={handleAddTechnician} className="space-y-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label><input required type="text" placeholder="e.g. Rajesh Kumar" value={newTechData.name} onChange={e => setNewTechData({...newTechData, name: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company / Shop Name</label><input type="text" placeholder="e.g. RK Cool Services" value={newTechData.company} onChange={e => setNewTechData({...newTechData, company: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number *</label><input required type="tel" placeholder="10 digit mobile" value={newTechData.mobile} onChange={e => setNewTechData({...newTechData, mobile: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"/></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</label><input type="text" placeholder="Area, City" value={newTechData.address} onChange={e => setNewTechData({...newTechData, address: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Credit Limit</label><input type="number" value={newTechData.limit} onChange={e => setNewTechData({...newTechData, limit: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"/></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Bal.</label><input type="number" placeholder="Optional" value={newTechData.balance} onChange={e => setNewTechData({...newTechData, balance: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"/></div>
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all mt-2">Add Technician</button>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Khata;
