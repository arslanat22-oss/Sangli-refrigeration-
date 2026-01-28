
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { TECH_CODE, CUST_CODE, ADMIN_PIN } from '../constants';
import { playSound } from '../services/sound';

interface PriceRevealerProps {
  purchasePrice: number;
  techPrice: number;
  customerPrice: number;
}

const PriceRevealer: React.FC<PriceRevealerProps> = ({ purchasePrice, techPrice, customerPrice }) => {
  const [code, setCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [revealedType, setRevealedType] = useState<'none' | 'tech' | 'cust' | 'admin'>('none');

  const checkPrice = () => {
    const input = code.toUpperCase().trim();
    if (input === TECH_CODE) {
        setRevealedType('tech');
        playSound('scan-success');
    }
    else if (input === CUST_CODE || input === '') {
        setRevealedType('cust');
        playSound('scan-success');
    }
    else if (input === ADMIN_PIN) {
        setRevealedType('admin');
        playSound('scan-success');
    }
    else {
        setRevealedType('none');
        playSound('scan-error');
        alert("Invalid Code");
        return;
    }
    
    setShowModal(false);
    setCode('');
  };

  return (
    <div className="relative">
      <div className="space-y-1">
        <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Selling Price</span>
          <span className="font-mono font-bold text-lg">
            {revealedType === 'cust' || revealedType === 'admin' ? `₹${customerPrice}` : '₹ ****'}
          </span>
        </div>
        
        {revealedType === 'tech' || revealedType === 'admin' ? (
          <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100 animate-slide-up">
            <span className="text-xs text-green-600 uppercase font-bold">Technician</span>
            <span className="font-mono font-bold text-green-700">₹{techPrice}</span>
          </div>
        ) : null}

        {revealedType === 'admin' && (
           <div className="flex justify-between items-center bg-rose-50 p-2 rounded border border-rose-100 animate-slide-up">
             <span className="text-xs text-rose-600 uppercase font-bold">Cost Price</span>
             <span className="font-mono font-bold text-rose-700">₹{purchasePrice}</span>
           </div>
        )}
      </div>

      <button 
        onClick={() => { playSound('click'); setShowModal(true); }}
        className="mt-2 w-full flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-600 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors group"
      >
        <Lock size={14} className="group-hover:animate-wobble" />
        <span>Revealer Mode</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-pop-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Enter Price Code</h3>
            <input 
              autoFocus
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Code (TECH/CUST/PIN)..."
              className="w-full p-4 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none text-center text-2xl tracking-widest font-mono mb-6"
            />
            <div className="flex space-x-3">
              <button 
                onClick={() => { playSound('delete'); setShowModal(false); }}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={checkPrice}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200"
              >
                Reveal
              </button>
            </div>
            <p className="mt-4 text-[10px] text-slate-400 text-center uppercase tracking-tighter">
              Codes are secure. Access is logged.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceRevealer;
