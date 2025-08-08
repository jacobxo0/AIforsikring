import React, { useState } from 'react'
import Head from 'next/head'

// Chat interface component
const ChatInterface = () => {
  const [messages, setMessages] = useState<Array<{id: number, text: string, sender: 'user' | 'ai'}>>([
    {
      id: 1,
      text: "Hej! Jeg er din AI forsikringsrådgiver. Hvordan kan jeg hjælpe dig i dag?",
      sender: 'ai'
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user' as const
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text, history: messages })
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem?.error || `Serverfejl (${response.status})`)
      }

      const data: { reply?: string } = await response.json()
      const aiMessage = {
        id: Date.now() + 1,
        text: (data.reply || 'Der opstod en fejl. Prøv igen.') as string,
        sender: 'ai' as const
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Ukendt fejl'
      setError(message)
      const aiMessage = {
        id: Date.now() + 1,
        text: `⚠️ ${message}. Viser midlertidigt standardsvar.`,
        sender: 'ai' as const
      }
      setMessages(prev => [...prev, aiMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Forsikringsrådgiver</h2>
      {error && (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      )}
      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.sender === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left">
            <div className="inline-block bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Stil et spørgsmål om forsikring..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !inputText.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>AI Forsikringsguiden - Dansk AI-assistent til forsikring</title>
        <meta name="description" content="Digital AI-assistent til forsikringsrelaterede henvendelser, analyser og dokumentforståelse. Få hjælp til forsikringsrådgivning på dansk." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-600">🛡️ AI Forsikringsguiden</div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Hjem</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Om Os</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Hjælp</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Din AI-assistent til
            <span className="text-blue-600 block">forsikringsspørgsmål</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Få professionel vejledning om forsikringer, analyser af policer og hjælp til skadeanmeldelser - alt på dansk og tilgængeligt 24/7.
          </p>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Forsikringsrådgivning</h3>
              <p className="text-gray-600">Få hjælp til at vælge den rigtige forsikring og forstå dine muligheder.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Dokumentanalyse</h3>
              <p className="text-gray-600">Upload og få forklaret forsikringspolicer og korrespondance.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">⚖️</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Juridisk vejledning</h3>
              <p className="text-gray-600">Forstå dine rettigheder og få guidning i forsikringssager.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ChatInterface />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">AI Forsikringsguiden</h4>
              <p className="text-gray-300">Din digitale assistent til alle forsikringsspørgsmål.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Tjenester</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Forsikringsrådgivning</li>
                <li>Dokumentanalyse</li>
                <li>Skadeanmeldelser</li>
                <li>Juridisk vejledning</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Ofte stillede spørgsmål</li>
                <li>Kontakt os</li>
                <li>Brugervejledning</li>
                <li>Privatlivspolitik</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Kontakt</h4>
              <p className="text-gray-300">
                Email: info@aiforsikringsguiden.dk<br />
                Telefon: +45 70 20 30 40
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2025 AI Forsikringsguiden. Alle rettigheder forbeholdes.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}