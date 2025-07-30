import { supabase } from '@/lib/supabase'
import { model } from '@/lib/gemini'

export async function POST(req) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 })
    }

    // Get last hour of messages
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const { data: messages } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: true })

    // Only summarize if there are enough messages
    if (!messages || messages.length < 4) {
      return Response.json({ message: 'Not enough to summarize' })
    }

    // Format conversation
    const conversation = messages
      .map(m => `${m.sender === 'user' ? 'User' : 'Mo'}: ${m.message}`)
      .join('\n')

    // Generate conversational summary
    const summaryPrompt = `Create a brief, warm summary of this support conversation in 1-2 sentences.
Focus on what the person was feeling and the main topics discussed.
Write it as if you're a friend remembering the conversation.

${conversation}

Summary:`

    const result = await model.generateContent(summaryPrompt)
    const summary = result.response.text()

    // Save or update summary
    await supabase
      .from('user_summaries')
      .upsert({
        user_id: userId,
        summary: summary,
        updated_at: new Date()
      }, {
        onConflict: 'user_id'
      })

    return Response.json({ success: true, summary })

  } catch (error) {
    console.error('Summary error:', error)
    return Response.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}