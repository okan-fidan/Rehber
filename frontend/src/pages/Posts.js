import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, User, X, Image as ImageIcon, Loader2, Heart, MessageCircle, 
  Send, Bookmark, MoreHorizontal, Trash2, Copy, Flag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Posts() {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', imageUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [likeAnimations, setLikeAnimations] = useState({});
  const [showPostMenu, setShowPostMenu] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalı');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPost({ ...newPost, imageUrl: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const createPost = async () => {
    if (!newPost.content && !newPost.imageUrl) {
      alert('Lütfen bir şeyler yazın veya fotoğraf ekleyin');
      return;
    }

    setUploading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPost)
      });
      
      if (response.ok) {
        const createdPost = await response.json();
        setPosts([{ ...createdPost, isLiked: false, likeCount: 0, commentCount: 0 }, ...posts]);
        setModalVisible(false);
        setNewPost({ content: '', imageUrl: '' });
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Gönderi oluşturulamadı');
    } finally {
      setUploading(false);
    }
  };

  const deletePost = async (postId) => {
    const confirmed = window.confirm('Bu gönderiyi silmek istediğinizden emin misiniz?');
    if (!confirmed) {
      setShowPostMenu(null);
      return;
    }
    
    try {
      const token = await user?.getIdToken();
      if (!token) {
        alert('Oturum hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
        setShowPostMenu(null);
        alert('Gönderi başarıyla silindi!');
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.detail || 'Gönderi silinemedi. Sadece kendi gönderilerinizi silebilirsiniz.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Bağlantı hatası: ' + error.message);
    }
  };

  const toggleLike = async (postId) => {
    setLikeAnimations(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setLikeAnimations(prev => ({ ...prev, [postId]: false }));
    }, 300);

    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { liked, likeCount } = await response.json();
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, isLiked: liked, likeCount } : p
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDoubleClick = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post && !post.isLiked) {
      toggleLike(postId);
    }
  };

  const openComments = async (post) => {
    setSelectedPost(post);
    setShowComments(true);
    setCommentsLoading(true);
    
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/posts/${post.id}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment.trim() })
      });
      
      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment('');
        setPosts(posts.map(p => 
          p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p
        ));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const toggleCommentLike = async (commentId) => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { liked, likeCount } = await response.json();
        setComments(comments.map(c => 
          c.id === commentId ? { ...c, isLiked: liked, likeCount } : c
        ));
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        setPosts(posts.map(p => 
          p.id === selectedPost?.id ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
        ));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const sharePost = async (postId) => {
    const shareUrl = `${window.location.origin}/posts`;
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: 'Network Solution Gönderi', 
          text: 'Bu gönderiyi incele!',
          url: shareUrl 
        });
        // Track share
        const token = await user?.getIdToken();
        if (token) {
          fetch(`${BACKEND_URL}/api/posts/${postId}/share`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => {});
        }
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled
      }
    }
    
    // Fallback: copy to clipboard
    copyToClipboard(shareUrl);
  };

  const copyToClipboard = (text) => {
    // Try modern API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => alert('Link panoya kopyalandı!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    // Fallback for non-HTTPS
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      alert('Link panoya kopyalandı!');
    } catch (err) {
      alert('Link: ' + text);
    }
    
    document.body.removeChild(textArea);
  };

  const copyPostLink = (postId) => {
    const shareUrl = `${window.location.origin}/posts`;
    copyToClipboard(shareUrl);
    setShowPostMenu(null);
  };

  const formatTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: tr });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621]" data-testid="posts-page">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#17212b] border-b border-[#242f3d]">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">Gönderiler</h1>
            <p className="text-gray-500 text-xs">Topluluk paylaşımları</p>
          </div>
          <button
            onClick={() => setModalVisible(true)}
            className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors"
            data-testid="new-post-button"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="p-3 pb-20 space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-[#17212b] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Henüz Gönderi Yok</h3>
            <p className="text-gray-500 text-sm mb-4">İlk gönderiyi paylaşan siz olun!</p>
            <button
              onClick={() => setModalVisible(true)}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
            >
              İlk Gönderi
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <article 
              key={post.id} 
              className="bg-[#17212b] rounded-2xl overflow-hidden"
              data-testid={`post-${post.id}`}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px]">
                    <div className="w-full h-full rounded-full bg-[#17212b] flex items-center justify-center overflow-hidden">
                      {post.userProfileImage ? (
                        <img src={post.userProfileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{post.userName?.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{post.userName}</p>
                    <p className="text-gray-500 text-xs">{formatTime(post.timestamp)}</p>
                  </div>
                </div>
                
                {/* 3 Dot Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                    className="p-2 hover:bg-[#242f3d] rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showPostMenu === post.id && (
                    <div className="absolute right-0 top-10 w-48 bg-[#242f3d] rounded-xl shadow-lg overflow-hidden z-20">
                      <button
                        onClick={() => copyPostLink(post.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#2d3a4d] transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">Linki Kopyala</span>
                      </button>
                      
                      {(post.userId === user?.uid || post.userId === userProfile?.uid) ? (
                        <button
                          onClick={() => deletePost(post.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2d3a4d] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Gönderiyi Sil</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => { alert('Gönderi raporlandı'); setShowPostMenu(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-orange-400 hover:bg-[#2d3a4d] transition-colors"
                        >
                          <Flag className="w-4 h-4" />
                          <span className="text-sm">Raporla</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              {post.content && (
                <p className="text-white px-4 pb-3 leading-relaxed">{post.content}</p>
              )}

              {/* Post Image */}
              {post.imageUrl && (
                <div 
                  className="relative bg-[#0e1621]"
                  onDoubleClick={() => handleDoubleClick(post.id)}
                >
                  <img 
                    src={post.imageUrl} 
                    alt="" 
                    className="w-full max-h-[500px] object-cover"
                  />
                  {likeAnimations[post.id] && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Heart className="w-24 h-24 text-emerald-500 fill-emerald-500 animate-ping" />
                    </div>
                  )}
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        post.isLiked 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-[#242f3d] text-gray-400 hover:bg-[#2d3a4d]'
                      }`}
                      data-testid={`like-btn-${post.id}`}
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-emerald-400' : ''}`} />
                      <span className="text-sm font-medium">{post.likeCount || 0}</span>
                    </button>
                    
                    <button 
                      onClick={() => openComments(post)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#242f3d] text-gray-400 hover:bg-[#2d3a4d] transition-colors"
                      data-testid={`comment-btn-${post.id}`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.commentCount || 0}</span>
                    </button>
                    
                    <button 
                      onClick={() => sharePost(post.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#242f3d] text-gray-400 hover:bg-[#2d3a4d] transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button className="p-2 rounded-xl bg-[#242f3d] text-gray-400 hover:bg-[#2d3a4d] transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Click outside to close menu */}
      {showPostMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowPostMenu(null)}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Create Post Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center" onClick={() => setModalVisible(false)}>
          <div className="w-full sm:max-w-lg bg-[#17212b] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#242f3d]">
              <button onClick={() => setModalVisible(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-white font-semibold">Yeni Gönderi</h2>
              <button
                onClick={createPost}
                disabled={uploading || (!newPost.content && !newPost.imageUrl)}
                className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
                data-testid="submit-post"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Paylaş'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {/* User info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#17212b] flex items-center justify-center overflow-hidden">
                    {userProfile?.profileImageUrl ? (
                      <img src={userProfile.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{userProfile?.firstName?.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <span className="text-white font-semibold">{userProfile?.firstName} {userProfile?.lastName}</span>
              </div>

              {/* Caption input */}
              <textarea
                placeholder="Ne düşünüyorsunuz?"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className="w-full bg-[#0e1621] text-white rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none min-h-[120px] placeholder-gray-500"
                data-testid="post-content"
              />

              {/* Image preview */}
              {newPost.imageUrl && (
                <div className="relative mt-4">
                  <img src={newPost.imageUrl} alt="" className="w-full rounded-xl" />
                  <button
                    onClick={() => setNewPost({ ...newPost, imageUrl: '' })}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 hover:bg-black/80 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}

              {/* Add photo button */}
              {!newPost.imageUrl && (
                <button 
                  onClick={pickImage}
                  className="w-full mt-4 p-4 border-2 border-dashed border-[#242f3d] rounded-xl flex items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-[#0e1621] transition-colors"
                >
                  <ImageIcon className="w-6 h-6 text-emerald-500" />
                  <span className="text-gray-400">Fotoğraf Ekle</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showComments && selectedPost && (
        <div className="fixed inset-0 bg-[#0e1621] z-50 flex flex-col">
          {/* Comments Header */}
          <div className="flex items-center justify-between px-4 py-4 bg-[#17212b] border-b border-[#242f3d]">
            <button onClick={() => { setShowComments(false); setSelectedPost(null); setComments([]); }}>
              <X className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-white font-semibold">Yorumlar</h2>
            <div className="w-6" />
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4">
            {commentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#17212b] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-white font-semibold">Henüz yorum yok</p>
                <p className="text-gray-500 text-sm">İlk yorumu siz yazın</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 bg-[#17212b] rounded-xl p-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px] flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-[#17212b] flex items-center justify-center overflow-hidden">
                        {comment.userProfileImage ? (
                          <img src={comment.userProfileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">{comment.userName?.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-white font-semibold text-sm">{comment.userName}</span>
                          <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
                        </div>
                        <button 
                          onClick={() => toggleCommentLike(comment.id)} 
                          className="p-1 flex-shrink-0"
                        >
                          <Heart className={`w-4 h-4 ${comment.isLiked ? 'text-emerald-400 fill-emerald-400' : 'text-gray-500'}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-gray-500 text-xs">{formatTime(comment.timestamp)}</span>
                        {comment.likeCount > 0 && (
                          <span className="text-gray-500 text-xs">{comment.likeCount} beğenme</span>
                        )}
                        {(comment.userId === user?.uid || comment.userId === userProfile?.uid) && (
                          <button 
                            onClick={() => deleteComment(comment.id)}
                            className="text-red-400 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Sil
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="bg-[#17212b] border-t border-[#242f3d] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px] flex-shrink-0">
              <div className="w-full h-full rounded-full bg-[#17212b] flex items-center justify-center overflow-hidden">
                {userProfile?.profileImageUrl ? (
                  <img src={userProfile.profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">{userProfile?.firstName?.charAt(0)}</span>
                )}
              </div>
            </div>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addComment()}
              placeholder="Yorum ekle..."
              className="flex-1 bg-[#0e1621] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              data-testid="comment-input"
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="px-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-emerald-600 transition-colors"
              data-testid="submit-comment"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
