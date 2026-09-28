import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Scale,
  ShieldCheck,
  Trash2,
  KeyRound,
  Link as LinkIcon,
  Truck,
  Send,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export type ModalType = 'orange' | 'blue' | 'danger' | 'success' | 'warning' | 'info' | 'purple';

export type ModalIcon = 'scale' | 'shield' | 'alert' | 'trash' | 'check' | 'key' | 'link' | 'truck' | 'send' | 'info' | 'help' | 'sparkles';

export interface ConfirmOptions {
  title: string;
  message: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  icon?: ModalIcon;
  badgeText?: string;
  detailsList?: string[];
}

export interface AlertOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  type?: ModalType;
  icon?: ModalIcon;
  badgeText?: string;
}

interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

interface ActiveModalState {
  isOpen: boolean;
  isConfirm: boolean;
  title: string;
  message: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmText: string;
  cancelText: string;
  type: ModalType;
  icon?: ModalIcon;
  badgeText?: string;
  detailsList?: string[];
}

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ActiveModalState>({
    isOpen: false,
    isConfirm: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    type: 'blue'
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        isConfirm: true,
        title: options.title,
        message: options.message,
        description: options.description,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'orange',
        icon: options.icon,
        badgeText: options.badgeText,
        detailsList: options.detailsList
      });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      if (typeof options === 'string') {
        setModalState({
          isOpen: true,
          isConfirm: false,
          title: 'Notice',
          message: options,
          confirmText: 'Dismiss',
          cancelText: '',
          type: 'blue'
        });
      } else {
        setModalState({
          isOpen: true,
          isConfirm: false,
          title: options.title || 'Notice',
          message: options.message,
          confirmText: options.confirmText || 'Dismiss',
          cancelText: '',
          type: options.type || 'blue',
          icon: options.icon,
          badgeText: options.badgeText
        });
      }
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  // Keyboard shortcut support (Escape closes/cancels, Enter confirms)
  useEffect(() => {
    if (!modalState.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter' && !modalState.isConfirm) {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen, modalState.isConfirm, handleClose]);

  // Render Icon according to type & custom selection
  const renderIcon = () => {
    const iconClass = "w-6 h-6";
    if (modalState.icon === 'scale') return <Scale className={iconClass} />;
    if (modalState.icon === 'shield') return <ShieldCheck className={iconClass} />;
    if (modalState.icon === 'trash') return <Trash2 className={iconClass} />;
    if (modalState.icon === 'key') return <KeyRound className={iconClass} />;
    if (modalState.icon === 'link') return <LinkIcon className={iconClass} />;
    if (modalState.icon === 'truck') return <Truck className={iconClass} />;
    if (modalState.icon === 'send') return <Send className={iconClass} />;
    if (modalState.icon === 'check') return <CheckCircle2 className={iconClass} />;
    if (modalState.icon === 'alert') return <AlertTriangle className={iconClass} />;
    if (modalState.icon === 'help') return <HelpCircle className={iconClass} />;
    if (modalState.icon === 'sparkles') return <Sparkles className={iconClass} />;
    if (modalState.icon === 'info') return <Info className={iconClass} />;

    // Fallbacks based on type
    switch (modalState.type) {
      case 'orange':
        return <Scale className={iconClass} />;
      case 'danger':
        return <AlertTriangle className={iconClass} />;
      case 'success':
        return <CheckCircle2 className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'purple':
        return <ShieldCheck className={iconClass} />;
      case 'blue':
      default:
        return <Info className={iconClass} />;
    }
  };

  // Color scheme mappings
  const getThemeStyles = () => {
    switch (modalState.type) {
      case 'orange':
        return {
          iconBox: 'bg-orange-500/10 border-orange-500/20 text-[#ff6d1d]',
          badge: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-900',
          confirmBtn: 'bg-[#ff6d1d] hover:bg-[#e05b11] text-white shadow-orange-500/20 shadow-md',
        };
      case 'danger':
        return {
          iconBox: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
          badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 shadow-md',
        };
      case 'success':
        return {
          iconBox: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-md',
        };
      case 'warning':
        return {
          iconBox: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 shadow-md',
        };
      case 'purple':
        return {
          iconBox: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900',
          confirmBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 shadow-md',
        };
      case 'blue':
      default:
        return {
          iconBox: 'bg-[#0363ff]/10 border-[#0363ff]/20 text-[#0363ff]',
          badge: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900',
          confirmBtn: 'bg-[#0363ff] hover:bg-[#0252d4] text-white shadow-blue-500/20 shadow-md',
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <ModalContext.Provider value={{ confirm, alert: showAlert }}>
      {children}

      {/* Global Unified Modal Dialog */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Close X Button */}
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Icon, Badge & Title */}
            <div className="flex items-start gap-3.5 pr-6">
              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${themeStyles.iconBox}`}>
                {renderIcon()}
              </div>
              <div className="min-w-0 space-y-1">
                {modalState.badgeText && (
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${themeStyles.badge}`}>
                    {modalState.badgeText}
                  </span>
                )}
                <h3
                  id="modal-title"
                  className="text-slate-900 dark:text-white font-extrabold text-base sm:text-lg leading-snug"
                >
                  {modalState.title}
                </h3>
              </div>
            </div>

            {/* Message Body */}
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line space-y-2">
              {typeof modalState.message === 'string' ? (
                <p>{modalState.message}</p>
              ) : (
                modalState.message
              )}

              {modalState.description && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {modalState.description}
                </div>
              )}
            </div>

            {/* Optional Structured Bullet Details */}
            {modalState.detailsList && modalState.detailsList.length > 0 && (
              <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                {modalState.detailsList.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {/* Actions Row */}
            <div className="flex items-center gap-3 pt-2">
              {modalState.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {modalState.cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`${
                  modalState.isConfirm ? 'flex-1' : 'w-full'
                } py-2.5 px-4 font-extrabold rounded-xl text-xs sm:text-sm transition cursor-pointer ${themeStyles.confirmBtn}`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
