import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!stripePublishableKey) {
      console.warn('VITE_STRIPE_PUBLIC_KEY não está configurada no ambiente (.env).');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
}

export const isStripeConfigured = Boolean(stripePublishableKey);
