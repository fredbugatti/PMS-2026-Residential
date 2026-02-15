'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    small: 'max-w-md',
    medium: 'max-w-xl',
    large: 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-150"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={`relative w-full ${sizeStyles[size]} bg-white rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
};

export interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  onClose,
  showCloseButton = true,
}) => {
  return (
    <div className="flex items-center justify-between p-6 border-b border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">
        {children}
      </h2>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalContent: React.FC<ModalContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`p-6 ${className}`.trim()}>
      {children}
    </div>
  );
};

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-end gap-3 p-6 border-t border-slate-200 ${className}`.trim()}>
      {children}
    </div>
  );
};
