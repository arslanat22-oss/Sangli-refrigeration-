
import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Mic, Image as ImageIcon, MapPin, Loader2, X, Package, Camera, ScanBarcode, CameraOff, AlertCircle, FileUp, Download, StickyNote, Lock, Box, Calendar, ClipboardCheck } from 'lucide-react';
import { MachineType, Product, StockAdjustmentReason, StockLog, PriceLog } from '../types';
import PriceRevealer from '../components/PriceRevealer';
import { analyzeProductImage } from '../services/gemini';
import { playSound } from '../services/sound';
import { ADMIN_PIN } from '../constants';

interface InventoryProps {
  inventory: Product[];
  addToCart: (product: Product) => void;
  addProduct: (product: Product) => void;
  setInventory: React.Dispatch<React.SetStateAction<Product[]>>;
  addStockLog: (log: StockLog) => void;
  addPriceLog: (log: PriceLog) => void;
}

const Inventory: React.FC<InventoryProps> = ({ inventory, addToCart, addProduct, setInventory, addStockLog, addPriceLog }) => {
  const [filter, setFilter] = useState<MachineType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Scanning States
  const [isScanning, setIsScanning] = useState(false); 
  const [isModalScanning, setIsModalScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  
  // Refs
  const searchVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  
  const [detectionResult, setDetectionResult] = useState<{ partType: string; brand: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Stock Adjustment State
  const [showStockReasonModal, setShowStockReasonModal] = useState(false);
  const [pendingProductData, setPendingProductData] = useState<Product | null>(null);
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState<StockAdjustmentReason>('Audit Correction');
  const [stockAdjustmentDiff, setStockAdjustmentDiff] = useState(0);

  // Admin Auth
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const modalImageInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialFormState = {
    barcode: '',
    machineType: MachineType.AC,
    brand: '',
    partName: '',
    customerPrice: 0,
    technicianPrice: 0,
    purchasePrice: 0,
    stockQuantity: 0,
    rackLocation: '',
    images: [],
    compatibilityRaw: '',
    ownerNotes: '',
    // Tracking Info
    trackingBatch: '',
    trackingInvoice: '',
    trackingDate: ''
  };

  const [newPart, setNewPart] = useState<Partial<Product> & { compatibilityRaw: string, trackingBatch: string, trackingInvoice: string, trackingDate: string }>(initialFormState);

  // --- CAMERA & SCANNING LOGIC ---
  const startCamera = async (mode: 'search' | 'modal') => {
    playSound('click');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (mode === 'search') setIsScanning(true);
      else setIsModalScanning(true);
    } catch (err) {
      setCameraError('Camera access denied or unavailable.');
      playSound('scan-error');
      alert("Unable to access camera.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setIsScanning(false);
    setIsModalScanning(false);
  };

  useEffect(() => {
    const attachStream = (videoEl: HTMLVideoElement | null) => {
      if (videoEl && cameraStream) {
        videoEl.srcObject = cameraStream;
        detectBarcode(videoEl, isScanning ? 'search' : 'modal');
      }
    };
    // Attach to correct video element based on mode
    if (isScanning) attachStream(searchVideoRef.current);
    if (isModalScanning) attachStream(modalVideoRef.current);
  }, [isScanning, isModalScanning, cameraStream]);

  const detectBarcode = async (videoEl: HTMLVideoElement, mode: 'search' | 'modal') => {
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'upc_a', 'upc_e'] });
      const interval = setInterval(async () => {
        if (!videoEl || videoEl.paused || videoEl.ended) { clearInterval(interval); return; }
        try {
          const barcodes = await detector.detect(videoEl);
          if (barcodes.length > 0) {
            handleScanSuccess(barcodes[0].rawValue, mode);
            clearInterval(interval);
          }
        } catch (e) { }
      }, 500);
      return () => clearInterval(interval);
    } else {
      setTimeout(() => {
         const simCode = mode === 'search' && inventory.length > 0 
            ? inventory[Math.floor(Math.random() * inventory.length)].barcode 
            : `SCAN-${Math.floor(1000 + Math.random() * 9000)}`;
         handleScanSuccess(simCode, mode);
      }, 3000);
    }
  };

  const handleScanSuccess = (code: string, mode: 'search' | 'modal') => {
    playSound('scan-success');
    stopCamera();
    if (mode === 'search') setSearchQuery(code);
    else setNewPart(prev => ({ ...prev, barcode: code }));
  };

  // --- EDIT LOGIC ---
  const handleEditProduct = (product: Product) => {
    playSound('click');
    setEditingId(product.id);
    setNewPart({
      barcode: product.barcode,
      machineType: product.machineType,
      brand: product.brand,
      partName: product.partName,
      customerPrice: product.customerPrice,
      technicianPrice: product.technicianPrice,
      purchasePrice: product.purchasePrice,
      stockQuantity: product.stockQuantity,
      rackLocation: product.rackLocation,
      images: product.images,
      compatibilityRaw: product.compatibleModels.join(', '),
      ownerNotes: product.ownerNotes || '',
      trackingBatch: product.trackingInfo?.batchNumber || '',
      trackingInvoice: product.trackingInfo?.supplierInvoice || '',
      trackingDate: product.trackingInfo?.purchaseDate || ''
    });
    setShowAddModal(true);
  };

  const checkPriceChanges = (oldP: Product, newP: Product) => {
      if (oldP.customerPrice !== newP.customerPrice) {
          addPriceLog({
              id: `PR-${Date.now()}-1`, date: new Date().toISOString(),
              productId: oldP.id, productName: oldP.partName,
              field: 'Customer', oldVal: oldP.customerPrice, newVal: newP.customerPrice, user: 'Admin'
          });
      }
      if (oldP.technicianPrice !== newP.technicianPrice) {
          addPriceLog({
              id: `PR-${Date.now()}-2`, date: new Date().toISOString(),
              productId: oldP.id, productName: oldP.partName,
              field: 'Technician', oldVal: oldP.technicianPrice, newVal: newP.technicianPrice, user: 'Admin'
          });
      }
      if (oldP.purchasePrice !== newP.purchasePrice) {
          addPriceLog({
              id: `PR-${Date.now()}-3`, date: new Date().toISOString(),
              productId: oldP.id, productName: oldP.partName,
              field: 'Purchase', oldVal: oldP.purchasePrice, newVal: newP.purchasePrice, user: 'Admin'
          });
      }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    const compatibilityArray = newPart.compatibilityRaw ? newPart.compatibilityRaw.split(',').map(s => s.trim()) : ['Universal'];
    const finalBarcode = newPart.barcode && newPart.barcode.trim() !== '' ? newPart.barcode : `BR-${Math.floor(1000 + Math.random() * 9000)}`;

    const trackingInfo = (newPart.trackingBatch || newPart.trackingInvoice) ? {
        batchNumber: newPart.trackingBatch,
        supplierInvoice: newPart.trackingInvoice,
        purchaseDate: newPart.trackingDate || new Date().toISOString().split('T')[0]
    } : undefined;

    const productData: Product = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      barcode: finalBarcode,
      machineType: newPart.machineType || MachineType.AC,
      brand: newPart.brand || 'Generic',
      partType: newPart.partName?.split(' ')[0] || 'Spare',
      partName: newPart.partName || 'New Product',
      compatibleModels: compatibilityArray,
      rackLocation: newPart.rackLocation || 'General',
      stockQuantity: newPart.stockQuantity || 0,
      lowStockThreshold: 5,
      supplierName: 'Direct Entry',
      purchasePrice: newPart.purchasePrice || 0,
      technicianPrice: newPart.technicianPrice || 0,
      customerPrice: newPart.customerPrice || 0,
      images: newPart.images && newPart.images.length > 0 ? newPart.images : ['https://picsum.photos/seed/part/400/300'],
      isFastMoving: false,
      ownerNotes: newPart.ownerNotes,
      lastSoldDate: newPart.lastSoldDate || new Date().toISOString(),
      trackingInfo: trackingInfo
    };

    if (editingId) {
      // Logic for Update
      const oldProduct = inventory.find(p => p.id === editingId);
      if (oldProduct) {
          checkPriceChanges(oldProduct, productData);
          
          if (oldProduct.stockQuantity !== productData.stockQuantity) {
              // STOP! Ask for reason.
              setPendingProductData(productData);
              setStockAdjustmentDiff(productData.stockQuantity - oldProduct.stockQuantity);
              setShowStockReasonModal(true);
              return; 
          }
      }
      setInventory(prev => prev.map(p => p.id === editingId ? productData : p));
    } else {
      // Create New
      addProduct(productData);
      addStockLog({
          id: `ST-${Date.now()}`, date: new Date().toISOString(),
          productId: productData.id, productName: productData.partName,
          change: productData.stockQuantity, reason: 'New Stock', newStock: productData.stockQuantity
      });
    }
    
    finalizeClose();
  };

  const confirmStockAdjustment = () => {
      if (!pendingProductData) return;
      
      setInventory(prev => prev.map(p => p.id === pendingProductData.id ? pendingProductData : p));
      
      // Log Stock Change
      addStockLog({
          id: `ST-${Date.now()}`,
          date: new Date().toISOString(),
          productId: pendingProductData.id,
          productName: pendingProductData.partName,
          change: stockAdjustmentDiff,
          reason: stockAdjustmentReason,
          newStock: pendingProductData.stockQuantity
      });

      playSound('payment-success');
      setShowStockReasonModal(false);
      setPendingProductData(null);
      finalizeClose();
  };

  const finalizeClose = () => {
    playSound('payment-success');
    closeModal();
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setNewPart(initialFormState);
    stopCamera();
  };

  // ... existing filters & utils ...
  const calculateDeadStockStatus = (lastSold?: string) => {
      if (!lastSold) return 'normal';
      const days = (new Date().getTime() - new Date(lastSold).getTime()) / (1000 * 3600 * 24);
      if (days > 180) return 'critical';
      if (days > 90) return 'warning';
      return 'normal';
  };

  const products = inventory.filter(p => {
    const matchesFilter = filter === 'All' || p.machineType === filter;
    const matchesSearch = p.partName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.compatibleModels.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    playSound('click');
    if (inventory.length === 0) {
      playSound('scan-error');
      alert("Inventory is empty!");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inventory, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sangli_inventory_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setInventory(json);
          playSound('scan-success');
          alert(`Successfully imported ${json.length} items!`);
        } else {
            playSound('scan-error');
            alert('Invalid JSON structure. Must be an array of products.');
        }
      } catch (err) {
        playSound('scan-error');
        alert('Invalid file format. Please upload a valid inventory JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setDetectionResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await analyzeProductImage(base64);
        if (result) {
          playSound('scan-success');
          setDetectionResult({ partType: result.partType, brand: result.brand });
          setSearchQuery(`${result.brand} ${result.partType}`);
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Image search failed:", error);
      playSound('scan-error');
      setIsAnalyzing(false);
    }
    if (event.target) event.target.value = '';
  };

  const handleModalImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewPart({ ...newPart, images: [reader.result as string] });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" capture="environment" />
      <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />
      
      {/* Universal Scanner Overlay */}
      {(isScanning || isModalScanning) && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl">
            {/* Dynamic Ref based on mode */}
            <video 
                ref={isScanning ? searchVideoRef : modalVideoRef} 
                autoPlay playsInline muted 
                className="w-full h-full object-cover" 
            />
            <button onClick={stopCamera} className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-3 rounded-full text-white z-10"><X size={24} /></button>
            <div className="absolute bottom-10 left-0 right-0 text-center text-white font-bold bg-black/50 p-2 backdrop-blur-md">
                {isScanning ? 'Scan to Search' : 'Scan Product Barcode'}
            </div>
          </div>
        </div>
      )}

      {/* Main UI Structure */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stock Inventory</h1>
          <p className="text-slate-500 text-sm">Manage {inventory.length} parts in stock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { playSound('click'); importInputRef.current?.click(); }} className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all">
            <FileUp size={18} /> <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={handleExport} className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all">
            <Download size={18} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => startCamera('search')} className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-900 transition-all">
            <ScanBarcode size={18} /> <span className="hidden sm:inline">Scan</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all">
            <Plus size={18} /> <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" />
          <button onClick={() => fileInputRef.current?.click()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded-lg text-slate-400"><ImageIcon size={18} /></button>
        </div>
        <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto whitespace-nowrap">
          {['All', ...Object.values(MachineType)].map((type) => (
            <button key={type} onClick={() => setFilter(type as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{type}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
            const deadStockStatus = calculateDeadStockStatus(product.lastSoldDate);
            const borderClass = deadStockStatus === 'critical' ? 'border-red-500 ring-1 ring-red-500' : deadStockStatus === 'warning' ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-slate-100';
            const isOutOfStock = product.stockQuantity <= 0;

            return (
              <div key={product.id} className={`bg-white rounded-2xl overflow-hidden border transition-all duration-300 group ${borderClass} ${isOutOfStock ? 'opacity-90' : 'hover:shadow-xl'}`}>
                <div className="relative h-48 bg-slate-200">
                  <div className={`w-full h-full relative ${isOutOfStock ? 'grayscale' : ''}`}>
                      <img src={product.images[0]} alt={product.partName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {/* SOLD OUT BLACK OVERLAY */}
                      {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center">
                              <div className="border-4 border-white p-2 transform -rotate-12 animate-pulse">
                                  <span className="text-white text-2xl font-black uppercase tracking-widest">SOLD OUT</span>
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="absolute top-3 right-3 flex flex-col space-y-2 items-end z-20">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isOutOfStock ? 'bg-black text-white' : 
                        product.stockQuantity <= product.lowStockThreshold ? 'bg-red-500 text-white animate-pulse' : 'bg-green-500 text-white'
                    }`}>
                        {isOutOfStock ? 'Stock: 0' : (product.stockQuantity <= product.lowStockThreshold ? 'Low Stock' : 'In Stock')}
                    </span>
                    {product.trackingInfo && <span className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold flex items-center"><Box size={10} className="mr-1"/> Tracked</span>}
                  </div>
                  <div className="absolute bottom-3 left-3 flex space-x-2 z-20">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white rounded text-[10px] font-medium flex items-center"><MapPin size={10} className="mr-1" /> {product.rackLocation}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div><h3 className="font-bold text-slate-800 leading-tight mb-1">{product.partName}</h3><p className="text-xs text-slate-400 font-mono">{product.barcode}</p></div>
                    <div className="text-right"><span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">{product.brand}</span></div>
                  </div>
                  <PriceRevealer purchasePrice={product.purchasePrice} techPrice={product.technicianPrice} customerPrice={product.customerPrice} />
                  <div className="mt-4 flex space-x-2">
                    <button onClick={() => handleEditProduct(product)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Edit</button>
                    {isOutOfStock ? (
                        <button disabled className="flex-1 bg-slate-300 text-white py-2 rounded-xl text-xs font-bold cursor-not-allowed">Out of Stock</button>
                    ) : (
                        <button onClick={() => { playSound('add-to-cart'); addToCart(product); }} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors active:scale-95">Add to Cart</button>
                    )}
                  </div>
                </div>
              </div>
            );
        })}
      </div>

      {/* Stock Reason Modal */}
      {showStockReasonModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-pop-in">
                  <div className="flex items-center gap-3 text-amber-600 mb-4">
                      <AlertCircle size={28} />
                      <h3 className="text-xl font-bold text-slate-800">Stock Changed</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                      You changed stock from <b>{inventory.find(p => p.id === pendingProductData?.id)?.stockQuantity}</b> to <b>{pendingProductData?.stockQuantity}</b>. 
                      <br/>Please select a mandatory reason for this adjustment.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                      <label className="text-xs font-bold text-slate-400 uppercase">Reason Code</label>
                      <select 
                        value={stockAdjustmentReason}
                        onChange={(e) => setStockAdjustmentReason(e.target.value as StockAdjustmentReason)}
                        className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl font-bold text-slate-700 outline-none"
                      >
                          <option>Audit Correction</option>
                          <option>Breakage</option>
                          <option>Lost</option>
                          <option>Free Replacement</option>
                          <option>Sample Given</option>
                          <option>New Stock</option>
                          <option>Return Restock</option>
                      </select>
                  </div>

                  <button onClick={confirmStockAdjustment} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg hover:bg-amber-600">
                      Confirm Adjustment
                  </button>
              </div>
          </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3 text-indigo-600"><Package size={24} /><h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Product' : 'New Inventory Item'}</h2></div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Box / Lot Tracking Section */}
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                      <Box size={16} /> <span>Box / Lot Tracking (Optional)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Batch / Lot No." value={newPart.trackingBatch} onChange={e => setNewPart({...newPart, trackingBatch: e.target.value})} className="p-2 bg-white border border-blue-200 rounded-lg text-xs" />
                      <input type="text" placeholder="Supplier Invoice" value={newPart.trackingInvoice} onChange={e => setNewPart({...newPart, trackingInvoice: e.target.value})} className="p-2 bg-white border border-blue-200 rounded-lg text-xs" />
                      <div className="col-span-2 relative">
                          <Calendar size={14} className="absolute left-2 top-2.5 text-blue-300"/>
                          <input type="date" value={newPart.trackingDate} onChange={e => setNewPart({...newPart, trackingDate: e.target.value})} className="w-full pl-8 p-2 bg-white border border-blue-200 rounded-lg text-xs text-slate-600" />
                      </div>
                  </div>
              </div>

              {/* Basic Fields */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Image</label>
                <div className="flex flex-col items-center">
                  <div onClick={() => { playSound('click'); modalImageInputRef.current?.click(); }} className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all overflow-hidden relative">
                    {newPart.images && newPart.images.length > 0 ? <img src={newPart.images[0]} className="w-full h-full object-cover" /> : <div className="text-center"><Camera size={24} className="text-slate-300 mx-auto mb-1" /><p className="text-xs text-slate-400 font-medium">Capture or Upload</p></div>}
                  </div>
                  <input type="file" ref={modalImageInputRef} onChange={handleModalImageChange} accept="image/*" capture="environment" className="hidden" />
                </div>
              </div>

              {/* Barcode Field - NEW */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Barcode / SKU</label>
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        placeholder="Scan or Enter Code" 
                        value={newPart.barcode} 
                        onChange={e => setNewPart({...newPart, barcode: e.target.value})} 
                        className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" 
                    />
                    <button 
                        type="button"
                        onClick={() => startCamera('modal')} 
                        className="p-3 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-slate-900"
                        title="Scan Barcode"
                    >
                        <ScanBarcode size={20} />
                    </button>
                </div>
              </div>

              {/* Machine, Brand */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Machine Type</label><select value={newPart.machineType} onChange={e => setNewPart({...newPart, machineType: e.target.value as MachineType})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"><option value={MachineType.AC}>AC</option><option value={MachineType.FRIDGE}>Fridge</option><option value={MachineType.WASHING_MACHINE}>Washing Machine</option></select></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Brand</label><input required type="text" placeholder="Brand" value={newPart.brand} onChange={e => setNewPart({...newPart, brand: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm" /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Part Name</label><input required type="text" placeholder="Part Name" value={newPart.partName} onChange={e => setNewPart({...newPart, partName: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" /></div>
              
              {/* Pricing & Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Cost</label><input type="number" value={newPart.purchasePrice} onChange={e => setNewPart({...newPart, purchasePrice: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Tech</label><input type="number" value={newPart.technicianPrice} onChange={e => setNewPart({...newPart, technicianPrice: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Cust</label><input type="number" value={newPart.customerPrice} onChange={e => setNewPart({...newPart, customerPrice: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Stock</label><input type="number" value={newPart.stockQuantity} onChange={e => setNewPart({...newPart, stockQuantity: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Rack</label><input type="text" placeholder="e.g. A-01" value={newPart.rackLocation} onChange={e => setNewPart({...newPart, rackLocation: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm" /></div>
              </div>

              <button type="submit" className="w-full mt-4 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                {editingId ? 'Update Product' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
