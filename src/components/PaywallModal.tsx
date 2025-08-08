'use client'

import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  price: number
  onSuccess?: () => void
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function PaywallModal({ isOpen, onClose, feature, price, onSuccess }: PaywallModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'report_export' })
      })

      const { clientSecret, error } = await response.json()

      if (error) {
        setError(error)
        return
      }

      const stripe = await stripePromise
      if (!stripe) {
        setError('Stripe ikke tilgængelig')
        return
      }

      const result = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
      })

      if (result.error) {
        setError(result.error.message || 'Betalingsfejl')
      } else {
        onSuccess?.()
        onClose()
      }

    } catch (error) {
      setError('Der opstod en fejl ved betaling')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpgrade = () => {
    // Redirect to subscription page
    window.location.href = '/upgrade'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Premium Feature</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔒</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature}</h3>
              <p className="text-gray-600">
                Denne funktion kræver premium adgang eller engangsbetaling
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Engangsbetaling</span>
                <span className="text-xl font-bold text-blue-600">{price} kr</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Få adgang til denne specifikke funktion
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Premium Abonnement</span>
                <span className="text-xl font-bold text-blue-600">149 kr/md</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Ubegrænset adgang til alle features
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>✅ Ubegrænset dokumenter</li>
                <li>✅ Detaljerede AI analyser</li>
                <li>✅ PDF eksport af alle rapporter</li>
                <li>✅ Chat historik</li>
                <li>✅ Premium support</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Behandler...' : `Betal ${price} kr`}
            </button>

            <button
              onClick={handleUpgrade}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Upgrade til Premium
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}