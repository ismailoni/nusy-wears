'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  email: string;
  onSuccess: (reference: string) => void;
  onError: (message: string) => void;
}

const PAYSTACK_SCRIPT_SRC = 'https://js.paystack.co/v1/inline.js';

export function PaystackModal({
  isOpen,
  amount,
  email,
  onSuccess,
  onError,
}: PaystackModalProps) {
  const [isScriptReady, setIsScriptReady] = useState(
    () => typeof window !== 'undefined' && !!window.PaystackPop
  );

  const paystackKey = useMemo(
    () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    if (window.PaystackPop) {
      return;
    }

    const existingScript = document.querySelector(`script[src="${PAYSTACK_SCRIPT_SRC}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsScriptReady(true));
      return;
    }

    const script = document.createElement('script');
    script.src = PAYSTACK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => setIsScriptReady(true);
    script.onerror = () => onError('Failed to load Paystack. Please try again.');
    document.body.appendChild(script);
  }, [isOpen, onError]);

  const handlePaystackPayment = useCallback(() => {
    if (!paystackKey) {
      onError('Paystack public key is missing. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.');
      return;
    }

    if (!window.PaystackPop || !isScriptReady) {
      onError('Paystack is still loading. Please try again.');
      return;
    }

    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email,
      amount: Math.round(amount * 100),
      currency: 'NGN',
      callback: (response) => {
        onSuccess(response.reference);
      },
      onClose: () => {
        onError('Payment was cancelled.');
      },
    });

    handler.openIframe();
  }, [paystackKey, isScriptReady, email, amount, onSuccess, onError]);

  useEffect(() => {
    if (isOpen && isScriptReady) {
      handlePaystackPayment();
    }
  }, [isOpen, isScriptReady, handlePaystackPayment]);

  return null;
}