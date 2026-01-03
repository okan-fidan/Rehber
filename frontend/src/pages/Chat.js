import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import io from 'socket.io-client';
import { 
  ArrowLeft, Users, Paperclip, Send, Smile, Mic,
  Image as ImageIcon, FileText, MapPin, User, X, Download, Phone, Loader2,
  MoreVertical, Trash2, Pin, Copy, Reply, SmilePlus
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export default function Chat() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || 'Grup';
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [members, setMembers] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '' });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMessages();
    fetchMembers();
    fetchPinnedMessages();
    
    const backendUrl = BACKEND_URL?.replace('/api', '') || '';
    socketRef.current = io(backendUrl);
    
    socketRef.current.on('new_message', (message) => {
      if (message.groupId === id) {
        setMessages(prev => [...prev, message]);
      }
    });

    socketRef.current.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isDeleted: true, content: 'Bu mesaj silindi' } : m
      ));
    });

    socketRef.current.on('message_reaction', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, reactions } : m
      ));
    });

    socketRef.current.on('message_pinned', ({ messageId, isPinned }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isPinned } : m
      ));
      if (isPinned) {
        fetchPinnedMessages();
      } else {
        setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/messages/${id}`, {
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

  const fetchMembers = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const allUsers = await response.json();
        setMembers(allUsers);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchPinnedMessages = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/messages/${id}/pinned`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPinnedMessages(data);
      }
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
    }
  };

  const sendMessage = async (type = 'text', options = {}) => {
    if (!inputText.trim() && !options?.fileUrl && type === 'text') return;

    setSending(true);
    try {
      const token = await user?.getIdToken();
      let messageContent = inputText.trim();
      
      if (type === 'file') messageContent = `📎 ${options?.fileName}`;
      if (type === 'location') messageContent = `📍 ${options?.locationName || 'Konum'}`;
      if (type === 'contact') messageContent = `👤 ${options?.contactName}`;
      
      const response = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: id,
          content: messageContent,
          type,
          fileUrl: options?.fileUrl,
          latitude: options?.latitude,
          longitude: options?.longitude,
          locationName: options?.locationName,
          contactName: options?.contactName,
          contactPhone: options?.contactPhone,
          contactEmail: options?.contactEmail,
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
    setShowEmojiPicker(false);
    setSelectedMessage(null);
  };

  const togglePinMessage = async (messageId) => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { isPinned } = await response.json();
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, isPinned } : m
        ));
        if (isPinned) {
          fetchPinnedMessages();
        } else {
          setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
        }
        setShowMessageMenu(false);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  const handleLongPress = (msg) => {
    setSelectedMessage(msg);
    setShowMessageMenu(true);
  };

  const pickImage = async () => {
    setShowAttachMenu(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          await sendMessage('image', { fileUrl: event.target.result });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const pickFile = async () => {
    setShowAttachMenu(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          await sendMessage('file', { fileUrl: event.target.result, fileName: file.name });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const sendLocation = async () => {
    setShowAttachMenu(false);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`
            );
            const data = await response.json();
            const locationName = data.display_name?.split(',').slice(0, 3).join(',') || 'Konumum';
            
            await sendMessage('location', { latitude, longitude, locationName });
          } catch {
            await sendMessage('location', { latitude, longitude, locationName: 'Konumum' });
          }
        },
        () => {
          alert('Konum alınamadı. Konum erişimine izin verin.');
        }
      );
    } else {
      alert('Tarayıcınız konum özelliğini desteklemiyor.');
    }
  };

  const submitContact = async () => {
    if (contactForm.name && contactForm.phone) {
      await sendMessage('contact', {
        contactName: contactForm.name,
        contactPhone: contactForm.phone,
        contactEmail: contactForm.email
      });
      setShowContactPicker(false);
      setContactForm({ name: '', phone: '', email: '' });
    }
  };

  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, 'HH:mm');
    } else if (diffDays === 1) {
      return 'Dün ' + format(date, 'HH:mm');
    } else if (diffDays < 7) {
      return format(date, 'EEEE HH:mm', { locale: tr });
    } else {
      return format(date, 'dd MMM HH:mm', { locale: tr });
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
    <div className="min-h-screen bg-[#0e1621] flex flex-col" data-testid="chat-page">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-[#242f3d] px-3 py-2 flex items-center gap-3">
        <button onClick={() => navigate('/groups')} className="p-1">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1">
          <h1 className="text-white font-semibold">{name}</h1>
          <p className="text-gray-500 text-sm">{members.length} üye</p>
        </div>
        
        {pinnedMessages.length > 0 && (
          <button 
            onClick={() => setShowPinnedMessages(true)}
            className="p-2 bg-emerald-500/20 rounded-lg"
          >
            <Pin className="w-5 h-5 text-emerald-400" />
          </button>
        )}
        
        <button onClick={() => setShowMembers(true)} className="p-2">
          <Users className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessages.length > 0 && !showPinnedMessages && (
        <button 
          onClick={() => setShowPinnedMessages(true)}
          className="bg-[#17212b] border-b border-[#242f3d] px-4 py-2 flex items-center gap-3"
        >
          <Pin className="w-4 h-4 text-emerald-400" />
          <div className="flex-1 text-left">
            <p className="text-emerald-400 text-xs font-medium">Sabitlenmiş mesaj</p>
            <p className="text-gray-400 text-sm truncate">{pinnedMessages[0]?.content}</p>
          </div>
        </button>
      )}

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
            <div className="w-20 h-20 bg-[#17212b] rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-white font-semibold">Henüz mesaj yok</p>
            <p className="text-gray-500 text-sm">Sohbete başlamak için bir mesaj gönderin</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.senderId === user?.uid;
            const prevMsg = messages[index - 1];
            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
            const replyMessage = msg.replyTo ? getReplyMessage(msg.replyTo) : null;
            
            return (
              <div key={msg.id || index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isOwn && showAvatar && (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">
                      {msg.senderName?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}
                
                <div 
                  className={`max-w-[75%] rounded-xl p-3 relative group ${
                    msg.isDeleted 
                      ? 'bg-[#1a1a1a] italic' 
                      : isOwn ? 'bg-[#2b5278]' : 'bg-[#17212b]'
                  } ${msg.isPinned ? 'ring-1 ring-emerald-500/50' : ''}`}
                  onClick={() => !msg.isDeleted && handleLongPress(msg)}
                >
                  {msg.isPinned && (
                    <Pin className="absolute -top-2 -right-2 w-4 h-4 text-emerald-400" />
                  )}
                  
                  {!isOwn && showAvatar && (
                    <p className="text-emerald-400 text-sm font-semibold mb-1">{msg.senderName}</p>
                  )}
                  
                  {/* Reply Preview */}
                  {replyMessage && (
                    <div className="bg-black/20 rounded-lg p-2 mb-2 border-l-2 border-emerald-500">
                      <p className="text-emerald-400 text-xs">{replyMessage.senderName}</p>
                      <p className="text-gray-400 text-xs truncate">{replyMessage.content}</p>
                    </div>
                  )}
                  
                  {msg.isDeleted ? (
                    <p className="text-gray-500 text-sm">Bu mesaj silindi</p>
                  ) : (
                    <>
                      {msg.type === 'image' && msg.fileUrl && (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedImage(msg.fileUrl); setShowImageModal(true); }}>
                          <img src={msg.fileUrl} alt="Resim" className="max-w-[240px] rounded-lg" />
                        </button>
                      )}
                      
                      {msg.type === 'location' && (
                        <a 
                          href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="bg-[#2b5278] rounded-lg p-4 flex items-center gap-2">
                            <MapPin className="w-8 h-8 text-white" />
                            <div>
                              <p className="text-white font-semibold">{msg.locationName}</p>
                              <p className="text-gray-400 text-sm">{msg.latitude?.toFixed(4)}, {msg.longitude?.toFixed(4)}</p>
                            </div>
                          </div>
                        </a>
                      )}
                      
                      {msg.type === 'contact' && (
                        <div className="bg-black/20 rounded-lg p-3 flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{msg.contactName}</p>
                            {msg.contactPhone && <p className="text-emerald-400 text-sm">{msg.contactPhone}</p>}
                          </div>
                        </div>
                      )}
                      
                      {(msg.type === 'text' || !msg.type) && (
                        <p className="text-white">{msg.content}</p>
                      )}
                    </>
                  )}
                  
                  {/* Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
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
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-xs ${isOwn ? 'text-white/60' : 'text-gray-500'}`}>
                      {formatMessageDate(msg.timestamp)}
                    </span>
                  </div>
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
                onClick={() => togglePinMessage(selectedMessage.id)}
                className="w-full flex items-center gap-4 p-3 hover:bg-[#242f3d] rounded-xl"
              >
                <Pin className="w-5 h-5 text-gray-400" />
                <span className="text-white">{selectedMessage.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}</span>
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

      {/* Pinned Messages Modal */}
      {showPinnedMessages && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPinnedMessages(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-[#17212b] rounded-t-2xl max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#242f3d]">
              <h2 className="text-white font-semibold">Sabitlenmiş Mesajlar ({pinnedMessages.length})</h2>
              <button onClick={() => setShowPinnedMessages(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-3">
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="bg-[#0e1621] rounded-xl p-3">
                  <p className="text-emerald-400 text-sm font-medium">{msg.senderName}</p>
                  <p className="text-white mt-1">{msg.content}</p>
                  <p className="text-gray-500 text-xs mt-2">{formatMessageDate(msg.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div className="bg-[#17212b] border-t border-[#242f3d] px-6 py-4 flex justify-around">
          <button onClick={pickImage} className="text-center">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-1">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-400 text-xs">Fotoğraf</span>
          </button>
          <button onClick={pickFile} className="text-center">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-400 text-xs">Dosya</span>
          </button>
          <button onClick={sendLocation} className="text-center">
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-400 text-xs">Konum</span>
          </button>
          <button onClick={() => { setShowAttachMenu(false); setShowContactPicker(true); }} className="text-center">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <User className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-400 text-xs">Kişi</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#17212b] border-t border-[#242f3d] p-2 flex items-end gap-2">
        <button 
          onClick={() => setShowAttachMenu(!showAttachMenu)} 
          className="p-3"
        >
          <Paperclip className="w-6 h-6 text-emerald-500" />
        </button>
        
        <div className="flex-1 bg-[#242f3d] rounded-full px-4 py-2 flex items-center gap-2">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Mesaj yazın..."
            className="flex-1 bg-transparent text-white focus:outline-none"
            data-testid="message-input"
          />
          <button className="p-1">
            <Smile className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        {inputText.trim() ? (
          <button 
            onClick={() => sendMessage()}
            disabled={sending}
            className="w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center"
            data-testid="send-button"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button className="p-3">
            <Mic className="w-6 h-6 text-emerald-500" />
          </button>
        )}
      </div>

      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowMembers(false)}>
          <div className="w-full bg-[#17212b] rounded-t-2xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#242f3d]">
              <h2 className="text-lg font-semibold text-white">{members.length} Üye</h2>
              <button onClick={() => setShowMembers(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-2">
              {members.map((member) => (
                <div key={member.uid} className="flex items-center gap-3 p-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">
                        {member.firstName?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#17212b]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.firstName} {member.lastName}</p>
                    <p className="text-green-500 text-sm">çevrimiçi</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowContactPicker(false)}>
          <div className="w-full bg-[#17212b] rounded-t-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#242f3d]">
              <h2 className="text-lg font-semibold text-white">Kişi Gönder</h2>
              <button onClick={() => setShowContactPicker(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 bg-[#242f3d] rounded-xl px-4">
                <User className="w-5 h-5 text-gray-500" />
                <input
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="İsim *"
                  className="flex-1 bg-transparent text-white py-4 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3 bg-[#242f3d] rounded-xl px-4">
                <Phone className="w-5 h-5 text-gray-500" />
                <input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Telefon *"
                  className="flex-1 bg-transparent text-white py-4 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3 bg-[#242f3d] rounded-xl px-4">
                <Send className="w-5 h-5 text-gray-500" />
                <input
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="E-posta (opsiyonel)"
                  className="flex-1 bg-transparent text-white py-4 focus:outline-none"
                />
              </div>
              <button
                onClick={submitContact}
                disabled={!contactForm.name || !contactForm.phone}
                className="w-full bg-emerald-500 text-white rounded-xl py-4 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black z-50" onClick={() => setShowImageModal(false)}>
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <button onClick={() => setShowImageModal(false)}>
              <X className="w-7 h-7 text-white" />
            </button>
            <a href={selectedImage} download>
              <Download className="w-7 h-7 text-white" />
            </a>
          </div>
          <img src={selectedImage} alt="Tam boyut" className="w-full h-full object-contain" />
        </div>
      )}
    </div>
  );
}
