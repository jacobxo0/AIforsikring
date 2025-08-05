'use client'

import ChatWindow from '@/components/chat/ChatWindow'

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            💬 AI Forsikringsrådgiver
          </h1>
          <ChatWindow />
        </div>
      </div>
    </div>
  )
} 