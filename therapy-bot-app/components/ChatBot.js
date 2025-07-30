'use client'

import { useState, useEffect, useRef } from 'react'

export default function ChatBot({ userId }) {
  const [messages, setMessages] = useState([
    {
      text: "Hey! I'm Mo. How are you doing today?",
      sender: 'bot'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Inactivity timer
  const inactivityTimer = useRef(null)
  const hasGeneratedSummary = useRef(false)
  
  // Generate summary after 10 minutes of inactivity
  const generateSummary = async () => {
    if (hasGeneratedSummary.current) return // Prevent duplicate summaries
    
    hasGeneratedSummary.current = true
    try {
      await fetch('/api/chat/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
    } catch (error) {
      console.error('Error generating summary:', error)
    }
  }

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    hasGeneratedSummary.current = false
    
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }
    
    inactivityTimer.current = setTimeout(() => {
      generateSummary()
    }, 10 * 60 * 1000) // 10 minutes
  }

  // Setup inactivity timer
  useEffect(() => {
    resetInactivityTimer()
    
    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
      // Generate summary on unmount if conversation happened
      if (messages.length > 2) {
        generateSummary()
      }
    }
  }, [])

  // Handle page unload
  useEffect(() => {
    const handleUnload = () => {
      if (messages.length > 2) {
        navigator.sendBeacon(
          '/api/chat/generate-summary',
          JSON.stringify({ userId })
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [userId, messages.length])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    
    // Add user message to UI
    setMessages(prev => [...prev, {
      text: userMessage,
      sender: 'user'
    }])
    
    setInput('')
    setLoading(true)
    resetInactivityTimer()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          userId
        })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // Add bot response
      setMessages(prev => [...prev, {
        text: data.reply,
        sender: 'bot'
      }])
      
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        text: "Sorry, I'm having trouble connecting. Can you try again?",
        sender: 'bot'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* Chat window */}
      <div style={{ 
        border: '1px solid #ccc', 
        borderRadius: '8px', 
        padding: '20px', 
        height: '400px', 
        overflowY: 'auto',
        backgroundColor: '#f9f9f9'
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            marginBottom: '10px', 
            textAlign: msg.sender === 'user' ? 'right' : 'left' 
          }}>
            <span style={{
              display: 'inline-block',
              padding: '10px 14px',
              borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              backgroundColor: msg.sender === 'user' ? '#007bff' : '#ffffff',
              color: msg.sender === 'user' ? 'white' : '#333',
              maxWidth: '70%',
              wordWrap: 'break-word',
              border: msg.sender === 'bot' ? '1px solid #e0e0e0' : 'none'
            }}>
              {msg.text}
            </span>
          </div>
        ))}
        
        {loading && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Mo is typing...
          </div>
        )}
      </div>
      
      {/* Input area */}
      <div style={{ display: 'flex', marginTop: '10px', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={loading}
          style={{ 
            flex: 1, 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid #ccc',
            fontSize: '16px',
            backgroundColor: '#fff',
            color: '#333'
          }}
          placeholder="Type your message..."
        />
        <button 
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '4px', 
            backgroundColor: loading || !input.trim() ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}