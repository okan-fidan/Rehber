import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Camera, LogOut, Loader2, Trash2, FileText, Heart, MessageCircle,
  MapPin, Mail, Phone, Shield, Edit3, Check, X, Grid3X3, Settings, Users, Briefcase
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Profile() {
  const { user, signOut, userProfile, setUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [myPosts, setMyPosts] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [stats, setStats] = useState({ posts: 0, groups: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile) {
      setProfileData({ ...userProfile });
      setStats({
        posts: 0,
        groups: userProfile.groups?.length || 0
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (user) {
      fetchMyPosts();
      fetchMyGroups();
    }
  }, [user]);

  const fetchMyPosts = async () => {
    setPostsLoading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/my-posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const posts = await response.json();
        setMyPosts(posts);
        setStats(prev => ({ ...prev, posts: posts.length }));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    setGroupsLoading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/user/my-groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const groups = await response.json();
        setMyGroups(groups);
        setStats(prev => ({ ...prev, groups: groups.length }));
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setGroupsLoading(false);
    }
  };

  const deletePost = async (postId) => {
    const confirmed = window.confirm('Bu gönderiyi silmek istediğinizden emin misiniz?');
    if (!confirmed) return;
    
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
        setMyPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
        setStats(prev => ({ ...prev, posts: prev.posts - 1 }));
        alert('Gönderi başarıyla silindi!');
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.detail || 'Gönderi silinemedi');
      }
    } catch (error) {
      console.error('Delete post error:', error);
      alert('Bağlantı hatası: ' + error.message);
    }
  };

  const pickImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setProfileData({ ...profileData, profileImageUrl: event.target.result });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          occupation: profileData.occupation,
          profileImageUrl: profileData.profileImageUrl,
        })
      });
      
      if (response.ok) {
        setUserProfile(profileData);
        setEditing(false);
        alert('Profil güncellendi!');
      }
    } catch (error) {
      alert('Profil güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      await signOut();
      navigate('/login');
    }
  };

  const formatTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: tr });
  };

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621] pb-20" data-testid="profile-page">
      {/* Header Background */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
        
        {/* Settings button */}
        <button 
          onClick={() => setEditing(!editing)}
          className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 transition-colors"
        >
          {editing ? <X className="w-5 h-5 text-white" /> : <Settings className="w-5 h-5 text-white" />}
        </button>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-1">
              <div className="w-full h-full rounded-full bg-[#0e1621] p-1">
                {profileData.profileImageUrl ? (
                  <img 
                    src={profileData.profileImageUrl} 
                    alt="Profil"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#17212b] flex items-center justify-center">
                    <span className="text-4xl font-bold text-emerald-400">
                      {profileData.firstName?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {editing && (
              <button 
                onClick={pickImage}
                className="absolute bottom-1 right-1 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            )}
            
            {profileData.isAdmin && (
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-4">
        {/* Name & Edit */}
        <div className="text-center mb-4">
          {editing ? (
            <div className="flex items-center justify-center gap-2 mb-2">
              <input
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="bg-[#17212b] text-white text-center rounded-lg px-3 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="İsim"
              />
              <input
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="bg-[#17212b] text-white text-center rounded-lg px-3 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Soyisim"
              />
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-white mb-1">
              {profileData.firstName} {profileData.lastName}
            </h1>
          )}
          
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{profileData.city}</span>
            {profileData.isAdmin && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-full">
                Yönetici
              </span>
            )}
          </div>
          
          {/* Occupation */}
          {editing ? (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <input
                value={profileData.occupation || ''}
                onChange={(e) => setProfileData({ ...profileData, occupation: e.target.value })}
                className="bg-[#17212b] text-gray-300 text-center rounded-lg px-3 py-1 w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Mesleğinizi yazın"
              />
            </div>
          ) : profileData.occupation ? (
            <div className="flex items-center justify-center gap-2 mt-2 text-gray-400">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>{profileData.occupation}</span>
            </div>
          ) : null}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.posts}</p>
            <p className="text-gray-500 text-sm">Gönderi</p>
          </div>
          <div className="w-px bg-[#242f3d]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.groups}</p>
            <p className="text-gray-500 text-sm">Grup</p>
          </div>
        </div>

        {/* Action Buttons */}
        {editing ? (
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => { setEditing(false); setProfileData({ ...userProfile }); }}
              className="flex-1 py-3 bg-[#17212b] text-gray-400 rounded-xl font-semibold hover:bg-[#1e2830] transition-colors"
            >
              İptal
            </button>
            <button
              onClick={saveProfile}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Kaydet</>}
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {/* Admin Panel Button - Only for admins */}
            {profileData.isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Shield className="w-5 h-5" /> Admin Paneli
              </button>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-3 bg-[#17212b] text-white rounded-xl font-semibold hover:bg-[#1e2830] transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 className="w-5 h-5" /> Profili Düzenle
              </button>
              <button
                onClick={handleSignOut}
                className="py-3 px-4 bg-[#17212b] text-red-400 rounded-xl hover:bg-[#1e2830] transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Contact Info Cards */}
        <div className="space-y-3 mb-6">
          <div className="bg-[#17212b] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-500 text-xs">E-posta</p>
              <p className="text-white truncate">{profileData.email}</p>
            </div>
          </div>

          <div className="bg-[#17212b] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Telefon</p>
              {editing ? (
                <input
                  value={profileData.phone || ''}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full bg-[#0e1621] text-white rounded-lg px-3 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Telefon numarası"
                />
              ) : (
                <p className="text-white">{profileData.phone || 'Belirtilmemiş'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#17212b] rounded-xl p-1 mb-4">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'posts' 
                ? 'bg-emerald-500 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
            <span className="font-medium text-sm">Gönderiler</span>
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'groups' 
                ? 'bg-emerald-500 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium text-sm">Gruplar</span>
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'info' 
                ? 'bg-emerald-500 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="font-medium text-sm">Bilgiler</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' ? (
          <div>
            {postsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : myPosts.length === 0 ? (
              <div className="text-center py-16 bg-[#17212b] rounded-2xl">
                <div className="w-16 h-16 bg-[#242f3d] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-white font-semibold mb-1">Henüz gönderi yok</p>
                <p className="text-gray-500 text-sm">Paylaştığınız gönderiler burada görünecek</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myPosts.map((post) => (
                  <div key={post.id} className="bg-[#17212b] rounded-2xl overflow-hidden">
                    {/* Post Header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px]">
                          <div className="w-full h-full rounded-full bg-[#17212b] flex items-center justify-center overflow-hidden">
                            {profileData?.profileImageUrl ? (
                              <img src={profileData.profileImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold">{profileData?.firstName?.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{profileData?.firstName} {profileData?.lastName}</p>
                          <p className="text-gray-500 text-xs">{formatTime(post.timestamp)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deletePost(post.id)} 
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Post Content */}
                    {post.content && (
                      <p className="text-white px-4 pb-3">{post.content}</p>
                    )}
                    
                    {/* Post Image */}
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt="" className="w-full" />
                    )}
                    
                    {/* Post Stats */}
                    <div className="flex items-center gap-6 px-4 py-3 border-t border-[#242f3d]">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Heart className="w-5 h-5" />
                        <span className="text-sm">{post.likes?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{post.comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'groups' ? (
          <div>
            {groupsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : myGroups.length === 0 ? (
              <div className="text-center py-16 bg-[#17212b] rounded-2xl">
                <div className="w-16 h-16 bg-[#242f3d] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-white font-semibold mb-1">Henüz grup yok</p>
                <p className="text-gray-500 text-sm">Katıldığınız gruplar burada görünecek</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => navigate(`/chat/${group.id}?name=${encodeURIComponent(group.name)}`)}
                    className="w-full bg-[#17212b] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#1e2830] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px] flex-shrink-0">
                      {group.imageUrl ? (
                        <img src={group.imageUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-[#17212b] flex items-center justify-center">
                          <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{group.name}</p>
                        {group.isAdmin && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            Yönetici
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm truncate">{group.description || 'Gruba hoş geldiniz'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-3 h-3 text-gray-600" />
                        <span className="text-gray-600 text-xs">{group.memberCount || 0} üye</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#17212b] rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-4 py-3 border-b border-[#242f3d]">
              <User className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-gray-500 text-xs">Ad Soyad</p>
                <p className="text-white">{profileData.firstName} {profileData.lastName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b border-[#242f3d]">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-gray-500 text-xs">Meslek</p>
                <p className="text-white">{profileData.occupation || 'Belirtilmemiş'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b border-[#242f3d]">
              <Mail className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-gray-500 text-xs">E-posta</p>
                <p className="text-white">{profileData.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b border-[#242f3d]">
              <Phone className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-gray-500 text-xs">Telefon</p>
                <p className="text-white">{profileData.phone || 'Belirtilmemiş'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b border-[#242f3d]">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-gray-500 text-xs">Şehir</p>
                <p className="text-white">{profileData.city}</p>
              </div>
            </div>
            
            {profileData.isAdmin && (
              <div className="flex items-center gap-4 py-3">
                <Shield className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-gray-500 text-xs">Yetki</p>
                  <p className="text-yellow-400 font-semibold">Yönetici</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
