'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface MessageType {
  role: 'user' | 'ai'
  content: string
}

export default function HomePage() {
  const [inputValue, setInputValue] = useState('')
  const [chatStarted, setChatStarted] = useState(false)
  const [messages, setMessages] = useState<MessageType[]>([])

  // Tracks whether we're currently waiting for AI to respond
  const [isLoading, setIsLoading] = useState(false)

  // Holds partial AI response text as it streams in
  const [partialAiResponse, setPartialAiResponse] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (chatStarted && inputRef.current) {
      inputRef.current.focus()
    }
  }, [chatStarted])

  // Convert your local message format to the format SSE expects
  const getChatHistoryForSSE = () => {
    return messages.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Immediately update UI with user's message
    setMessages(prev => [...prev, { role: 'user', content: inputValue }])
    setInputValue('')

    if (!chatStarted) {
      setChatStarted(true)
    }
    // Start SSE request
    sendPromptToAI(inputValue)
  }

  const sendPromptToAI = (userQuery: string) => {
    if (isLoading) return
    setIsLoading(true)

    const chatHistoryForSSE = getChatHistoryForSSE()
    const encodedHistory = encodeURIComponent(JSON.stringify(chatHistoryForSSE))
    const encodedQuery = encodeURIComponent(userQuery)

    // Replace this with your SSE endpoint
    const url = `https://resumellm-dfd22fa2ded8.herokuapp.com/invoke?chat_history=${encodedHistory}&query=${encodedQuery}`

    const source = new EventSource(url)
    setPartialAiResponse('')

    source.addEventListener('message', event => {
      // If we detect function calls in SSE
      if (event.data.includes('fn:')) {
        console.log('Function call requested:', event.data.replace('fn:', '').trim())
        setIsLoading(false)

      } else if (event.data.includes('[DONE]')) {
        // SSE ended. Combine leftover chunk and add as final AI message
        const finalChunk = event.data.replace('[DONE]', '').trim()
        const finalContent = partialAiResponse + finalChunk
        if (finalContent) {
          setMessages(prev => [...prev, { role: 'ai', content: finalContent.replace("<response>", "").replace("</response>", "") }])
        }
        setPartialAiResponse('')
        setIsLoading(false)
        source.close()

      } else {
        // Stream partial text
        setPartialAiResponse(prev => prev + event.data)
      }
    })

    source.addEventListener('error', event => {
      console.error('SSE error:', event)
      setPartialAiResponse('')
      setIsLoading(false)
      source.close()
    })
  }

  return (
    <main className={`min-h-screen px-4 sm:px-6 lg:px-8 pt-8 relative ${ !chatStarted ? 'mt-15' : ''} overflow-hidden`}>
      {/* Top right navigation */}
      <nav className="absolute top-8 right-4 space-x-4 sm:space-x-6 text-sm mr-4 sm:mr-20">
        <a href="#" className="hover:text-gray-900">about</a>
        <a href="#" className="hover:text-gray-900">member</a>
        <a href="#" className="hover:text-gray-900">contact</a>
      </nav>

      <div
        className={`max-w-3xl mx-auto transition-all duration-500 ease-in-out ${
          chatStarted ? 'mt-0' : 'mt-[100px] sm:mt-[200px]'
        }`}
      >
        {/* Logo */}
        <h1
          onClick={() => window.open('/')}
          className={`font-bold mb-4 text-left transition-all duration-500 ease-in-out ${
            chatStarted ? 'text-2xl sm:text-3xl fixed top-8 left-4 z-50' : 'text-4xl sm:text-5xl'
          }`}
        >
          h0x
        </h1>
        {/* Tagline */}
        <p
          className={`mb-8 text-[17px] text-left text-[#767676] transition-opacity duration-500 ${
            chatStarted ? 'opacity-0' : 'opacity-100'
          }`}
        >
          こんにちは。私たちは無限のアイデアを持つプロダクトスタジオです。
        </p>

        {/* Chat Display */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            chatStarted
              ? 'opacity-100 h-[calc(100vh-200px)] overflow-y-auto mb-4 pt-2 sm:pt-10'
              : 'opacity-0 h-0'
          }`}
        >
          {messages.map((message, index) => (
            <div key={index} className="mb-4">
              <span className="font-bold" style={{ color: message.role === 'user' ? '#FF3FB2' : '#4169E1' }}>
                {message.role === 'user' ? 'あなた: ' : 'consome.ai  : '}
              </span>
              {message.content}
            </div>
          ))}

          {/* 1) Show a spinner if we haven't yet received partial chunks */}
          {isLoading && !partialAiResponse && (
            <div className="mb-4 flex items-center">
              <span className="font-bold mr-2">AI:</span>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500" />
              <span className="ml-2">応答を考えています…</span>
            </div>
          )}

          {/* 2) As partial chunks stream in, display them */}
          {isLoading && partialAiResponse && (
            <div className="mb-4">
              <span className="font-bold">AI (typing): </span>
              {partialAiResponse}
            </div>
          )}
        </div>

        {/* Search Input with Shadow and Submit Button */}
        <form
          onSubmit={handleSubmit}
          className={`relative w-full transition-all duration-500 ease-in-out ${
            chatStarted
              ? 'fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full sm:w-[800px] max-w-full px-4'
              : 'mb-10'
          }`}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-[-20px] w-[543px] h-[23px] rounded-[15px]"
            style={{
              border: '1px solid #FF3FB2',
              background:
                'linear-gradient(90deg, rgba(255, 0, 217, 0.40) 0%, rgba(0, 115, 255, 0.40) 100%)',
              filter: 'blur(28.5px)',
            }}
          />
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="なんでも聞いてね"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="w-full sm:w-[800px] px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-16 rounded-full border-2 border-transparent bg-white focus:outline-none relative z-10"
              style={{
                background:
                  'linear-gradient(white, white) padding-box, linear-gradient(90deg, #FF69B4, #4169E1) border-box',
              }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20"
              aria-label="送信"
            >
              <ArrowRight className="h-6 w-6 text-gray-400 hover:text-gray-600 transition-colors" />
            </button>
          </div>
        </form>

        {/* Navigation Links (shown only before chat starts) */}
        <div
          className={`w-full sm:w-[800px] max-w-3xl flex flex-wrap justify-between gap-2 text-xs sm:text-sm text-[#000000] opacity-50 transition-opacity duration-500 ${
            chatStarted ? 'opacity-0' : 'opacity-50'
          }`}
        >
          <a href="#" className="hover:text-gray-900" onClick={() => setInputValue('あなたたちは誰？')}>
            あなたたちは誰？
          </a>
          <a href="#" className="hover:text-gray-900" onClick={() => setInputValue('どのようなプロダクトを作ってるの？')}>
            どのようなプロダクトを作ってるの？
          </a>
          <a href="#" className="hover:text-gray-900" onClick={() => setInputValue('consomeって何？')}>
            consomeって何？
          </a>
          <a href="#" className="hover:text-gray-900">
            トークンを発行していますか？
          </a>
        </div>
      </div>
    </main>
  )
}

