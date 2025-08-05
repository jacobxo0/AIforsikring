'use client';
import { useState } from 'react';

export default function PolicyChat() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState<string|null>(null);
  const [loading, setLoading]   = useState(false);

  async function ask() {
    setLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const { answer } = await res.json();
    setAnswer(answer);
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        className="w-full p-2 border rounded"
        placeholder="Stil spørgsmål om din police..."
        value={question}
        onChange={e => setQuestion(e.target.value)}
      />
      <button
        onClick={ask}
        disabled={loading || !question}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Henter svar…' : 'Send spørgsmål'}
      </button>
      {answer && (
        <div className="p-4 bg-gray-50 rounded border">
          <strong>GPT-svar:</strong>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
} 