'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function UpgradePage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscription = async () => {
    if (!session) {
      window.location.href = '/auth/signin'
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/payments/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error('Subscription error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">👑 Upgrade til Premium</h1>
        <p className="text-xl text-gray-600">Få ubegrænset adgang til alle AI forsikringsfeatures</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Current Plan */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🆓 Gratis Plan</h2>
          <ul className="space-y-2 text-gray-600">
            <li>✅ Basis AI chat (begrænsede svar)</li>
            <li>✅ Op til 3 dokumenter per session</li>
            <li>✅ Grundlæggende analyse</li>
            <li>❌ PDF eksport af rapporter</li>
            <li>❌ Chat historik</li>
            <li>❌ Ubegrænset dokumenter</li>
            <li>❌ Avanceret AI analyse</li>
            <li>❌ Premium support</li>
          </ul>
        </div>

        {/* Premium Plan */}
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-500">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900">👑 Premium Plan</h2>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">149 kr</div>
              <div className="text-sm text-gray-500">per måned</div>
            </div>
          </div>
          
          <ul className="space-y-2 text-gray-600 mb-6">
            <li>✅ Ubegrænset AI chat med ekspert prompts</li>
            <li>✅ Ubegrænset dokumenter</li>
            <li>✅ Avanceret AI analyse og insights</li>
            <li>✅ PDF eksport af alle rapporter</li>
            <li>✅ Chat historik og gemte dokumenter</li>
            <li>✅ Personlige anbefalinger</li>
            <li>✅ Sammenligning med markedsdata</li>
            <li>✅ Premium support</li>
            <li>✅ Tidlig adgang til nye features</li>
          </ul>

          <button
            onClick={handleSubscription}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Starter abonnement...' : 'Start Premium Abonnement'}
          </button>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">🔍 Sammenligning af Features</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Feature</th>
                <th className="text-center py-3 text-gray-500">Gratis</th>
                <th className="text-center py-3 text-green-600">Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">AI Chat beskeder per session</td>
                <td className="text-center py-3">10</td>
                <td className="text-center py-3">Ubegrænset</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Dokumenter per session</td>
                <td className="text-center py-3">3</td>
                <td className="text-center py-3">Ubegrænset</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">PDF eksport</td>
                <td className="text-center py-3">39 kr per rapport</td>
                <td className="text-center py-3">Gratis</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Chat historik</td>
                <td className="text-center py-3">❌</td>
                <td className="text-center py-3">✅</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Avanceret AI analyse</td>
                <td className="text-center py-3">❌</td>
                <td className="text-center py-3">✅</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Support</td>
                <td className="text-center py-3">Email</td>
                <td className="text-center py-3">Prioriteret + Chat</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Testimonials */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">💬 Hvad siger vores brugere?</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="text-4xl mb-2">⭐⭐⭐⭐⭐</div>
            <p className="text-gray-700 mb-3">
              &quot;Premium versionen har sparet mig for timer af research. AI&apos;en giver utroligt detaljerede analyser!&quot;
            </p>
            <div className="text-sm text-gray-500">- Lars, Københaven</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-6">
            <div className="text-4xl mb-2">⭐⭐⭐⭐⭐</div>
            <p className="text-gray-700 mb-3">
              &quot;Fandt besparelser på 2.400 kr om året på min bilforsikring. Abonnementet har betalt sig selv!&quot;
            </p>
            <div className="text-sm text-gray-500">- Maria, Aarhus</div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12 bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">❓ Ofte Stillede Spørgsmål</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Kan jeg opsige mit abonnement når som helst?</h3>
            <p className="text-gray-600">Ja, du kan opsige dit abonnement når som helst. Du bevarer adgang til premium features til udgangen af din betalingsperiode.</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Hvad sker der med mine data hvis jeg opsiger?</h3>
            <p className="text-gray-600">Dine data bliver bevaret i 30 dage efter opsigelse, så du kan genaktivere dit abonnement. Derefter slettes de i henhold til GDPR.</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Er der en gratis prøveperiode?</h3>
            <p className="text-gray-600">Du kan bruge alle funktioner gratis med begrænsninger. Premium abonnement starter med det samme og kan opsiges når som helst.</p>
          </div>
        </div>
      </div>
    </div>
  )
}