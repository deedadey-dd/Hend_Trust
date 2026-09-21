import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import EscrowFeeCalculator from './EscrowFeeCalculator';

export const FloatingCalculatorWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          type="button"
          onClick={() => setIsOpen(o => !o)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-[#0363ff] hover:bg-blue-600 text-white font-extrabold text-xs rounded-full shadow-2xl shadow-blue-500/40 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Calculate Escrow Fees & Payouts"
          aria-label="Open Escrow Fee Calculator"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Calculator className="h-3.5 w-3.5 text-white group-hover:rotate-12 transition-transform" />
          </div>
          <span className="hidden sm:inline tracking-wide font-black">
            Fee Calculator
          </span>
          <span className="inline sm:hidden font-black">Calculator</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6d1d] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6d1d]"></span>
          </span>
        </button>
      </div>

      {/* Floating Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl animate-in zoom-in-95 duration-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <EscrowFeeCalculator onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingCalculatorWidget;
