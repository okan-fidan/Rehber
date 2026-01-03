import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, Search, X, Users, MessageCircle, User, FileText, 
  Briefcase, Settings, Plus, Megaphone, UsersRound, Lock, Star, Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CITY_IMAGES = {
  'İstanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=200',
  'Ankara': 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=200',
  'İzmir': 'https://images.unsplash.com/photo-1589652717521-10c0d092dea9?w=200',
  'Bursa': 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=200',
  'Türkiye': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=200',
  'default': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200'
};

export default function Groups() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', type: 'group' });
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile) {
      fetchAllGroups();
      checkAdmin();
    }
  }, [userProfile]);

  const checkAdmin = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/user/is-admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const fetchAllGroups = async () => {
    if (!userProfile) return;
    
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch(`${BACKEND_URL}/api/all-groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const groups = await response.json();
        setMyGroups(groups);
      }
      
      const usersResponse = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = [];
    
    allUsers.forEach(u => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      if (fullName.includes(lowerQuery) || u.email?.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'user',
          data: u,
          highlight: `${u.firstName} ${u.lastName}`
        });
      }
    });

    myGroups.forEach(g => {
      if (g.name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'group',
          data: g,
          highlight: g.name
        });
      }
    });

    setSearchResults(results);
  };

  const openChat = (groupId, groupName) => {
    navigate(`/chat/${groupId}?name=${encodeURIComponent(groupName)}`);
  };

  const openPrivateChat = (userId, userName) => {
    navigate(`/messages/${userId}?name=${encodeURIComponent(userName)}`);
    setShowSearch(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupData.name.trim()) {
      alert('Grup adı gerekli');
      return;
    }

    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/custom-groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGroupData)
      });

      if (response.ok) {
        alert(`${newGroupData.type === 'channel' ? 'Kanal' : newGroupData.type === 'community' ? 'Topluluk' : 'Grup'} oluşturuldu`);
        setShowCreateGroup(false);
        setNewGroupData({ name: '', description: '', type: 'group' });
        fetchAllGroups();
      } else {
        const error = await response.json();
        alert(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      alert('İşlem başarısız');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center" data-testid="groups-loading">
        <Loader2 className="w-8 h-8 text-[#4A90E2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621]" data-testid="groups-page">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-[#242f3d] px-4 py-3 flex items-center justify-between">
        <button onClick={() => setShowMenu(true)} className="p-1" data-testid="menu-button">
          <Menu className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Sohbetler</h1>
        <button onClick={() => setShowSearch(true)} className="p-1" data-testid="search-button">
          <Search className="w-6 h-6 text-[#4A90E2]" />
        </button>
      </div>

      {/* Group List */}
      <div className="p-2">
        {myGroups.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Henüz grup yok</p>
            <p className="text-gray-500 text-sm">Gruplar yükleniyor...</p>
          </div>
        ) : (
          <>
            <p className="text-[#4A90E2] text-xs font-semibold uppercase px-4 py-3">
              Tüm Gruplar ({myGroups.length})
            </p>
            {myGroups.map((group) => {
              const groupImage = group.imageUrl || CITY_IMAGES[group.city] || CITY_IMAGES['default'];
              const isGroupAdmin = group.admins?.includes(user?.uid);
              
              return (
                <button
                  key={group.id}
                  onClick={() => openChat(group.id || group.groupId, group.name)}
                  className="w-full flex items-center gap-4 p-4 bg-[#17212b] rounded-xl mb-2 hover:bg-[#1e2c3a] transition-colors"
                  data-testid={`group-item-${group.id}`}
                >
                  <div className="relative">
                    <img 
                      src={groupImage} 
                      alt={group.name}
                      className="w-14 h-14 rounded-full object-cover bg-[#242f3d]"
                    />
                    <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full ${isGroupAdmin ? 'bg-yellow-500' : 'bg-[#4A90E2]'} flex items-center justify-center border-2 border-[#17212b]`}>
                      {isGroupAdmin ? <Star className="w-3 h-3 text-white" /> : <Users className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{group.name}</span>
                      {isGroupAdmin && (
                        <span className="bg-yellow-500 text-black text-[10px] font-semibold px-2 py-0.5 rounded">Yönetici</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-gray-500 text-sm truncate max-w-[200px]">
                        {group.description || 'Gruba hoş geldiniz!'}
                      </p>
                      <div className="flex items-center gap-1 bg-[#242f3d] px-2 py-1 rounded-full">
                        <Users className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-500 text-xs">{group.memberCount || group.members?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* FAB */}
      <Link 
        to="/messages" 
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#4A90E2] rounded-full flex items-center justify-center shadow-lg hover:bg-[#3a7bc8] transition-colors"
        data-testid="new-message-fab"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </Link>

      {/* Menu Modal */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMenu(false)}>
          <div className="w-80 max-w-[80%] h-full bg-[#17212b] p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#242f3d]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#4A90E2] rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    {userProfile?.firstName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold">{userProfile?.firstName} {userProfile?.lastName}</p>
                  <p className="text-gray-500 text-xs">{userProfile?.email}</p>
                </div>
              </div>
              <button onClick={() => setShowMenu(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-1">
              {isAdmin && (
                <>
                  <p className="text-[#4A90E2] text-xs font-semibold uppercase mb-2">Yönetici İşlemleri</p>
                  
                  <button 
                    onClick={() => { setShowMenu(false); setNewGroupData({ name: '', description: '', type: 'group' }); setShowCreateGroup(true); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
                  >
                    <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white">Yeni Grup Oluştur</span>
                  </button>

                  <button 
                    onClick={() => { setShowMenu(false); setNewGroupData({ name: '', description: '', type: 'channel' }); setShowCreateGroup(true); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
                  >
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white">Yeni Kanal Oluştur</span>
                  </button>

                  <button 
                    onClick={() => { setShowMenu(false); setNewGroupData({ name: '', description: '', type: 'community' }); setShowCreateGroup(true); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
                  >
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                      <UsersRound className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white">Yeni Topluluk Oluştur</span>
                  </button>

                  <Link 
                    to="/admin" 
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
                  >
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white">Yönetici Paneli</span>
                  </Link>
                </>
              )}

              <p className="text-[#4A90E2] text-xs font-semibold uppercase mt-4 mb-2">Genel</p>

              <Link 
                to="/messages" 
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-white">Kişiler</span>
              </Link>

              <Link 
                to="/profile" 
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
              >
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="text-white">Profilim</span>
              </Link>

              <Link 
                to="/posts" 
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
              >
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-white">Gönderiler</span>
              </Link>

              <Link 
                to="/collaboration" 
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#242f3d] rounded-lg"
              >
                <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-white">İş Birliği</span>
              </Link>

              {!isAdmin && (
                <div className="bg-[#0e1621] rounded-xl p-3 mt-4 flex gap-2">
                  <Lock className="w-4 h-4 text-gray-500 mt-0.5" />
                  <p className="text-gray-500 text-xs">
                    Grup, kanal ve topluluk oluşturma yetkisi sadece yöneticilere aittir.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowCreateGroup(false)}>
          <div className="w-full bg-[#17212b] rounded-t-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#242f3d]">
              <h2 className="text-lg font-semibold text-white">
                {newGroupData.type === 'channel' ? 'Yeni Kanal' : 
                 newGroupData.type === 'community' ? 'Yeni Topluluk' : 'Yeni Grup'}
              </h2>
              <button onClick={() => setShowCreateGroup(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-gray-500 text-sm mb-2 block">
                  {newGroupData.type === 'channel' ? 'Kanal Adı' : 
                   newGroupData.type === 'community' ? 'Topluluk Adı' : 'Grup Adı'}
                </label>
                <input
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="İsim girin..."
                  className="w-full bg-[#0e1621] text-white rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  data-testid="create-group-name"
                />
              </div>

              <div>
                <label className="text-gray-500 text-sm mb-2 block">Açıklama</label>
                <textarea
                  value={newGroupData.description}
                  onChange={(e) => setNewGroupData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Açıklama girin..."
                  rows={3}
                  className="w-full bg-[#0e1621] text-white rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] resize-none"
                  data-testid="create-group-description"
                />
              </div>

              <button 
                onClick={handleCreateGroup}
                className="w-full bg-[#4A90E2] text-white rounded-xl py-4 font-semibold hover:bg-[#3a7bc8] transition-colors"
                data-testid="create-group-submit"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-[#0e1621] z-50">
          <div className="bg-[#17212b] border-b border-[#242f3d] px-4 py-3 flex items-center gap-3">
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
              <X className="w-6 h-6 text-white" />
            </button>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => performSearch(e.target.value)}
              placeholder="Grup veya kişi ara..."
              className="flex-1 bg-[#242f3d] text-white rounded-full px-4 py-2 focus:outline-none"
              data-testid="search-input"
            />
          </div>

          <div className="p-4">
            {searchQuery && searchResults.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold">Sonuç bulunamadı</p>
                <p className="text-gray-500 text-sm">&quot;{searchQuery}&quot; için sonuç yok</p>
              </div>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <p className="text-[#4A90E2] text-sm mb-3">{searchResults.length} sonuç bulundu</p>
                )}
                {searchResults.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => item.type === 'user' ? openPrivateChat(item.data.uid, `${item.data.firstName} ${item.data.lastName}`) : openChat(item.data.id, item.data.name)}
                    className="w-full flex items-center gap-3 p-3 bg-[#17212b] rounded-xl mb-2 hover:bg-[#1e2c3a]"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${item.type === 'user' ? 'bg-green-600' : 'bg-[#4A90E2]'}`}>
                      {item.type === 'user' ? <User className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-white" />}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold">
                        {item.type === 'user' ? `${item.data.firstName} ${item.data.lastName}` : item.data.name}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {item.type === 'user' ? item.data.city : `${item.data.memberCount || 0} üye`}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
