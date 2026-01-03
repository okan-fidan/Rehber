import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import io from 'socket.io-client';
import { ArrowLeft, Send, Loader2, X, Trash2, Copy, Reply, Pin } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export default function PrivateChat() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || 'Kullanıcı';
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMessages();
    
    const backendUrl = BACKEND_URL?.replace('/api', '') || '';
    const socket = io(backendUrl);
    
    const userIds = [user?.uid, id].sort();
    const chatId = `${userIds[0]}_${userIds[1]}`;
    
    socket.on('new_private_message', (message) => {
      if (message.chatId === chatId) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isDeleted: true, content: 'Bu mesaj silindi' } : m
      ));
    });

    socket.on('message_reaction', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, reactions } : m
      ));
    });

    return () => socket.disconnect();
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/private-messages/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.reverse());
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    setSending(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/private-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: id,
          content: inputText.trim(),
          type: 'text',
          replyTo: replyingTo?.id
        })
      });
      
      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const deleteMessageForMe = async (messageId) => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}/delete-for-me`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setShowMessageMenu(false);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const deleteMessageForEveryone = async (messageId) => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}/delete-for-everyone`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, isDeleted: true, content: 'Bu mesaj silindi' } : m
        ));
        setShowMessageMenu(false);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      
      if (response.ok) {
        const { reactions } = await response.json();
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, reactions } : m
        ));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  const handleLongPress = (msg) => {
    if (!msg.isDeleted) {
      setSelectedMessage(msg);
      setShowMessageMenu(true);
    }
  };

  const getReplyMessage = (replyId) => {
    return messages.find(m => m.id === replyId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621] flex flex-col" data-testid="private-chat-page">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-[#242f3d] px-3 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/messages')} className="p-1">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold">{name.charAt(0).toUpperCase()}</span>
        </div>
        
        <div className="flex-1">
          <h1 className="text-white font-semibold">{name}</h1>
          <p className="text-green-500 text-sm">çevrimiçi</p>
        </div>
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-[#17212b] border-b border-[#242f3d] px-4 py-2 flex items-center gap-3">
          <div className="w-1 h-10 bg-emerald-500 rounded-full" />
          <div className="flex-1">
            <p className="text-emerald-400 text-xs font-medium">{replyingTo.senderName}</p>
            <p className="text-gray-400 text-sm truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">Henüz mesaj yok</p>
            <p className="text-gray-500 text-sm">Sohbete başlamak için bir mesaj gönderin</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.senderId === user?.uid;
            const replyMessage = msg.replyTo ? getReplyMessage(msg.replyTo) : null;
            
            return (
              <div 
                key={msg.id || index} 
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                onClick={() => handleLongPress(msg)}
              >
                <div className={`max-w-[75%] rounded-xl p-3 ${
                  msg.isDeleted 
                    ? 'bg-[#1a1a1a] italic' 
                    : isOwn ? 'bg-[#2b5278]' : 'bg-[#17212b]'
                }`}>
                  {/* Reply Preview */}
                  {replyMessage && !msg.isDeleted && (
                    <div className="bg-black/20 rounded-lg p-2 mb-2 border-l-2 border-emerald-500">
                      <p className="text-emerald-400 text-xs">{replyMessage.senderName}</p>
                      <p className="text-gray-400 text-xs truncate">{replyMessage.content}</p>
                    </div>
                  )}
                  
                  {msg.isDeleted ? (
                    <p className="text-gray-500 text-sm">Bu mesaj silindi</p>
                  ) : (
                    <p className="text-white">{msg.content}</p>
                  )}
                  
                  {/* Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.isDeleted && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(msg.reactions).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); addReaction(msg.id, emoji); }}
                          className={`px-2 py-0.5 rounded-full text-sm flex items-center gap-1 ${
                            users.includes(user?.uid) 
                              ? 'bg-emerald-500/30 border border-emerald-500' 
                              : 'bg-black/30'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-gray-300 text-xs">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/60' : 'text-gray-500'}`}>
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Menu */}
      {showMessageMenu && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setShowMessageMenu(false); setSelectedMessage(null); }}>
          <div className="absolute bottom-0 left-0 right-0 bg-[#17212b] rounded-t-2xl" onClick={e => e.stopPropagation()}>
            {/* Emoji Quick React */}
            <div className="flex justify-center gap-2 p-4 border-b border-[#242f3d]">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addReaction(selectedMessage.id, emoji)}
                  className="w-10 h-10 text-2xl hover:bg-[#242f3d] rounded-full flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <div className="p-2">
              <button
                onClick={() => { setReplyingTo(selectedMessage); setShowMessageMenu(false); setSelectedMessage(null); }}
                className="w-full flex items-center gap-4 p-3 hover:bg-[#242f3d] rounded-xl"
              >
                <Reply className="w-5 h-5 text-gray-400" />
                <span className="text-white">Yanıtla</span>
              </button>
              
              <button
                onClick={() => copyMessage(selectedMessage.content)}
                className="w-full flex items-center gap-4 p-3 hover:bg-[#242f3d] rounded-xl"
              >
                <Copy className="w-5 h-5 text-gray-400" />
                <span className="text-white">Kopyala</span>
              </button>
              
              <button
                onClick={() => deleteMessageForMe(selectedMessage.id)}
                className="w-full flex items-center gap-4 p-3 hover:bg-[#242f3d] rounded-xl"
              >
                <Trash2 className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400">Benden Sil</span>
              </button>
              
              {selectedMessage.senderId === user?.uid && (
                <button
                  onClick={() => deleteMessageForEveryone(selectedMessage.id)}
                  className="w-full flex items-center gap-4 p-3 hover:bg-[#242f3d] rounded-xl"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">Herkesten Sil</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#17212b] border-t border-[#242f3d] p-3 flex items-center gap-2">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Mesaj yazın..."
          className="flex-1 bg-[#242f3d] text-white rounded-full px-4 py-3 focus:outline-none"
          data-testid="private-message-input"
        />
        
        <button 
          onClick={sendMessage}
          disabled={sending || !inputText.trim()}
          className="w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center disabled:opacity-50"
          data-testid="private-send-button"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
