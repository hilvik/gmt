import ChatBot from '@/components/ChatBot'

export default function TherapyBotPage() {
  // TODO: get from auth
  const userId = "user-123" 
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0',
      paddingTop: '50px'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        color: '#333'
      }}>
        GMT Support Chat
      </h1>
      
      <ChatBot userId={userId} />
      
      <p style={{
        textAlign: 'center',
        marginTop: '20px',
        color: '#666',
        fontSize: '14px',
        maxWidth: '600px',
        margin: '20px auto'
      }}>
        
      </p>
    </div>
  )
}