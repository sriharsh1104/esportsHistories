/**
 * Loads Cashfree.js v3 (browser only). Used by web and RN WebView HTML checkout.
 * @see https://www.cashfree.com/docs/js-integration
 */
const CASHFREE_V3_SCRIPT = 'https://sdk.cashfree.com/js/v3/cashfree.js';

export type CashfreePgMode = 'sandbox' | 'production';

export type CashfreeCheckoutInput = {
  paymentSessionId: string;
  /** Modal overlay — avoids navigating the whole WebView away. */
  redirectTarget?: '_modal' | '_self' | (string & {});
  returnUrl?: string | null;
  redirect?: 'always' | 'if_required';
  mode?: CashfreePgMode;
};

export type CashfreeInstance = {
  checkout: (opts: CashfreeCheckoutInput) => Promise<unknown>;
};

export type CashfreeFactory = (opts: { mode: CashfreePgMode }) => CashfreeInstance;

let loadPromise: Promise<CashfreeFactory> | null = null;

export function loadCashfreeFactory(): Promise<CashfreeFactory> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Cashfree.js requires a browser environment'));
  }
  const win = window as typeof window & { Cashfree?: CashfreeFactory };
  if (typeof win.Cashfree === 'function') {
    return Promise.resolve(win.Cashfree);
  }
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const attach = () => {
      if (typeof win.Cashfree === 'function') {
        resolve(win.Cashfree);
        return;
      }
      reject(new Error('Cashfree.js loaded but global Cashfree is missing'));
    };
    const existing = document.querySelector(`script[src^="${CASHFREE_V3_SCRIPT}"]`);
    if (existing) {
      if (typeof win.Cashfree === 'function') {
        attach();
        return;
      }
      existing.addEventListener('load', () => attach());
      existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree.js')));
      return;
    }
    const script = document.createElement('script');
    script.src = CASHFREE_V3_SCRIPT;
    script.async = true;
    script.onload = () => attach();
    script.onerror = () => reject(new Error('Failed to load Cashfree.js'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export function cashfreeModeFromEnvironment(env: string | undefined): CashfreePgMode {
  const s = String(env ?? '').toLowerCase().trim();
  if (s === 'production' || s === 'prod' || s === 'live') return 'production';
  return 'sandbox';
}
