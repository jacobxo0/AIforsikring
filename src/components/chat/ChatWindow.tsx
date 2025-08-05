'use client'

import { useState, useEffect, useRef } from 'react'
import ChatInput from './ChatInput'
import ErrorBoundary, { ChatErrorFallback } from '../ErrorBoundary'
import { ChatLoadingSpinner } from '../LoadingSpinner'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize messages after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    setMessages([{
      id: '1',
      content: 'Hej! Jeg er din AI forsikringsassistent. Hvordan kan jeg hjælpe dig i dag?',
      role: 'assistant',
      timestamp: new Date()
    }])
  }, [])

  // Auto-scroll til bunden når nye beskeder tilføjes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSendMessage = async (content: string) => {
    if (!mounted) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      // Check if OpenAI API key is configured
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: content, // Use the user's message content
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          userDocuments: [] // TODO: Implement document context
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 500 && data.error?.includes('API key')) {
          throw new Error('OpenAI API nøgle er ikke konfigureret. Kontakt administrator.')
        }
        if (response.status === 401) {
          throw new Error('Ugyldig API nøgle. Kontakt administrator.')
        }
        if (response.status === 429) {
          throw new Error('For mange forespørgsler. Prøv igen om lidt.')
        }
        throw new Error(data.error || 'Ukendt fejl fra serveren')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorText = error instanceof Error ? error.message : 'Der opstod en uventet fejl'
      setError(errorText)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ ${errorText}`,
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ErrorBoundary fallback={ChatErrorFallback}>
      <div className="h-full flex flex-col">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm">
              <strong>Fejl:</strong> {error}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-4 bg-gray-50 max-h-[60vh] scroll-smooth">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block max-w-[70%] px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-insurance-blue text-white rounded-br-sm'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString('da-DK', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="mb-4 text-left">
              <div className="inline-block max-w-[70%] px-4 py-3 rounded-lg bg-white border border-gray-200 rounded-bl-sm">
                <ChatLoadingSpinner />
              </div>
            </div>
          )}
          
          {/* Usynlig element til auto-scroll */}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              💬 {messages.length} besked{messages.length !== 1 ? 'er' : ''} i samtalen
            </span>
            {messages.length > 5 && (
              <button 
                onClick={scrollToBottom} 
                className="text-xs text-insurance-blue hover:underline"
              >
                📄 Gå til bunden
              </button>
            )}
          </div>
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </ErrorBoundary>
  )
}