
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  ShieldCheck, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Bell,
  DownloadCloud,
  AlertOctagon
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Khata from './pages/Khata';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import { SyncStatus, Product, BillItem, Bill, Technician, LedgerEntry, SecurityLog, StockLog, PriceLog } from './types';
import { MOCK_PRODUCTS, TECH_CODE as DEFAULT_TECH_CODE, MOCK_TECHNICIANS } from './constants';
import { playSound } from './services/sound';

const SidebarLink: React.FC<{ to: string, icon: any, label: string, active: boolean, collapsed: boolean, onClick?: () => void }> = ({ to, icon: Icon, label, active, collapsed, onClick }) => (
  <Link 
    to={to} 
    onClick={() => { playSound('click'); if(onClick) onClick(); }}
    className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'
    }`}
  >
    <Icon size={20} className="shrink-0" />
    <span className={`font-medium whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 lg:hidden' : 'opacity-100'}`}>{label}</span>
  </Link>
);

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sync, setSync] = useState<SyncStatus>({ status: 'Synced', lastSync: new Date().toLocaleTimeString() });
  const [safeMode, setSafeMode] = useState(false);
  
  // Settings
  const [noBillNoExit, setNoBillNoExit] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Global States
  const [inventory, setInventory] = useState<Product[]>(MOCK_PRODUCTS);
  const [cart, setCart] = useState<BillItem[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>(MOCK_TECHNICIANS);
  const [ledger, setLedger] = useState<LedgerEntry[]>([
    { id: 'L1', technicianId: 'T1', date: new Date().toISOString(), description: 'Opening Balance', amount: 1250, type: 'Debit' }
  ]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [priceLogs, setPriceLogs] = useState<PriceLog[]>([]);
  
  const [adminPin, setAdminPin] = useState("1234");
  const [techCode, setTechCode] = useState(DEFAULT_TECH_CODE);

  // Safe Mode Boot Check
  useEffect(() => {
    try {
        if (!inventory || !technicians) throw new Error("Critical Data Corrupt");
    } catch (e) {
        console.error("Boot failure, entering Safe Mode");
        setSafeMode(true);
        logSecurityEvent('SAFE_MODE', 'System booted in Safe Mode due to data error', 'high');
    }
  }, []);

  // No Bill No Exit: Prevent Unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (noBillNoExit && cart.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [noBillNoExit, cart]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  // --- LOGIC HELPERS ---

  const logSecurityEvent = (type: SecurityLog['type'], details: string, severity: 'low' | 'medium' | 'high') => {
    const newLog: SecurityLog = {
        id: `SEC-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        details,
        severity
    };
    setSecurityLogs(prev => [newLog, ...prev]);
  };

  const addStockLog = (log: StockLog) => setStockLogs(prev => [log, ...prev]);
  const addPriceLog = (log: PriceLog) => setPriceLogs(prev => [log, ...prev]);

  const calculateTrustScore = (tech: Technician) => {
    let score = 100;
    if (tech.balance < -(tech.limit * 0.8)) score -= 20;
    else if (tech.balance < -(tech.limit * 0.5)) score -= 10;
    if (tech.balance < -tech.limit) score -= 30;
    score = Math.max(0, Math.min(100, score));
    return {
        score,
        level: score >= 80 ? 'Reliable' : score >= 50 ? 'Average' : 'Risky'
    } as const;
  };

  useEffect(() => {
    setTechnicians(prev => prev.map(t => {
        const { score, level } = calculateTrustScore(t);
        return { ...t, trustScore: score, trustLevel: level };
    }));
  }, [ledger]);


  const handleInstallClick = async () => {
    playSound('click');
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } 
            : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        partName: product.partName, 
        quantity: 1, 
        price: product.customerPrice, 
        total: product.customerPrice 
      }];
    });
  };

  const addProduct = (newProduct: Product) => {
    setInventory(prev => [newProduct, ...prev]);
    logSecurityEvent('STOCK_EDIT', `Added new product: ${newProduct.partName}`, 'medium');
  };

  const addTechnician = (newTech: Technician) => {
    setTechnicians(prev => [newTech, ...prev]);
  };

  const saveBill = (bill: Bill) => {
    setBills(prev => [bill, ...prev]);
    
    // Update Inventory: Handle Returns (Add Stock) and Sales (Reduce Stock)
    setInventory(prevInv => prevInv.map(p => {
      const itemInBill = bill.items.find(bi => bi.productId === p.id);
      if (itemInBill) {
        // If price is negative, it's a return -> We ADD to stock
        // If price is positive, it's a sale -> We SUBTRACT from stock
        const isReturn = itemInBill.price < 0;
        const change = isReturn ? itemInBill.quantity : -itemInBill.quantity;
        const newQty = p.stockQuantity + change;

        return { 
            ...p, 
            stockQuantity: newQty,
            lastSoldDate: !isReturn ? new Date().toISOString() : p.lastSoldDate
        };
      }
      return p;
    }));

    // Log Returns in Stock Logs
    const returnItems = bill.items.filter(i => i.price < 0);
    if (returnItems.length > 0) {
        setStockLogs(prevLogs => {
            const newLogs = returnItems.map(item => {
                // Approximate new stock for log (current + returned qty)
                const p = inventory.find(prod => prod.id === item.productId);
                const currentStock = p ? p.stockQuantity : 0;
                
                const log: StockLog = {
                    id: `ST-RET-${Date.now()}-${item.productId}`,
                    date: new Date().toISOString(),
                    productId: item.productId,
                    productName: item.partName,
                    change: item.quantity,
                    reason: 'Return Restock',
                    newStock: currentStock + item.quantity
                };
                return log;
            });
            return [...newLogs, ...prevLogs];
        });
    }
  };

  const updateTechnicianBalance = (id: string, amount: number, type: 'Debit' | 'Credit', description?: string) => {
    setTechnicians(prev => prev.map(t => {
      if (t.id === id) {
        const change = type === 'Debit' ? amount : -amount;
        return { ...t, balance: t.balance + change };
      }
      return t;
    }));

    const newEntry: LedgerEntry = {
      id: `LG-${Date.now()}`,
      technicianId: id,
      date: new Date().toISOString(),
      description: description || (type === 'Debit' ? 'Manual Charge' : 'Payment Received'),
      amount: amount,
      type: type
    };
    setLedger(prev => [newEntry, ...prev]);
  };

  const handleImportData = (data: any) => {
    if (safeMode) setSafeMode(false);
    if (data.inventory) setInventory(data.inventory);
    if (data.bills) setBills(data.bills);
    if (data.technicians) setTechnicians(data.technicians);
    if (data.ledger) setLedger(data.ledger);
    if (data.adminPin) setAdminPin(data.adminPin);
    if (data.techCode) setTechCode(data.techCode);
    if (data.securityLogs) setSecurityLogs(data.securityLogs);
    if (data.stockLogs) setStockLogs(data.stockLogs);
    if (data.priceLogs) setPriceLogs(data.priceLogs);
  };

  const handleNavClick = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 overflow-hidden relative">
        {safeMode && (
            <div className="fixed top-0 left-0 right-0 h-1 bg-red-500 z-[100] animate-pulse"></div>
        )}

        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside 
          className={`
            fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 
            transition-all duration-300 flex flex-col
            ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}
          `}
        >
          <div className="p-6 flex items-center space-x-3 h-20 shrink-0">
            <div className={`${safeMode ? 'bg-red-600' : 'bg-indigo-600'} p-2 rounded-lg shrink-0`}>
              {safeMode ? <AlertOctagon className="text-white" size={24} /> : <ShieldCheck className="text-white" size={24} />}
            </div>
            <span className={`font-bold text-lg tracking-tight text-slate-800 whitespace-nowrap transition-opacity duration-200 ${!isSidebarOpen && !isMobile ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
              {safeMode ? 'SAFE MODE' : 'Sangli Ref.'}
            </span>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(false)} className="ml-auto text-slate-400">
                <X size={24} />
              </button>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            <SidebarContent 
              activePath={window.location.hash.replace('#', '')} 
              collapsed={!isSidebarOpen && !isMobile} 
              onNavClick={handleNavClick}
            />
          </nav>

          <div className="p-4 space-y-2 shrink-0">
            {showInstallBtn && isSidebarOpen && (
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-all animate-pulse"
              >
                <DownloadCloud size={18} />
                <span>Install App</span>
              </button>
            )}
            <div className="border-t border-slate-100 pt-4">
              <div className={`flex items-center ${!isSidebarOpen && !isMobile ? 'justify-center' : 'space-x-3'} text-slate-500`}>
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  sync.status === 'Synced' ? 'bg-green-500 animate-pulse-soft' : 
                  sync.status === 'Syncing' ? 'bg-yellow-500 animate-spin-slow' : 'bg-red-500'
                }`}></div>
                <span className={`text-xs font-semibold whitespace-nowrap transition-opacity duration-200 ${!isSidebarOpen && !isMobile ? 'lg:hidden' : ''}`}>
                  {sync.status}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden w-full relative">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 focus:outline-none"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center space-x-4 sm:space-x-6">
               <div className="relative cursor-pointer group" onClick={() => playSound('click')}>
                 <Link to="/pos">
                    <ShoppingCart size={20} className="text-slate-400 group-hover:text-indigo-600" />
                    {cart.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold animate-pop-in">
                        {cart.length}
                      </span>
                    )}
                 </Link>
               </div>
               <div className="relative">
                 <Bell size={20} className="text-slate-400 hover:text-indigo-600 cursor-pointer" onClick={() => playSound('click')} />
                 {securityLogs.length > 0 && (
                     <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{securityLogs.length}</span>
                 )}
               </div>
               <div className="flex items-center space-x-3 pl-4 sm:pl-6 border-l border-slate-200">
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-bold text-slate-800 leading-none">Admin User</p>
                   <p className="text-[10px] text-slate-400 font-medium mt-1">S-0012 MASTER</p>
                 </div>
                 <div className="w-9 h-9 bg-indigo-100 text-indigo-700 flex items-center justify-center rounded-full font-bold">
                   A
                 </div>
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-20 lg:pb-8">
            <Routes>
              <Route path="/" element={<Dashboard bills={bills} inventory={inventory} />} />
              <Route 
                path="/inventory" 
                element={
                  <Inventory 
                    inventory={inventory} 
                    addToCart={addToCart} 
                    addProduct={addProduct} 
                    setInventory={setInventory}
                    addStockLog={addStockLog}
                    addPriceLog={addPriceLog}
                  />
                } 
              />
              <Route 
                path="/pos" 
                element={
                  <POS 
                    inventory={inventory} 
                    cart={cart} 
                    setCart={setCart} 
                    techCode={techCode} 
                    adminPin={adminPin}
                    saveBill={saveBill} 
                    technicians={technicians}
                    updateTechBalance={updateTechnicianBalance}
                    logSecurityEvent={logSecurityEvent}
                    noBillNoExit={noBillNoExit}
                  />
                } 
              />
              <Route 
                path="/khata" 
                element={
                  <Khata 
                    technicians={technicians} 
                    setTechnicians={setTechnicians} 
                    updateTechBalance={updateTechnicianBalance} 
                    ledger={ledger}
                    addTechnician={addTechnician}
                  />
                } 
              />
              <Route path="/reports" element={<Reports bills={bills} />} />
              <Route 
                path="/settings" 
                element={
                  <SettingsPage 
                    adminPin={adminPin} 
                    setAdminPin={setAdminPin} 
                    techCode={techCode} 
                    setTechCode={setTechCode} 
                    installApp={handleInstallClick}
                    canInstall={showInstallBtn}
                    // Data Props for Backup
                    inventory={inventory}
                    bills={bills}
                    technicians={technicians}
                    ledger={ledger}
                    onImport={handleImportData}
                    securityLogs={securityLogs}
                    stockLogs={stockLogs}
                    priceLogs={priceLogs}
                    safeMode={safeMode}
                    noBillNoExit={noBillNoExit}
                    setNoBillNoExit={setNoBillNoExit}
                  />
                } 
              />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

const SidebarContent = ({ activePath, collapsed, onNavClick }: { activePath: string, collapsed: boolean, onNavClick: () => void }) => {
  const location = useLocation();
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/pos', icon: ShoppingCart, label: 'POS Billing' },
    { to: '/khata', icon: Users, label: 'Khata Book' },
    { to: '/reports', icon: BarChart3, label: 'Profit & Sales' },
    { to: '/settings', icon: Settings, label: 'System Settings' },
  ];

  return (
    <>
      {links.map((link) => (
        <SidebarLink 
          key={link.to} 
          {...link} 
          active={location.pathname === link.to} 
          collapsed={collapsed}
          onClick={onNavClick}
        />
      ))}
    </>
  );
};

export default App;
