import { supabase } from '@/lib/supabase'
import { model } from '@/lib/gemini'

export async function POST(req) {
  try {
    const { message, userId } = await req.json()

    if (!message || !userId) {
      return Response.json({ error: 'Message and userId required' }, { status: 400 })
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    // Get ALL messages from last hour (both user and bot)
    const { data: recentMessages } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: true })

    // Determine conversation state
    let conversationState = 'ongoing' // default
    let systemPrompt = ''
    let conversationHistory = ''

    if (!recentMessages || recentMessages.length === 0) {
      // No recent messages - check if user exists at all
      const { data: anyMessages } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (!anyMessages) {
        conversationState = 'new_user'
      } else {
        conversationState = 'returning_user'
      }
    }

    // Core personality that applies to ALL conversations
    const corePersonality = `You are Mo, a warm and caring friend who provides emotional support through Get Me Therapy.

Your conversation style:
- Listen deeply and reflect back what you hear
- Validate their feelings without judgment
- Ask gentle, open-ended questions to help them explore their thoughts
- Share understanding without making it about you
- Be genuine and human, not clinical
- Sometimes just acknowledge - you don't always need to have answers
- Keep responses concise but meaningful (1-2 short paragraphs)

Important: Only mention the GMT diary feature if they express thoughts of self-harm or crisis.`

    // Build appropriate prompt based on state
    if (conversationState === 'new_user') {
      systemPrompt = `${corePersonality}

SITUATION: This is your very first conversation with this person.
- Offer a warm, natural greeting
- Let them know you're here to listen
- Invite them to share what's on their mind`

    } else if (conversationState === 'returning_user') {
      // Get their summary
      const { data: summary } = await supabase
        .from('user_summaries')
        .select('summary')
        .eq('user_id', userId)
        .single()

      systemPrompt = `${corePersonality}

SITUATION: This person is returning after a break.
${summary ? `What you remember about them: ${summary.summary}` : ''}

- Acknowledge their return naturally
- Show you remember them if you have context
- Be warm but not overly enthusiastic`

    } else {
      // Ongoing conversation - NO GREETINGS
      conversationHistory = recentMessages
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Mo'}: ${msg.message}`)
        .join('\n')

      systemPrompt = `${corePersonality}

SITUATION: You're in the middle of an ongoing conversation.

CRITICAL: 
- DO NOT greet or act surprised
- Respond directly to what they just shared
- Build on the conversation naturally
- Show you've been listening to everything they've said

Conversation so far:
${conversationHistory}`
    }

    // Add the actual user message
    const fullPrompt = `${systemPrompt}

Current message from user: ${message}

Respond as Mo with empathy and care:`

    // Generate response
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.85,  // Slightly higher for more natural variation
      }
    })
    
    const response = result.response.text()

    // Save both messages
    await supabase
      .from('conversations')
      .insert([
        { user_id: userId, message: message, sender: 'user' },
        { user_id: userId, message: response, sender: 'bot' }
      ])

    return Response.json({ reply: response })

  } catch (error) {
    console.error('Chat error:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}