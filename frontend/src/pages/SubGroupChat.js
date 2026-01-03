import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { 
  ArrowLeft, Send, Loader2, Users, Crown,
  MoreVertical, UserPlus, UserMinus,
  Check, X, Reply, Copy, Forward, Trash2,
  Edit3, Smile, Paperclip, Image,
  FileText, Video, CheckCheck, ChevronDown,
  File, Music, MessageCircle, Briefcase, MapPin, Mail, Phone
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Input } from "../components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Telegram tarzı emoji listesi
const QUICK_REACTIONS = ['👍', '👎', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🤯', '😢', '🎉', '🤮', '💩', '🙏'];

// Emoji kategorileri
const EMOJI_CATEGORIES = {
  'Sık Kullanılanlar': ['😀', '😂', '🥰', '😍', '🤩', '😊', '😇', '🙂', '😉', '😌', '😋', '😎', '🤗', '🤭', '😏'],
  'Yüzler': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
  'Jestler': ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🙏', '💪'],
  'Kalpler': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Semboller': ['✅', '❌', '❓', '❗', '💯', '🔥', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '🥇', '🎯', '💡', '📌', '📍', '🔔', '🔕'],
};

export default function SubGroupChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [subgroup, setSubgroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, message: null });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('Sık Kullanılanlar');
  const [forwardDialog, setForwardDialog] = useState({ show: false, message: null });
  const [deleteDialog, setDeleteDialog] = useState({ show: false, message: null });
  const [typingUsers, setTypingUsers] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const longPressTimerRef = useRef(null);

  useEffect(() => {
    fetchSubgroup();
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.emoji-picker-container') && !e.target.closest('.emoji-trigger-btn')) {
        setShowEmojiPicker(false);
      }
      if (!e.target.closest('.context-menu-container')) {
        setContextMenu({ show: false, x: 0, y: 0, message: null });
      }
      if (!e.target.closest('.profile-card-container') && !e.target.closest('.profile-trigger')) {
        setShowProfileCard(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
  };

  const fetchSubgroup = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSubgroup(data);
    } catch (error) {
      console.error('Alt grup yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.reverse());
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata:', error);
    }
  };

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const token = await user.getIdToken();
      // Alt grup üyelerini getir
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Üye detaylarını getir
        const memberIds = data.members || [];
        const memberDetails = await Promise.all(
          memberIds.slice(0, 50).map(async (uid) => {
            try {
              const userRes = await fetch(`${BACKEND_URL}/api/user/${uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (userRes.ok) {
                return await userRes.json();
              }
            } catch (e) {
              // Ignore member fetch errors
            }
            return null;
          })
        );
        setMembers(memberDetails.filter(m => m !== null));
      }
    } catch (error) {
      console.error('Üyeler yüklenirken hata:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedProfile(data);
        setShowProfileCard(true);
      }
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${id}/pending-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error('İstekler yüklenirken hata:', error);
    }
  };

  const uploadFile = async (file, type) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `subgroups/${id}/files/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      await uploadBytes(storageRef, file);
      setUploadProgress(100);
      
      const downloadURL = await getDownloadURL(storageRef);
      
      const token = await user.getIdToken();
      const messageData = {
        content: type === 'image' ? '📷 Fotoğraf' : type === 'video' ? '🎥 Video' : `📎 ${file.name}`,
        type: type,
        fileUrl: downloadURL,
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type
      };
      
      if (replyingTo) {
        messageData.replyTo = replyingTo.id;
      }

      await fetch(`${BACKEND_URL}/api/subgroups/${id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      
      setReplyingTo(null);
      fetchMessages();
    } catch (error) {
      console.error('Dosya yüklenirken hata:', error);
      alert('Dosya yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('Dosya boyutu 50MB\'dan küçük olmalıdır');
        return;
      }
      uploadFile(file, type);
    }
    e.target.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = await user.getIdToken();
      const messageData = { content: newMessage, type: 'text' };
      if (replyingTo) messageData.replyTo = replyingTo.id;

      await fetch(`${BACKEND_URL}/api/subgroups/${id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      
      setNewMessage('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
      fetchMessages();
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newText = newMessage.substring(0, start) + emoji + newMessage.substring(end);
      setNewMessage(newText);
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
      }, 0);
    } else {
      setNewMessage(prev => prev + emoji);
    }
  };

  const handleMessageTouchStart = (e, msg) => {
    longPressTimerRef.current = setTimeout(() => {
      const touch = e.touches[0];
      openContextMenu(touch.clientX, touch.clientY, msg);
    }, 500);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleMessageContextMenu = (e, msg) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, msg);
  };

  const openContextMenu = (x, y, message) => {
    const menuWidth = 200;
    const menuHeight = 300;
    const adjustedX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x;
    const adjustedY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : y;
    
    setContextMenu({ show: true, x: adjustedX, y: adjustedY, message });
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${id}/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      setContextMenu({ show: false, x: 0, y: 0, message: null });
      fetchMessages();
    } catch (error) {
      console.error('Reaksiyon eklenirken hata:', error);
    }
  };

  const handleReply = (msg) => {
    setReplyingTo(msg);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
    inputRef.current?.focus();
  };

  const handleCopy = (msg) => {
    navigator.clipboard.writeText(msg.content);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleForward = (msg) => {
    setForwardDialog({ show: true, message: msg });
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleEdit = (msg) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim() || !editingMessage) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${id}/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      });
      setEditingMessage(null);
      setEditContent('');
      fetchMessages();
    } catch (error) {
      console.error('Mesaj düzenlenirken hata:', error);
    }
  };

  const handleDeleteClick = (msg) => {
    setDeleteDialog({ show: true, message: msg });
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleDeleteForMe = async () => {
    if (!deleteDialog.message) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${id}/messages/${deleteDialog.message.id}/delete-for-me`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeleteDialog({ show: false, message: null });
      fetchMessages();
    } catch (error) {
      console.error('Mesaj silinirken hata:', error);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!deleteDialog.message) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${id}/messages/${deleteDialog.message.id}/delete-for-everyone`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeleteDialog({ show: false, message: null });
      fetchMessages();
    } catch (error) {
      console.error('Mesaj silinirken hata:', error);
    }
  };

  const handleTyping = useCallback(async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${id}/typing`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: true })
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        const token = await user.getIdToken();
        await fetch(`${BACKEND_URL}/api/subgroups/${id}/typing`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping: false })
        });
      }, 2000);
    } catch (error) {
      // Ignore typing indicator errors
    }
  }, [id, user]);

  const handleLeaveGroup = async () => {
    if (!window.confirm('Gruptan ayrılmak istediğinize emin misiniz?')) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${id}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate(`/community/${subgroup.communityId}`);
    } catch (error) {
      console.error('Gruptan ayrılırken hata:', error);
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${id}/requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPendingRequests();
      fetchSubgroup();
    } catch (error) {
      console.error('İstek işlenirken hata:', error);
    }
  };

  const startPrivateChat = (userId) => {
    navigate(`/messages/${userId}`);
    setShowProfileCard(false);
    setShowMembersDialog(false);
  };

  const getMessageStatus = (msg) => {
    if (msg.senderId !== user.uid) return null;
    const readCount = msg.readBy?.length || 0;
    if (readCount > 1) return 'read';
    if (msg.status === 'delivered' || msg.deliveredTo?.length > 0) return 'delivered';
    return 'sent';
  };

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'read': return <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />;
      case 'delivered': return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      case 'sent': return <Check className="w-3.5 h-3.5 text-gray-400" />;
      default: return null;
    }
  };

  const groupReactions = (reactions) => {
    const grouped = {};
    reactions?.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], hasOwn: false };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.userName);
      if (r.userId === user.uid) grouped[r.emoji].hasOwn = true;
    });
    return grouped;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderMediaContent = (msg) => {
    if (msg.type === 'image' && msg.fileUrl) {
      return (
        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
          <img src={msg.fileUrl} alt="Paylaşılan görsel" className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
        </a>
      );
    }
    if (msg.type === 'video' && msg.fileUrl) {
      return <div className="mb-1"><video src={msg.fileUrl} controls className="rounded-lg max-w-full max-h-64" /></div>;
    }
    if (msg.type === 'file' && msg.fileUrl) {
      const isAudio = msg.fileMimeType?.startsWith('audio/');
      const isPDF = msg.fileMimeType === 'application/pdf';
      return (
        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/20 rounded-lg p-3 mb-1 hover:bg-black/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[#4A90E2]/20 flex items-center justify-center">
            {isAudio ? <Music className="w-5 h-5 text-[#4A90E2]" /> : isPDF ? <FileText className="w-5 h-5 text-red-400" /> : <File className="w-5 h-5 text-[#4A90E2]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{msg.fileName || 'Dosya'}</p>
            {msg.fileSize && <p className="text-gray-400 text-xs">{formatFileSize(msg.fileSize)}</p>}
          </div>
        </a>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4A90E2] animate-spin" />
      </div>
    );
  }

  if (!subgroup) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <p className="text-gray-400">Alt grup bulunamadı</p>
      </div>
    );
  }

  const isAdmin = subgroup.isGroupAdmin || subgroup.isSuperAdmin || userProfile?.isAdmin;

  return (
    <div className="min-h-screen bg-[#0e1621] flex flex-col" data-testid="subgroup-chat-page">
      {/* Hidden File Inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.mp3,.wav" className="hidden" onChange={(e) => handleFileSelect(e, 'file')} />

      {/* Header - Tıklanabilir */}
      <div 
        className="bg-[#17212b] border-b border-gray-800/50 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 cursor-pointer hover:bg-[#1e2c3a] transition-colors"
        onClick={() => { fetchMembers(); setShowMembersDialog(true); }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); navigate(`/community/${subgroup.communityId}`); }}
          className="p-1.5 -ml-1 hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-300" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A90E2] to-[#7C3AED] flex items-center justify-center">
          <span className="text-white font-semibold text-sm">{subgroup.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[15px] font-semibold text-white truncate">{subgroup.name}</h1>
            {subgroup.isGroupAdmin && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
          </div>
          <p className="text-[13px] text-gray-400 truncate">
            {typingUsers.length > 0 ? (
              <span className="text-[#4A90E2]">{typingUsers.join(', ')} yazıyor...</span>
            ) : (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {subgroup.memberCount} üye • Listeyi görmek için tıkla
              </span>
            )}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onClick={(e) => e.stopPropagation()} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#17212b] border-gray-700 min-w-[180px]">
            <DropdownMenuItem className="text-white hover:bg-white/5 cursor-pointer py-2.5" onClick={() => { fetchMembers(); setShowMembersDialog(true); }}>
              <Users className="w-4 h-4 mr-3 text-gray-400" />
              Üyeleri Gör
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-white/5 cursor-pointer py-2.5" onClick={() => navigate(`/community/${subgroup.communityId}`)}>
              <ArrowLeft className="w-4 h-4 mr-3 text-gray-400" />
              Topluluğa Git
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator className="bg-gray-700/50" />
                <DropdownMenuItem className="text-white hover:bg-white/5 cursor-pointer py-2.5" onClick={() => { fetchPendingRequests(); setShowRequestsDialog(true); }}>
                  <UserPlus className="w-4 h-4 mr-3 text-gray-400" />
                  Katılma İstekleri
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-gray-700/50" />
            <DropdownMenuItem className="text-red-400 hover:bg-white/5 cursor-pointer py-2.5" onClick={handleLeaveGroup}>
              <UserMinus className="w-4 h-4 mr-3" />
              Gruptan Ayrıl
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="bg-[#17212b] px-4 py-2 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-[#4A90E2] animate-spin" />
            <div className="flex-1">
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#4A90E2] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
            <span className="text-xs text-gray-400">Yükleniyor...</span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-4 relative" onScroll={handleScroll}>
        <div className="max-w-3xl mx-auto space-y-1">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#17212b] flex items-center justify-center">
                <Send className="w-7 h-7 text-gray-500" />
              </div>
              <p className="text-gray-400 font-medium">Henüz mesaj yok</p>
              <p className="text-gray-500 text-sm mt-1">Sohbeti başlatın!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = msg.senderId === user.uid;
              const status = getMessageStatus(msg);
              const reactions = groupReactions(msg.reactions);
              const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);
              const showName = !isOwn && showAvatar;
              const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId;
              
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
                  {/* Avatar - Tıklanabilir */}
                  {!isOwn && (
                    <div className="w-8 mr-2 flex-shrink-0">
                      {showAvatar && (
                        <button 
                          onClick={() => fetchUserProfile(msg.senderId)}
                          className="profile-trigger w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:opacity-80 transition-opacity overflow-hidden"
                        >
                          {msg.senderProfileImage ? (
                            <img src={msg.senderProfileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-semibold">{msg.senderName?.charAt(0)?.toUpperCase()}</span>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[75%] relative group ${isOwn ? 'order-1' : ''}`}>
                    {/* Reply Preview */}
                    {msg.replyToContent && (
                      <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs cursor-pointer ${isOwn ? 'bg-[#2b5278] border-l-2 border-[#6ab3f3]' : 'bg-[#1e2c3a] border-l-2 border-[#8774e1]'}`}>
                        <p className={`font-medium ${isOwn ? 'text-[#6ab3f3]' : 'text-[#8774e1]'}`}>{msg.replyToSenderName}</p>
                        <p className="text-gray-400 truncate">{msg.replyToContent}</p>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`relative px-3 py-1.5 ${isOwn ? `bg-[#2b5278] ${isLastInGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}` : `bg-[#182533] ${isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`} ${msg.deletedForEveryone ? 'opacity-60 italic' : ''}`}
                      onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                      onTouchStart={(e) => handleMessageTouchStart(e, msg)}
                      onTouchEnd={handleMessageTouchEnd}
                      onTouchMove={handleMessageTouchEnd}
                    >
                      {/* Sender Name - Tıklanabilir */}
                      {showName && !msg.deletedForEveryone && (
                        <button 
                          onClick={() => fetchUserProfile(msg.senderId)}
                          className="profile-trigger text-[13px] font-medium text-[#8774e1] mb-0.5 hover:underline text-left"
                        >
                          {msg.senderName}
                        </button>
                      )}

                      {/* Media Content */}
                      {!msg.deletedForEveryone && renderMediaContent(msg)}
                      
                      {/* Text Content */}
                      <div className="flex items-end gap-2">
                        <p className={`text-[14px] leading-[1.35] whitespace-pre-wrap break-words ${msg.deletedForEveryone ? 'text-gray-400' : 'text-white'}`}>
                          {msg.deletedForEveryone ? 'Bu mesaj silindi' : (msg.type === 'text' ? msg.content : '')}
                        </p>
                        
                        {/* Time & Status */}
                        <div className="flex items-center gap-0.5 flex-shrink-0 -mb-0.5">
                          {msg.isEdited && !msg.deletedForEveryone && <span className="text-[11px] text-gray-400">düzenlendi</span>}
                          <span className={`text-[11px] ${isOwn ? 'text-[#6ab3f3]/70' : 'text-gray-500'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwn && renderStatusIcon(status)}
                        </div>
                      </div>
                    </div>

                    {/* Reactions */}
                    {Object.keys(reactions).length > 0 && !msg.deletedForEveryone && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(reactions).map(([emoji, data]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition-all ${data.hasOwn ? 'bg-[#2b5278] border border-[#4A90E2]/50' : 'bg-[#182533] hover:bg-[#1e2c3a]'}`}
                            title={data.users.join(', ')}
                          >
                            <span className="text-sm">{emoji}</span>
                            <span className={`text-xs ${data.hasOwn ? 'text-[#4A90E2]' : 'text-gray-400'}`}>{data.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button onClick={scrollToBottom} className="fixed bottom-24 right-4 w-10 h-10 bg-[#17212b] rounded-full shadow-lg flex items-center justify-center hover:bg-[#1e2c3a] transition-colors border border-gray-700/50">
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && contextMenu.message && !contextMenu.message.deletedForEveryone && (
        <div className="fixed z-50 animate-in fade-in zoom-in-95 duration-100 context-menu-container" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#17212b] rounded-2xl shadow-xl border border-gray-700/50 p-2 mb-1">
            <div className="flex gap-0.5">
              {QUICK_REACTIONS.slice(0, 7).map(emoji => (
                <button key={emoji} onClick={() => handleReaction(contextMenu.message.id, emoji)} className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-xl">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#17212b] rounded-xl shadow-xl border border-gray-700/50 py-1.5 min-w-[200px]">
            <button onClick={() => handleReply(contextMenu.message)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <Reply className="w-5 h-5 text-gray-400" /><span className="text-white text-[15px]">Yanıtla</span>
            </button>
            <button onClick={() => handleCopy(contextMenu.message)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <Copy className="w-5 h-5 text-gray-400" /><span className="text-white text-[15px]">Kopyala</span>
            </button>
            <button onClick={() => handleForward(contextMenu.message)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <Forward className="w-5 h-5 text-gray-400" /><span className="text-white text-[15px]">İlet</span>
            </button>
            {contextMenu.message.senderId === user.uid && contextMenu.message.type === 'text' && (
              <button onClick={() => handleEdit(contextMenu.message)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors">
                <Edit3 className="w-5 h-5 text-gray-400" /><span className="text-white text-[15px]">Düzenle</span>
              </button>
            )}
            <div className="h-px bg-gray-700/50 my-1" />
            <button onClick={() => handleDeleteClick(contextMenu.message)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <Trash2 className="w-5 h-5 text-red-400" /><span className="text-red-400 text-[15px]">Sil</span>
            </button>
          </div>
        </div>
      )}

      {/* Mini Profile Card */}
      {showProfileCard && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowProfileCard(false)}>
          <div className="profile-card-container bg-[#17212b] rounded-2xl shadow-xl border border-gray-700 p-6 w-80 max-w-[90vw] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-1 mb-3">
                {selectedProfile.profileImageUrl ? (
                  <img src={selectedProfile.profileImageUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#0e1621] flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{selectedProfile.firstName?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white">{selectedProfile.firstName} {selectedProfile.lastName}</h3>
              {selectedProfile.isAdmin && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full mt-1">Yönetici</span>
              )}
            </div>

            {/* Profile Info */}
            <div className="space-y-3 mb-4">
              {selectedProfile.profession && (
                <div className="flex items-center gap-3 text-gray-300">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{selectedProfile.profession}</span>
                </div>
              )}
              {selectedProfile.city && (
                <div className="flex items-center gap-3 text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{selectedProfile.city}</span>
                </div>
              )}
              {selectedProfile.email && (
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm truncate">{selectedProfile.email}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedProfile.uid !== user.uid && (
              <Button onClick={() => startPrivateChat(selectedProfile.uid)} className="w-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Mesaj Gönder
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="bg-[#17212b] border-t border-gray-800/50 px-4 py-2 flex items-center gap-3">
          <div className="w-1 h-10 bg-[#4A90E2] rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[#4A90E2] text-sm font-medium">{replyingTo.senderName}</p>
            <p className="text-gray-400 text-sm truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-white/5 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      {/* Edit Mode Bar */}
      {editingMessage && (
        <div className="bg-[#17212b] border-t border-gray-800/50 px-4 py-2 flex items-center gap-3">
          <div className="w-1 h-10 bg-[#4A90E2] rounded-full" />
          <div className="flex-1">
            <p className="text-[#4A90E2] text-sm font-medium">Mesajı Düzenle</p>
            <p className="text-gray-400 text-sm truncate">{editingMessage.content}</p>
          </div>
          <button onClick={() => { setEditingMessage(null); setEditContent(''); }} className="p-1.5 hover:bg-white/5 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="bg-[#17212b] border-t border-gray-800/50 emoji-picker-container">
          <div className="flex gap-1 px-2 py-2 border-b border-gray-800/50 overflow-x-auto">
            {Object.keys(EMOJI_CATEGORIES).map(category => (
              <button key={category} onClick={() => setSelectedEmojiCategory(category)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedEmojiCategory === category ? 'bg-[#4A90E2] text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                {category}
              </button>
            ))}
          </div>
          <div className="p-2 h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[selectedEmojiCategory].map((emoji, idx) => (
                <button key={idx} onClick={() => insertEmoji(emoji)} className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-xl">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={editingMessage ? (e) => { e.preventDefault(); handleEditSubmit(); } : handleSendMessage} className="bg-[#17212b] border-t border-gray-800/50 px-2 py-2">
        <div className="flex items-end gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="p-2.5 hover:bg-white/5 rounded-full transition-colors" disabled={uploading}>
                <Paperclip className="w-5 h-5 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#17212b] border-gray-700 mb-2">
              <DropdownMenuItem className="text-white hover:bg-white/5 cursor-pointer py-2.5" onClick={() => imageInputRef.current?.click()}>
                <Image className="w-4 h-4 mr-3 text-purple-400" />Fotoğraf
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-white/5 cursor-pointer py-2.5" onClick={() => videoInputRef.current?.click()}>
                <Video className="w-4 h-4 mr-3 text-pink-400" />Video
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-white/5 cursor-pointer py-2.5" onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-3 text-blue-400" />Dosya
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={editingMessage ? editContent : newMessage}
              onChange={(e) => {
                if (editingMessage) setEditContent(e.target.value);
                else { setNewMessage(e.target.value); handleTyping(); }
              }}
              placeholder={editingMessage ? "Mesajı düzenle..." : "Mesaj"}
              className="w-full bg-[#0e1621] text-white text-[15px] rounded-2xl py-2.5 px-4 pr-10 focus:outline-none focus:ring-1 focus:ring-[#4A90E2]/50 placeholder-gray-500"
              data-testid="message-input"
            />
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-full emoji-trigger-btn">
              <Smile className={`w-5 h-5 ${showEmojiPicker ? 'text-[#4A90E2]' : 'text-gray-400'}`} />
            </button>
          </div>

          <button type="submit" disabled={editingMessage ? !editContent.trim() : (!newMessage.trim() || sending || uploading)} className="p-2.5 bg-[#4A90E2] rounded-full hover:bg-[#3d7bc7] transition-colors disabled:opacity-50" data-testid="send-message-btn">
            {sending || uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : editingMessage ? <Check className="w-5 h-5 text-white" /> : <Send className="w-5 h-5 text-white" />}
          </button>
        </div>
      </form>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="bg-[#17212b] border-gray-700 max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#4A90E2]" />
              Grup Üyeleri ({subgroup?.memberCount || 0})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#4A90E2] animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Üye bulunamadı</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.uid} className="flex items-center gap-3 p-3 bg-[#0e1621] rounded-xl hover:bg-[#1a2733] transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0">
                      {member.profileImageUrl ? (
                        <img src={member.profileImageUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-[#17212b] flex items-center justify-center">
                          <span className="text-white font-semibold">{member.firstName?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">{member.firstName} {member.lastName}</p>
                        {member.isAdmin && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                      </div>
                      {member.profession && (
                        <p className="text-gray-400 text-sm truncate">{member.profession}</p>
                      )}
                      <p className="text-gray-500 text-xs">{member.city}</p>
                    </div>
                    {member.uid !== user.uid && (
                      <Button size="sm" variant="outline" onClick={() => startPrivateChat(member.uid)} className="flex-shrink-0 gap-1">
                        <MessageCircle className="w-4 h-4" />
                        Mesaj
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.show} onOpenChange={(open) => !open && setDeleteDialog({ show: false, message: null })}>
        <DialogContent className="bg-[#17212b] border-gray-700 max-w-sm">
          <DialogHeader><DialogTitle className="text-white text-center">Mesajı Sil</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-gray-400 text-center text-sm">Bu mesajı silmek istediğinize emin misiniz?</p>
            {(deleteDialog.message?.senderId === user.uid || isAdmin) && (
              <Button onClick={handleDeleteForEveryone} variant="ghost" className="w-full justify-start text-red-400 hover:text-red-400 hover:bg-red-400/10">
                <Trash2 className="w-4 h-4 mr-3" />Herkesten Sil
              </Button>
            )}
            <Button onClick={handleDeleteForMe} variant="ghost" className="w-full justify-start text-white hover:bg-white/5">
              <Trash2 className="w-4 h-4 mr-3 text-gray-400" />Benden Sil
            </Button>
            <Button onClick={() => setDeleteDialog({ show: false, message: null })} variant="ghost" className="w-full justify-center text-[#4A90E2] hover:bg-white/5">İptal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={forwardDialog.show} onOpenChange={(open) => !open && setForwardDialog({ show: false, message: null })}>
        <DialogContent className="bg-[#17212b] border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Mesajı İlet</DialogTitle></DialogHeader>
          <div className="py-4"><p className="text-gray-400 text-center">Bu özellik yakında eklenecek.</p></div>
          <Button onClick={() => setForwardDialog({ show: false, message: null })} className="w-full">Tamam</Button>
        </DialogContent>
      </Dialog>

      {/* Pending Requests Dialog */}
      <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
        <DialogContent className="bg-[#17212b] border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Katılma İstekleri</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {pendingRequests.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Bekleyen istek yok</p>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center gap-3 bg-[#0e1621] rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">{request.userName?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{request.userName}</p>
                    <p className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRequest(request.id, 'approve')} className="p-2 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500/30"><Check className="w-4 h-4" /></button>
                    <button onClick={() => handleRequest(request.id, 'reject')} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
