import React, { useState, useRef, useEffect } from 'react';
import { agentAPI } from '../../services/api';
import { FiSend, FiUser, FiMessageSquare, FiZap, FiThumbsUp, FiThumbsDown, FiLoader } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    // Welcome message with confidence indicator
    setMessages([
      {
        id: 1,
        role: 'ai',
        content: `Hello ${user?.name || 'there'}! 👋 I'm your Sam. How can I help you today?`,
        timestamp: new Date(),
        confidence: 0.95
      }
    ]);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setConfidence(null);

    try {
      // Call the enhanced AI chat endpoint
      const response = await agentAPI.chat({ 
        message: input,
        context: "customer_support"
      });
      
      const aiMessage = {
        id: Date.now() + 1,
        role: 'ai',
        content: response.data.response || "I'm here to help. Could you please provide more details about your issue?",
        timestamp: new Date(),
        confidence: response.data.confidence || 0.85
      };
      setMessages(prev => [...prev, aiMessage]);
      setConfidence(aiMessage.confidence);
      
      // Log for analytics
      console.log(`[Sam] Response confidence: ${(aiMessage.confidence * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error('[Sam] Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'ai',
        content: 'I apologize, but I encountered an error. Please try again or contact support for assistance.\n\nYou can also try:\n- Refreshing the page\n- Checking our FAQ section\n- Creating a support ticket',
        timestamp: new Date(),
        confidence: 0
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('AI response failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rateResponse = async (messageId, rating) => {
    // Send feedback to backend for continuous improvement
    try {
      // Optional: Send feedback to your backend
      await agentAPI.chat({ 
        message: `Feedback for message ${messageId}: ${rating}`,
        context: "feedback"
      });
      
      toast.success(`Thank you for your feedback! ${rating === 'helpful' ? "We're glad we could help! 🌟" : "We'll use this to improve our responses. 💪"}`);
    } catch (error) {
      // Silent fail for feedback
      toast.success(`Thank you for your feedback!`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl">
            <FiZap className="h-6 w-6 text-white" />
          </div>
          <span>Sam is here to help you!</span>
         
        </h1>
        <p className="text-sm text-gray-500 mt-2 ml-2">
          Get instant, accurate help with troubleshooting, account issues, billing, and more
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div key={message.id}>
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`flex items-start space-x-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600'
                  }`}>
                    {message.role === 'user' ? (
                      <FiUser className="h-5 w-5 text-white" />
                    ) : (
                      <FiZap className="h-5 w-5 text-white" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`rounded-2xl p-4 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                      : 'bg-white border border-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Footer with timestamp and confidence */}
                    <div className={`flex items-center justify-between mt-2 gap-3 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      <p className="text-xs">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {message.confidence && message.role === 'ai' && message.id !== 1 && (
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            message.confidence >= 0.85 ? 'bg-green-500' : 
                            message.confidence >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs font-medium">
                            {Math.round(message.confidence * 100)}% confident
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feedback Buttons for AI messages */}
              {message.role === 'ai' && message.id !== 1 && (
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mt-1 ml-14 space-x-3`}>
                  <button 
                    onClick={() => rateResponse(message.id, 'helpful')}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-600 transition-all duration-200 px-2 py-1 rounded-lg hover:bg-green-50"
                  >
                    <FiThumbsUp className="h-3.5 w-3.5" /> 
                    <span>Helpful</span>
                  </button>
                  <button 
                    onClick={() => rateResponse(message.id, 'not-helpful')}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 transition-all duration-200 px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    <FiThumbsDown className="h-3.5 w-3.5" /> 
                    <span>Not helpful</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-md">
                  <FiZap className="h-5 w-5 text-white animate-pulse" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">AI is analyzing your request...</p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t shadow-lg p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send)"
              rows="2"
              className="flex-1 w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all duration-200 bg-gray-50 hover:bg-white"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-2xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105"
            >
              {loading ? (
                <FiLoader className="h-5 w-5 animate-spin" />
              ) : (
                <FiSend className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {/* Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <FiZap className="h-3.5 w-3.5 text-yellow-500" />
               
              </span>
              <span className="text-gray-300">•</span>
              <span>Instant responses</span>
              <span className="text-gray-300">•</span>
              <span>24/7 available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>Online</span>
              </span>
              <button 
                onClick={() => window.location.href = '/customer/faq'}
                className="text-blue-500 hover:text-blue-600 transition-colors"
              >
                Browse FAQ →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`}</style>
    </div>
  );
};

export default Chat;