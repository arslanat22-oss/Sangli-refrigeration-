
import React, { useMemo } from 'react';
import { IndianRupee, TrendingUp, AlertTriangle, PackageCheck, ArrowUpRight, ArrowDownRight, Plus, Hourglass } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { Bill, Product } from '../types';

interface DashboardProps {
  bills: Bill[];
  inventory: Product[];
}

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
    <div className="mt-4 flex items-center space-x-2">
      <span className={`text-xs font-bold flex items-center ${change.startsWith('+') || change === 'Live' ? 'text-green-500' : 'text-red-500'}`}>
        {change !== 'Live' && (change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
        {change}
      </span>
      {change !== 'Live' && <span className="text-xs text-slate-400">vs yesterday</span>}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ bills, inventory }) => {
  const dailyTotal = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bills
      .filter(b => b.date.startsWith(today))
      .reduce((acc, curr) => acc + curr.total, 0);
  }, [bills]);

  const stockValue = useMemo(() => inventory.reduce((total, p) => total + (p.stockQuantity * p.purchasePrice), 0), [inventory]);

  const formattedStockValue = useMemo(() => {
      if (stockValue >= 100000) return `₹ ${(stockValue / 100000).toFixed(2)}L`;
      if (stockValue >= 1000) return `₹ ${(stockValue / 1000).toFixed(1)}k`;
      return `₹ ${stockValue.toLocaleString()}`;
  }, [stockValue]);

  // Dead Stock Calculation
  const deadStockCount = useMemo(() => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      return inventory.filter(p => {
          // If never sold, treat created date as start? Assuming lastSoldDate is populated on creation or first sale
          if (!p.lastSoldDate) return false; 
          return new Date(p.lastSoldDate) < ninetyDaysAgo && p.stockQuantity > 0;
      }).length;
  }, [inventory]);

  // Chart Data
  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7DaysMap = new Map<string, number>();
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7DaysMap.set(d.toISOString().split('T')[0], 0);
    }
    bills.forEach(bill => {
        const dateKey = bill.date.split('T')[0];
        if (last7DaysMap.has(dateKey)) {
            last7DaysMap.set(dateKey, (last7DaysMap.get(dateKey) || 0) + bill.total);
        }
    });
    const result: any[] = [];
    last7DaysMap.forEach((val, key) => {
        result.push({ name: days[new Date(key).getDay()], sales: val });
    });
    return result;
  }, [bills]);

  // Top Selling
  const topSellingItems = useMemo(() => {
    const itemMap = new Map<string, number>();
    bills.forEach(bill => {
      bill.items.forEach(item => {
        itemMap.set(item.partName, (itemMap.get(item.partName) || 0) + item.quantity);
      });
    });
    return Array.from(itemMap.entries())
      .map(([name, qty]) => ({ name, stock: qty }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 4)
      .map((item, index) => ({
        ...item,
        color: index === 0 ? 'bg-indigo-100 text-indigo-700' : index === 1 ? 'bg-blue-100 text-blue-700' : index === 2 ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'
      }));
  }, [bills]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Shop Overview</h1>
          <p className="text-slate-500 mt-1">Sangli Refrigeration & Spares • Master Admin Control</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/pos" className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
            <Plus size={20} />
            <span>New Sale</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today's Sales" value={`₹ ${dailyTotal.toLocaleString()}`} change="+₹1,200" icon={IndianRupee} color="bg-indigo-600" />
        <StatCard title="Est. Profit" value={`₹ ${(dailyTotal * 0.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change="+8.2%" icon={TrendingUp} color="bg-emerald-500" />
        <StatCard title="Total Bills" value={bills.length} change={`+${bills.filter(b => b.date.startsWith(new Date().toISOString().split('T')[0])).length}`} icon={AlertTriangle} color="bg-amber-500" />
        <StatCard title="Stock Asset Value" value={formattedStockValue} change="Live" icon={PackageCheck} color="bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Weekly Sales</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Most Sold Parts</h3>
                <div className="space-y-4">
                    {topSellingItems.length > 0 ? topSellingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${item.color}`}>#{idx+1}</div>
                        <span className="font-semibold text-slate-700 truncate w-24 md:w-32">{item.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{item.stock} Sold</span>
                    </div>
                    )) : <div className="text-center py-8 text-slate-400 text-sm">No sales data yet</div>}
                </div>
            </div>

            {/* Dead Stock Alert Widget */}
            <div className="bg-orange-50 p-6 rounded-2xl shadow-sm border border-orange-100">
                <div className="flex items-center gap-3 mb-2 text-orange-700">
                    <Hourglass size={20} />
                    <h3 className="font-bold text-lg">Dead Stock Alert</h3>
                </div>
                <p className="text-sm text-orange-600 mb-4">Items not sold in the last 90+ days.</p>
                <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-orange-800">{deadStockCount}</span>
                    <span className="text-sm font-bold text-orange-600 mb-1">items found</span>
                </div>
                <Link to="/inventory" className="mt-4 block w-full py-2 bg-white text-orange-700 font-bold text-center rounded-xl text-sm border border-orange-200 hover:bg-orange-100 transition-colors">
                    Check Inventory
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
