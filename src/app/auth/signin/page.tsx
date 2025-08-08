'use client'

import React, { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const result = await signIn('email', { 
        email, 
        redirect: false,
        callbackUrl: '/dashboard'
      })

      if (result?.ok) {
        setMessage('Tjek din email for login link!')
      } else {
        setMessage('Der opstod en fejl. Prøv igen.')
      }
    } catch (error) {
      setMessage('Der opstod en fejl. Prøv igen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="text-4xl mb-4">🛡️</div>
          <h2 className="text-3xl font-bold text-gray-900">Log ind til AI Forsikringsguiden</h2>
          <p className="mt-2 text-sm text-gray-600">
            Få adgang til dine dokumenter og rapporter
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email adresse
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="din@email.dk"
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded ${
                message.includes('email') 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Sender...' : 'Send Login Link'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Sådan virker det</span>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="text-lg mr-2">1️⃣</div>
                <div>Indtast din email adresse ovenfor</div>
              </div>
              <div className="flex items-start">
                <div className="text-lg mr-2">2️⃣</div>
                <div>Vi sender dig et sikkert login link</div>
              </div>
              <div className="flex items-start">
                <div className="text-lg mr-2">3️⃣</div>
                <div>Klik på linket for at logge ind</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Ingen adgangskode nødvendig! Vi bruger sikker email-baseret login.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            <a href="/" className="text-blue-600 hover:text-blue-500">
              ← Tilbage til forsiden
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}