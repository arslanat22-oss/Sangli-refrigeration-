
// ... (imports same as previous)
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Trash2, Search, Printer, Share2, User, Calculator, ShoppingCart, CheckCircle, 
  XCircle, ScanBarcode, X, AlertCircle, Edit3, Split, ShieldAlert, RotateCcw, Lightbulb, Lock
} from 'lucide-react';
import { Product, BillItem, Bill, PaymentMethod, Technician, SplitPayment, SecurityLog } from '../types';
import { playSound } from '../services/sound';

interface POSProps {
  inventory: Product[];
  cart: BillItem[];
  setCart: React.Dispatch<React.SetStateAction<BillItem[]>>;
  techCode: string;
  adminPin: string;
  saveBill: (bill: Bill) => void;
  technicians: Technician[];
  updateTechBalance: (id: string, amount: number, type: 'Debit' | 'Credit', description?: string) => void;
  logSecurityEvent: (type: SecurityLog['type'], details: string, severity: 'low' | 'medium' | 'high') => void;
  noBillNoExit: boolean;
}

const POS: React.FC<POSProps> = ({ inventory, cart, setCart, techCode, adminPin, saveBill, technicians, updateTechBalance, logSecurityEvent, noBillNoExit }) => {
  const [isGst, setIsGst] = useState(false);
  const [billType, setBillType] = useState<'Final' | 'Estimate'>('Final');
  const [customer, setCustomer] = useState({ name: '', mobile: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Payment State
  const [paymentMode, setPaymentMode] = useState<'Single' | 'Split'>('Single');
  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod>('Cash');
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
      { method: 'Cash', amount: 0 },
      { method: 'Khata', amount: 0 }
  ]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Return Mode State
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnReason, setReturnReason] = useState('Wrong Part Purchased');

  // No Bill No Exit State
  const [showExitPinModal, setShowExitPinModal] = useState(false);
  const [exitPin, setExitPin] = useState('');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScannedCode = useRef<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const cartEndRef = useRef<HTMLDivElement>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Khata Specific State
  const [selectedTechId, setSelectedTechId] = useState<string>('');

  // Coupon/Code state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ 
    code: string; 
    type: 'percent' | 'fixed' | 'tech' | 'manual'; 
    value: number;
    label: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Manual Adjustment State
  const [manualTotal, setManualTotal] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');

  // --- PRICING HELPERS ---

  const recalculateCartPrices = (targetType: 'tech' | 'customer') => {
    setCart(prev => prev.map(item => {
      const product = inventory.find(p => p.id === item.productId);
      if (!product) return item;
      
      const newPrice = targetType === 'tech' ? product.technicianPrice : product.customerPrice;
      
      if (item.price !== newPrice) {
        return {
          ...item,
          price: newPrice,
          total: newPrice * item.quantity
        };
      }
      return item;
    }));
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.total, 0), [cart]);
  
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'tech' || appliedCoupon.type === 'manual') return 0;

    if (appliedCoupon.type === 'percent') {
      return (subtotal * appliedCoupon.value) / 100;
    }
    return Math.min(appliedCoupon.value, subtotal);
  }, [subtotal, appliedCoupon]);

  const afterDiscount = subtotal - discountAmount;
  const gstAmount = isGst ? afterDiscount * 0.18 : 0;
  
  const calculatedTotal = afterDiscount + gstAmount;

  const total = appliedCoupon?.type === 'manual' && manualTotal 
    ? parseFloat(manualTotal) 
    : calculatedTotal;

  useEffect(() => {
    if (appliedCoupon?.type === 'manual' && manualTotal === '') {
        setManualTotal(calculatedTotal.toString());
    }
  }, [appliedCoupon, calculatedTotal]);

  useEffect(() => {
      if (paymentMode === 'Split') {
          // Default splits: 1. Payment (Cash), 2. Credit (Khata)
          setSplitPayments([
            { method: 'Cash', amount: total },
            { method: 'Khata', amount: 0 }
          ]);
      }
  }, [total, paymentMode]);


  const addToCart = (product: Product, isScan = false) => {
    if (product.stockQuantity === 0 && !isReturnMode) {
        playSound('scan-error');
        alert("Item out of stock! Check similar items.");
        return;
    }

    setLastAddedId(product.id);
    if (isScan) playSound('scan-success');
    else playSound('add-to-cart');

    const activePrice = appliedCoupon?.type === 'tech' ? product.technicianPrice : product.customerPrice;
    // In return mode, price is negative
    const finalPrice = isReturnMode ? -activePrice : activePrice;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        // If returning, we are subtracting quantity essentially, but logic keeps it simple: negative price
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * finalPrice } 
            : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        partName: product.partName, 
        quantity: 1, 
        price: finalPrice, 
        total: finalPrice 
      }];
    });
    setTimeout(() => setLastAddedId(null), 300);
  };

  const removeFromCart = (id: string) => {
    playSound('delete');
    setCart(prev => prev.filter(item => item.productId !== id));
  };

  // Fraud Detection: Void Bill Check
  const clearCart = () => {
    if (noBillNoExit && cart.length > 0) {
        setShowExitPinModal(true);
        return;
    }
    performClearCart();
  };

  const performClearCart = () => {
    if (cart.length > 0 && total > 2000) {
        logSecurityEvent('VOID_BILL', `Cart cleared with value ₹${total}. Items: ${cart.length}`, 'medium');
    }
    setCart([]);
    setAppliedCoupon(null);
    setIsReturnMode(false); // Reset return mode
    playSound('delete');
  };

  const validateExitPin = () => {
      if (exitPin === adminPin) {
          setShowExitPinModal(false);
          setExitPin('');
          performClearCart();
      } else {
          alert("Incorrect PIN");
      }
  };

  // --- SCANNING LOGIC ---
  const startScanning = async () => {
    setCameraError('');
    setScanFeedback(null);
    lastScannedCode.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setIsScanning(true);
    } catch (err) {
      setCameraError('Unable to access camera.');
    }
  };

  const stopScanning = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setIsScanning(false);
  };

  useEffect(() => {
    let interval: any;
    let fallbackTimer: any;
    if (isScanning && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      const hasBarcodeDetector = 'BarcodeDetector' in window;
      if (hasBarcodeDetector) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'upc_a', 'upc_e'] });
          interval = setInterval(async () => {
              if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) handleScannedProduct(barcodes[0].rawValue);
              } catch (e) {}
          }, 500);
        } catch (e) { runFallbackSimulation(); }
      } else { runFallbackSimulation(); }
    }
    function runFallbackSimulation() {
       fallbackTimer = setInterval(() => {
           if (inventory.length > 0 && isScanning) {
               const randomProduct = inventory[Math.floor(Math.random() * inventory.length)];
               handleScannedProduct(randomProduct.barcode);
           }
       }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [isScanning, cameraStream, inventory]);

  const handleScannedProduct = (code: string) => {
    if (lastScannedCode.current === code) return; 
    const product = inventory.find(p => p.barcode === code);
    lastScannedCode.current = code;
    setTimeout(() => { lastScannedCode.current = null; }, 2000);
    if (product) {
      addToCart(product, true);
      setScanFeedback({ type: 'success', message: `Added: ${product.partName}` });
      setTimeout(() => setScanFeedback(null), 2000);
    } else {
       playSound('scan-error');
       setScanFeedback({ type: 'error', message: `Not Found: ${code}` });
       setTimeout(() => setScanFeedback(null), 2000);
    }
  };

  // --- COUPON & CODE LOGIC ---
  const applyCode = () => {
    const input = couponInput.toUpperCase().trim();
    setCouponError('');
    if (!input) return;
    playSound('click');
    if (input === techCode.toUpperCase()) {
      setAppliedCoupon({ code: input, type: 'tech', value: 0, label: 'Technician Rates Applied' });
      recalculateCartPrices('tech'); 
      setCouponInput('');
      playSound('scan-success');
      return;
    }
    if (input === 'A') {
        setAppliedCoupon({ code: input, type: 'manual', value: 0, label: 'Manual Adjustment' });
        setManualTotal(calculatedTotal.toString());
        setCouponInput('');
        playSound('scan-success');
        return;
    }
    if (input === 'SANGLI10') {
      setAppliedCoupon({ code: input, type: 'percent', value: 10, label: 'Promo Discount (10%)' });
      recalculateCartPrices('customer'); 
    } else if (input === 'DISCOUNT50') {
      setAppliedCoupon({ code: input, type: 'fixed', value: 50, label: 'Flat ₹50 Off' });
      recalculateCartPrices('customer');
    } else {
      playSound('scan-error');
      setCouponError('Invalid Code');
      return;
    }
    setCouponInput('');
  };

  const removeCoupon = () => {
      setAppliedCoupon(null);
      setManualTotal('');
      setManualDescription('');
      recalculateCartPrices('customer');
      playSound('delete');
  };

  // --- CHECKOUT LOGIC ---
  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMode === 'Split') {
        const splitTotal = splitPayments.reduce((acc, curr) => acc + curr.amount, 0);
        if (Math.abs(splitTotal - total) > 1) { 
            alert(`Split total (${splitTotal}) must match bill total (${total})`);
            return;
        }
    }

    const newBillId = `BL-${Date.now()}`;
    let finalDescription = appliedCoupon?.type === 'manual' 
        ? (manualDescription ? `Manual Adj: ${manualDescription}` : 'Price Adjusted Manually') 
        : '';
    
    if (isReturnMode) {
        finalDescription = `RETURN: ${returnReason}`;
    }

    const paymentsToProcess = paymentMode === 'Split' ? splitPayments : [{ method: primaryMethod, amount: total }];

    for (const payment of paymentsToProcess) {
        if (payment.method === 'Khata' && payment.amount !== 0) {
            if (!selectedTechId) {
                alert("Please select a technician for Khata payment.");
                return;
            }
            let itemSummary = cart.map(i => `${i.partName} (${i.quantity})`).join(', ');
            if (finalDescription) itemSummary += ` | ${finalDescription}`;
            
            const desc = `Bill #${newBillId.slice(-4)} (Partial): ${itemSummary.substring(0, 50)}...`;
            // If return mode, amount is negative, so 'Credit' to tech balance if Khata used for refund (unlikely but logic holds)
            // Usually returns are cash or credit. If bill total is negative, Khata becomes 'Credit' (we owe them).
            const type = payment.amount < 0 ? 'Credit' : 'Debit';
            updateTechBalance(selectedTechId, Math.abs(payment.amount), type, desc);
        }
    }

    let finalCustomerName = customer.name;
    let finalCustomerMobile = customer.mobile;

    if (selectedTechId) {
        const tech = technicians.find(t => t.id === selectedTechId);
        if (tech) {
            finalCustomerName = tech.name;
            finalCustomerMobile = tech.mobile;
        }
    } else if (!finalCustomerName) {
        finalCustomerName = 'Walk-in Customer';
    }

    const newBill: Bill = {
      id: newBillId,
      date: new Date().toISOString(),
      items: [...cart],
      subtotal,
      gst: gstAmount,
      total,
      type: billType,
      customerName: finalCustomerName,
      customerMobile: finalCustomerMobile,
      paymentMethod: paymentMode === 'Split' ? 'Split' : primaryMethod,
      payments: paymentsToProcess,
      isPaid: !paymentsToProcess.every(p => p.method === 'Khata'),
      notes: finalDescription
    };

    saveBill(newBill);
    setShowPaymentModal(false);
    setShowSuccess(true);
    playSound('payment-success');
    
    setTimeout(() => {
      setCart([]);
      setCustomer({ name: '', mobile: '' });
      setSelectedTechId('');
      setAppliedCoupon(null);
      setManualTotal('');
      setManualDescription('');
      setPrimaryMethod('Cash');
      setPaymentMode('Single');
      setIsReturnMode(false);
      setShowSuccess(false);
    }, 3000);
  };

  const updateSplitAmount = (index: number, amount: string) => {
      const val = parseFloat(amount) || 0;
      const newSplits = [...splitPayments];
      newSplits[index].amount = val;
      setSplitPayments(newSplits);
  };

  const handlePrint = () => {
    if (cart.length === 0) return;
    playSound('click');
    window.print();
  };

  const handleShare = async () => {
    if (cart.length === 0) return;
    playSound('click');
    const itemsList = cart.map(item => `${item.partName} x ${item.quantity} = Rs.${item.total}`).join('\n');
    const billText = `
*Sangli Refrigeration & Spares*
Bill ID: BL-${Date.now().toString().slice(-6)}
Total: Rs.${total}
    `.trim();

    if (navigator.share) {
        try { await navigator.share({ title: 'Bill', text: billText }); } catch (error) {}
    } else {
        try { await navigator.clipboard.writeText(billText); alert("Copied!"); } catch (err) {}
    }
  };

  // Filter products based on search
  const filteredProducts = useMemo(() => {
      return inventory.filter(p => 
          p.partName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [inventory, searchTerm]);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 relative">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-bill, .printable-bill * { visibility: visible; }
          .printable-bill { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; color: black !important; background: white !important; z-index: 9999; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* No Exit PIN Modal */}
      {showExitPinModal && (
          <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white p-6 rounded-2xl w-full max-w-xs text-center animate-shake">
                  <Lock size={32} className="mx-auto mb-2 text-red-500" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Exit Blocked</h3>
                  <p className="text-xs text-slate-500 mb-4">"No Bill No Exit" rule is active. Enter Admin PIN to clear cart.</p>
                  <input type="password" autoFocus className="w-full p-3 border rounded-xl text-center text-xl mb-4" value={exitPin} onChange={e => setExitPin(e.target.value)} />
                  <div className="flex gap-2">
                      <button onClick={() => {setShowExitPinModal(false); setExitPin('');}} className="flex-1 py-2 text-slate-500 font-bold">Cancel</button>
                      <button onClick={validateExitPin} className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold">Unlock</button>
                  </div>
              </div>
          </div>
      )}

      {/* Scanner Overlay ... same as before */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
             <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-3xl overflow-hidden border-2 border-slate-700">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <button onClick={stopScanning} className="absolute top-4 right-4 bg-white/20 p-3 rounded-full text-white z-10"><X size={24}/></button>
             </div>
        </div>
      )}

      {/* Left Column: Items */}
      <div className="flex-1 flex flex-col space-y-4 no-print min-h-0">
         {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input type="text" placeholder="Search parts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500" />
           </div>
           <button onClick={startScanning} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex items-center space-x-2"><ScanBarcode size={20} /><span className="hidden sm:inline font-bold text-sm">Scan</span></button>
        </div>

        {/* Product Grid */}
        <div className="bg-white flex-1 rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Stock</h3>
              {isReturnMode && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold uppercase">Return Mode Active</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(p => {
              // Similar Part Logic: If 0 stock, show faded or alternative
              const isOutOfStock = p.stockQuantity === 0;
              return (
              <div key={p.id} className={`group relative flex flex-col justify-between h-full p-3 rounded-xl border transition-all ${isOutOfStock ? 'bg-slate-50 border-slate-100 opacity-80' : 'border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 active:scale-95 cursor-pointer'}`}
                   onClick={() => !isOutOfStock && addToCart(p)}>
                <div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mb-2">{p.partName}</p>
                    {isOutOfStock && (
                        <div className="bg-orange-100 text-orange-700 text-[10px] p-1 rounded font-bold mb-1 flex items-center gap-1">
                            <Lightbulb size={10} /> Out of Stock
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-mono font-bold text-indigo-600">₹{appliedCoupon?.type === 'tech' ? p.technicianPrice : p.customerPrice}</span>
                  <span className={`text-[10px] ${p.stockQuantity < 5 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>{p.stockQuantity}</span>
                </div>
                
                {/* Similar Part Suggestion Button (Simulated logic: same type) */}
                {isOutOfStock && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            setSearchTerm(p.partType); // Quick hack to show similar parts
                            alert(`Showing similar ${p.partType} parts`);
                        }}
                        className="mt-2 w-full py-1 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded"
                    >
                        Find Similar
                    </button>
                )}
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* Right Column: Cart */}
      <div ref={cartEndRef} className="w-full lg:w-[400px] flex flex-col space-y-4 printable-bill pb-20 lg:pb-0">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex-1 flex flex-col">
            {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div><h2 className="text-xl font-extrabold text-slate-800">Sangli Ref. & Spares</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Bill</p></div>
            <div className="flex p-1 bg-slate-100 rounded-lg no-print">
              <button onClick={() => setBillType('Final')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase ${billType === 'Final' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Final</button>
              <button onClick={() => setBillType('Estimate')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase ${billType === 'Estimate' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Estimate</button>
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
               <User size={18} className="text-slate-400 no-print" />
               <div className="flex-1">
                 <input type="text" placeholder="Customer Name" className="w-full bg-transparent outline-none text-sm font-bold text-slate-700" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                 <input type="tel" placeholder="Mobile" className="w-full bg-transparent outline-none text-[10px] text-slate-400" value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} />
               </div>
            </div>
          </div>

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto min-h-[150px] mb-6 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 no-print"><ShoppingCart size={48} className="mb-4 opacity-20" /><p className="text-sm font-medium">Cart is Empty</p></div>
            ) : (
              cart.map(item => (
                <div key={item.productId} className={`flex justify-between items-start border-b border-slate-50 pb-2 ${item.productId === lastAddedId ? 'bg-green-50/50' : ''}`}>
                  <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700 line-clamp-1">{item.partName}</p>
                      <p className="text-xs text-slate-400">{item.price < 0 ? 'RETURN' : ''} ₹{Math.abs(item.price)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center space-x-2"><span className={`text-sm font-bold ${item.total < 0 ? 'text-red-500' : 'text-slate-800'}`}>₹{item.total}</span><button onClick={() => removeFromCart(item.productId)} className="p-1 text-slate-300 hover:text-red-500 no-print"><Trash2 size={14} /></button></div>
                </div>
              ))
            )}
          </div>
          
          {/* Clear Cart & Return Mode */}
          <div className="flex justify-between mb-2 no-print">
              <button 
                onClick={() => { setIsReturnMode(!isReturnMode); playSound('click'); }} 
                className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${isReturnMode ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                  <RotateCcw size={12} /> {isReturnMode ? 'Return Mode ON' : 'Return Item'}
              </button>
              {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded">Void Bill</button>}
          </div>

          {/* Return Reason Prompt */}
          {isReturnMode && (
              <div className="bg-red-50 p-2 rounded-lg mb-2 no-print animate-slide-up">
                  <label className="text-[10px] font-bold text-red-400 uppercase block mb-1">Why Returned?</label>
                  <select value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full p-1 bg-white border border-red-200 rounded text-xs">
                      <option>Wrong Part Purchased</option>
                      <option>Defective / Warranty</option>
                      <option>Customer Changed Mind</option>
                      <option>Technician Error</option>
                  </select>
              </div>
          )}

          {/* Coupon Input */}
          <div className="border-t border-slate-100 pt-4 pb-4 no-print">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Discount Code</label>
              {appliedCoupon && <button onClick={removeCoupon} className="text-[10px] font-bold text-red-500 flex items-center"><XCircle size={10} className="mr-1" /> Remove</button>}
            </div>
            {!appliedCoupon ? (
              <div className="flex space-x-2">
                <input type="text" placeholder="Enter Code (e.g. A, TECH)..." value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm" />
                <button onClick={applyCode} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Apply</button>
              </div>
            ) : (
              <div className={`border p-2 rounded-xl flex justify-between items-center text-xs bg-emerald-50 border-emerald-100`}>
                <span className="font-bold text-emerald-700">{appliedCoupon.label}</span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-slate-500"><span className="text-xs font-medium">Subtotal</span><span className="text-xs font-bold font-mono">₹{subtotal.toLocaleString()}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span className="text-xs font-medium">Discount</span><span className="text-xs font-bold font-mono">-₹{discountAmount.toLocaleString()}</span></div>}
            
            <div className="flex justify-between pt-3 border-t border-slate-50">
              <span className="text-lg font-bold text-slate-800">Grand Total</span>
              <span className="text-2xl font-black text-indigo-600 font-mono">₹{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Stamp for Print View Only */}
          <div className="mt-8 flex justify-end no-print hidden">
              <div className="relative text-center">
                  <div className="w-24 h-24 rounded-full border-4 border-red-500/80 flex flex-col items-center justify-center rotate-[-12deg] relative mx-auto opacity-70">
                      <div className="absolute inset-1 rounded-full border border-red-500 opacity-40"></div>
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Sangli</p>
                      <p className="text-[8px] font-bold text-red-500 uppercase tracking-tighter">Refrigeration</p>
                      <p className="text-xs font-black text-red-600 uppercase mt-1">PAID</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-2">Authorized Signatory</p>
              </div>
          </div>
          <style>{`
             @media print {
                 .no-print.hidden { display: flex !important; }
             }
          `}</style>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-6 no-print">
             <button onClick={startScanning} className="col-span-1 flex items-center justify-center bg-slate-800 text-white rounded-xl font-bold" title="Scan"><ScanBarcode size={20} /></button>
             <button onClick={handlePrint} disabled={cart.length === 0} className="col-span-1 flex items-center justify-center bg-slate-100 text-slate-700 rounded-xl font-bold" title="Print"><Printer size={20} /></button>
             <button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0} className="col-span-2 flex items-center justify-center space-x-2 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95"><Calculator size={18} /><span>Checkout</span></button>
          </div>
          <button onClick={handleShare} disabled={cart.length === 0} className="mt-3 w-full flex items-center justify-center space-x-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 no-print"><Share2 size={18} /><span>Share Bill</span></button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
             </div>
             
             <div className="space-y-4">
               <div className="text-center mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Payable</p>
                  <p className="text-4xl font-black text-indigo-600 font-mono">₹{total.toLocaleString()}</p>
               </div>
               
               {/* Split Mode Toggle */}
               <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                   <button onClick={() => setPaymentMode('Single')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMode === 'Single' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Single Mode</button>
                   <button onClick={() => setPaymentMode('Split')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${paymentMode === 'Split' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Split size={12}/> Bill Split</button>
               </div>

               {paymentMode === 'Single' ? (
                   <div className="grid grid-cols-3 gap-2">
                   {['Cash', 'Online', 'Khata'].map((method) => (
                      <button 
                        key={method}
                        onClick={() => setPrimaryMethod(method as PaymentMethod)}
                        className={`py-3 rounded-xl text-xs font-bold border-2 transition-all ${primaryMethod === method ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                      >
                        {method}
                      </button>
                   ))}
                 </div>
               ) : (
                   <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                       {splitPayments.map((split, idx) => (
                           <div key={idx} className="flex items-center gap-2 mb-2">
                               <select 
                                 value={split.method}
                                 onChange={(e) => {
                                     const newSplits = [...splitPayments];
                                     newSplits[idx].method = e.target.value as PaymentMethod;
                                     setSplitPayments(newSplits);
                                 }}
                                 className={`bg-white border rounded-lg p-2 text-xs font-bold outline-none ${split.method === 'Khata' ? 'border-red-300 text-red-600 bg-red-50' : 'border-slate-200 text-slate-700'}`}
                               >
                                   <option>Cash</option>
                                   <option>Online</option>
                                   <option>Khata</option>
                               </select>
                               <div className="relative flex-1">
                                   <input 
                                     type="number"
                                     value={split.amount}
                                     onChange={(e) => updateSplitAmount(idx, e.target.value)}
                                     className={`w-full p-2 border rounded-lg text-sm font-bold outline-none ${
                                         split.method === 'Khata' 
                                         ? 'border-red-300 text-red-600 bg-red-50 focus:ring-red-500' 
                                         : 'border-slate-200 focus:ring-indigo-500'
                                     }`}
                                   />
                                   {split.method === 'Khata' && (
                                       <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-50 px-1">
                                           Credit
                                       </span>
                                   )}
                                   {idx === 0 && split.method !== 'Khata' && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>}
                               </div>
                           </div>
                       ))}
                       <div className="text-right text-xs pt-2 border-t border-slate-200">
                           <span className={Math.abs(splitPayments.reduce((a,c)=>a+c.amount,0) - total) < 1 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                               Total: {splitPayments.reduce((a,c)=>a+c.amount,0)} / {total}
                           </span>
                       </div>
                   </div>
               )}

               {/* Khata Selector */}
               {(primaryMethod === 'Khata' || (paymentMode === 'Split' && splitPayments.some(p => p.method === 'Khata'))) && (
                 <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 animate-in fade-in">
                    <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 block">Select Technician</label>
                    <select 
                      value={selectedTechId} 
                      onChange={(e) => setSelectedTechId(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-amber-200 text-sm font-bold text-slate-700 outline-none"
                    >
                      <option value="">-- Select Tech --</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (Bal: {t.balance})</option>
                      ))}
                    </select>
                 </div>
               )}

               <button onClick={handleCheckout} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 mt-4">Confirm & Print Bill</button>
             </div>
          </div>
        </div>
      )}

      {showSuccess && (
         <div className="fixed inset-0 bg-emerald-500 z-[150] flex items-center justify-center animate-out fade-out duration-1000 delay-[2000ms]">
            <div className="text-center text-white animate-in zoom-in duration-300">
               <div className="w-24 h-24 bg-white text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"><CheckCircle size={64} /></div>
               <h2 className="text-3xl font-black">Payment Successful!</h2>
            </div>
         </div>
      )}
    </div>
  );
};

export default POS;
