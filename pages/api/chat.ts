import type { NextApiRequest, NextApiResponse } from 'next'

interface ChatRequestBody {
  message?: string
  history?: Array<{ id: number; text: string; sender: 'user' | 'ai' }>
}

interface ChatResponseBody {
  reply: string
}

const buildFallbackReply = (message: string): string => {
  const trimmed = (message || '').trim()
  if (!trimmed) {
    return 'Jeg skal bruge et spørgsmål for at hjælpe dig – prøv fx: "Dækker min indboforsikring cykeltyveri?"'
  }
  return `Tak for din besked: "${trimmed}". Dette er en demo-svar. AI-integration aktiveres, når API-nøglen er sat. Indtil da kan jeg give generelle råd: Tjek policen for dækning, selvrisiko og undtagelser. 💡`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponseBody | { error: string }>
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const body: ChatRequestBody = req.body || {}
    const userMessage = (body.message || '').toString()

    if (!userMessage || userMessage.trim().length === 0) {
      return res.status(400).json({ error: 'Ugyldig forespørgsel: "message" mangler' })
    }

    const apiKey = process.env.OPENAI_API_KEY

    // If OpenAI key is present, try to generate a response; otherwise use fallback
    if (apiKey) {
      try {
        // Dynamic import to avoid bundling when key is absent
        const OpenAI = (await import('openai')).default
        const client = new OpenAI({ apiKey })

        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Du er en dansk forsikringsrådgiver. Svar kort og præcist.' },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.2,
          max_tokens: 250
        })

        const reply = completion.choices?.[0]?.message?.content?.trim()
        if (reply) {
          return res.status(200).json({ reply })
        }
      } catch (aiError) {
        // fall through to fallback
        console.error('AI generation failed', aiError)
      }
    }

    return res.status(200).json({ reply: buildFallbackReply(userMessage) })
  } catch (err) {
    console.error('Chat API error', err)
    return res.status(500).json({ error: 'Intern serverfejl' })
  }
}
