import { FormEvent, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Button } from './Button';
import { Icon } from './Icons';
import { Modal } from './Modal';
import { getStripe, isStripeConfigured } from '../services/stripe';
import { money } from '../utils/erp';

interface StripeCheckoutModalProps {
  clientSecret: string;
  amount: number;
  orderId: string;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

function CheckoutForm({
  amount,
  onClose,
  onPaymentSuccess,
}: {
  amount: number;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Falha ao processar pagamento com cartão.');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        setIsSubmitted(true);
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        setIsSubmitted(true);
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado na comunicação com a Stripe.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center py-6 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <Icon name="check" className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Pagamento Aprovado na Stripe!
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Os servidores da Stripe estão notificando nosso sistema via Webhook. A confirmação do pedido e a baixa de estoque acontecerão automaticamente via mensageria.
          </p>
        </div>
        <div className="pt-2">
          <Button onClick={onClose} variant="secondary">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Valor do Cartão:</span>
          <span className="text-lg font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
            {money(amount)}
          </span>
        </div>
      </div>

      <div className="min-h-[220px]">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isProcessing}
          disabled={!stripe || !elements || isProcessing}
        >
          <Icon name="wallet" className="h-4 w-4" />
          Pagar {money(amount)}
        </Button>
      </div>
    </form>
  );
}

export function StripeCheckoutModal({
  clientSecret,
  amount,
  onClose,
  onPaymentSuccess,
}: StripeCheckoutModalProps) {
  const stripePromise = getStripe();

  return (
    <Modal title="Pagamento com Cartão (Stripe)" onClose={onClose} widthClass="max-w-lg">
      {!isStripeConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <Icon name="warning" className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
            Chave Pública da Stripe Ausente
          </h4>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Configure a variável <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900/60">VITE_STRIPE_PUBLIC_KEY=pk_test_...</code> no arquivo <code className="font-mono text-[11px]">.env</code> do frontend para renderizar o checkout do cartão.
          </p>
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Entendi
            </Button>
          </div>
        </div>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#0d9488', // teal-600
                borderRadius: '12px',
              },
            },
          }}
        >
          <CheckoutForm
            amount={amount}
            onClose={onClose}
            onPaymentSuccess={onPaymentSuccess}
          />
        </Elements>
      )}
    </Modal>
  );
}
