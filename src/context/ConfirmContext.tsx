import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, ShieldAlert, Info, CheckCircle2, X } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  details?: string;
}

export interface AlertOptions {
  title?: string;
  message: string;
  variant?: DialogVariant;
  confirmText?: string;
}

interface DialogState {
  isOpen: boolean;
  isAlert: boolean;
  title: string;
  message: string;
  details?: string;
  confirmText: string;
  cancelText: string;
  variant: DialogVariant;
}

export interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    isAlert: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'info',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        isAlert: false,
        title: options.title,
        message: options.message,
        details: options.details,
        confirmText: options.confirmText || (options.variant === 'danger' ? 'Delete' : 'Confirm'),
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'info',
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      const isString = typeof options === 'string';
      const message = isString ? options : options.message;
      const title = isString ? 'Notice' : (options.title || 'Notice');
      const variant = isString ? 'info' : (options.variant || 'info');
      const confirmText = isString ? 'Dismiss' : (options.confirmText || 'Dismiss');

      setDialogState({
        isOpen: true,
        isAlert: true,
        title,
        message,
        confirmText,
        cancelText: '',
        variant,
      });
    });
  }, []);

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialogState.isOpen && (
        <ConfirmDialogModal
          state={dialogState}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

const ConfirmDialogModal: React.FC<{
  state: DialogState;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ state, onConfirm, onCancel }) => {
  const { title, message, details, confirmText, cancelText, variant, isAlert } = state;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onConfirm]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <ShieldAlert size={24} color="var(--color-terracotta)" />,
          iconBg: 'var(--color-terracotta-bg)',
          confirmBtnBg: 'var(--color-terracotta)',
          confirmBtnColor: '#FFFFFF',
          borderLeft: '4px solid var(--color-terracotta)',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} color="var(--color-gold-text)" />,
          iconBg: 'var(--color-gold-bg)',
          confirmBtnBg: 'var(--color-gold)',
          confirmBtnColor: '#1E293B',
          borderLeft: '4px solid var(--color-gold)',
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={24} color="var(--color-sage)" />,
          iconBg: 'var(--color-sage-bg)',
          confirmBtnBg: 'var(--color-oxford)',
          confirmBtnColor: '#FFFFFF',
          borderLeft: '4px solid var(--color-sage)',
        };
      case 'info':
      default:
        return {
          icon: <Info size={24} color="var(--color-oxford)" />,
          iconBg: '#F1F5F9',
          confirmBtnBg: 'var(--color-navy)',
          confirmBtnColor: '#FFFFFF',
          borderLeft: '4px solid var(--color-oxford)',
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={isAlert ? onConfirm : onCancel}
    >
      <div
        className="sharp-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderLeft: vStyles.borderLeft,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          padding: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              padding: '0.65rem',
              backgroundColor: vStyles.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {vStyles.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.3rem',
                color: 'var(--color-navy)',
                margin: '0 0 0.4rem',
                fontWeight: 700,
                lineHeight: 1.25,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '0.86rem',
                color: 'var(--color-text-secondary)',
                margin: 0,
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
              }}
            >
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={isAlert ? onConfirm : onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {details && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--color-border)',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
              marginBottom: '1.25rem',
              lineHeight: 1.45,
            }}
          >
            {details}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1rem',
          }}
        >
          {!isAlert && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: vStyles.confirmBtnBg,
              color: vStyles.confirmBtnColor,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
