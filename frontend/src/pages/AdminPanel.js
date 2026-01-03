import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Globe, MessageSquare, FileText, Briefcase,
  TrendingUp, Shield, Settings, Search, ChevronRight,
  Crown, Trash2, UserPlus, MoreVertical, ArrowLeft,
  BarChart3, Activity, Calendar, Check, X, Loader2
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
import { Input } from "../components/ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [communityDetailDialog, setCommunityDetailDialog] = useState(false);

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      navigate('/my-communities');
      return;
    }
    fetchDashboard();
  }, [userProfile]);

  const fetchDashboard = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Dashboard yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/users?search=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    }
  };

  const fetchCommunities = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/communities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCommunities(data);
      }
    } catch (error) {
      console.error('Topluluklar yüklenirken hata:', error);
    }
  };

  const fetchCommunityDetail = async (communityId) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/communities/${communityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCommunity(data);
        setCommunityDetailDialog(true);
      }
    } catch (error) {
      console.error('Topluluk detayı yüklenirken hata:', error);
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/admin/users/${userId}/toggle-admin`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error) {
      console.error('Admin durumu değiştirilirken hata:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error) {
      console.error('Kullanıcı silinirken hata:', error);
    }
  };

  const handleMakeSuperAdminAll = async (userId) => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/admin/users/${userId}/make-super-admin-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
      alert('Kullanıcı tüm topluluklara süper admin olarak eklendi!');
    } catch (error) {
      console.error('İşlem sırasında hata:', error);
    }
  };

  const handleToggleSuperAdmin = async (communityId, userId, action) => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/admin/communities/${communityId}/super-admin`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, action })
      });
      fetchCommunityDetail(communityId);
    } catch (error) {
      console.error('Süper admin değiştirilirken hata:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'communities') fetchCommunities();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => fetchUsers(), 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4A90E2] animate-spin" />
      </div>
    );
  }

  if (!userProfile?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0e1621]" data-testid="admin-panel">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-gray-800 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/my-communities')}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#4A90E2]" />
            <h1 className="text-lg font-bold text-white">Admin Paneli</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#17212b] border-b border-gray-800 px-4">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'users', label: 'Kullanıcılar', icon: Users },
            { id: 'communities', label: 'Topluluklar', icon: Globe },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[#4A90E2] border-[#4A90E2]'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Toplam Kullanıcı" value={dashboard.stats.totalUsers} color="blue" />
              <StatCard icon={Globe} label="Topluluk" value={dashboard.stats.totalCommunities} color="purple" />
              <StatCard icon={MessageSquare} label="Mesaj" value={dashboard.stats.totalMessages} color="green" />
              <StatCard icon={FileText} label="Gönderi" value={dashboard.stats.totalPosts} color="orange" />
              <StatCard icon={Briefcase} label="Hizmet" value={dashboard.stats.totalServices} color="pink" />
              <StatCard icon={Users} label="Alt Grup" value={dashboard.stats.totalSubgroups} color="cyan" />
              <StatCard icon={TrendingUp} label="Bu Hafta Yeni" value={dashboard.stats.newUsersThisWeek} color="emerald" />
            </div>

            {/* Top Communities */}
            <div className="bg-[#17212b] rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#4A90E2]" />
                En Aktif Topluluklar
              </h3>
              <div className="space-y-3">
                {dashboard.topCommunities.map((community, index) => (
                  <div 
                    key={community.id}
                    className="flex items-center gap-3 p-3 bg-[#0e1621] rounded-lg"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#4A90E2]/20 text-[#4A90E2] flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{community.name}</p>
                      <p className="text-gray-400 text-sm">{community.city}</p>
                    </div>
                    <span className="text-[#4A90E2] font-semibold">{community.memberCount} üye</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Kullanıcı ara (isim, email, şehir)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#17212b] border-gray-700 text-white"
              />
            </div>

            {/* Users List */}
            <div className="space-y-2">
              {users.map(u => (
                <div 
                  key={u.uid}
                  className="bg-[#17212b] rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {u.firstName?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{u.firstName} {u.lastName}</p>
                      {u.isAdmin && (
                        <span className="px-2 py-0.5 bg-[#4A90E2]/20 text-[#4A90E2] text-xs rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm truncate">{u.email}</p>
                    <p className="text-gray-500 text-xs">{u.city} • {u.profession || 'Belirtilmemiş'}</p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-white/5 rounded-full">
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#17212b] border-gray-700">
                      <DropdownMenuItem 
                        onClick={() => handleToggleAdmin(u.uid)}
                        className="text-white hover:bg-white/5 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {u.isAdmin ? 'Admin Kaldır' : 'Admin Yap'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleMakeSuperAdminAll(u.uid)}
                        className="text-white hover:bg-white/5 cursor-pointer"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Tüm Topluluklara Admin Yap
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteUser(u.uid)}
                        className="text-red-400 hover:bg-white/5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Kullanıcıyı Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Communities Tab */}
        {activeTab === 'communities' && (
          <div className="space-y-2">
            {communities.map(community => (
              <div 
                key={community.id}
                className="bg-[#17212b] rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-[#1e2c3a] transition-colors"
                onClick={() => fetchCommunityDetail(community.id)}
              >
                <img
                  src={community.imageUrl || `https://ui-avatars.com/api/?name=${community.city}&background=4A90E2&color=fff`}
                  alt={community.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{community.name}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{community.memberCount} üye</span>
                    <span>{community.superAdminCount} süper admin</span>
                    <span>{community.subGroupCount} alt grup</span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Detail Dialog */}
      <Dialog open={communityDetailDialog} onOpenChange={setCommunityDetailDialog}>
        <DialogContent className="bg-[#17212b] border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedCommunity?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedCommunity && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0e1621] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-[#4A90E2]">{selectedCommunity.membersList?.length || 0}</p>
                  <p className="text-gray-400 text-sm">Üye</p>
                </div>
                <div className="bg-[#0e1621] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-400">{selectedCommunity.superAdmins?.length || 0}</p>
                  <p className="text-gray-400 text-sm">Süper Admin</p>
                </div>
                <div className="bg-[#0e1621] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{selectedCommunity.subGroupsList?.length || 0}</p>
                  <p className="text-gray-400 text-sm">Alt Grup</p>
                </div>
              </div>

              {/* Members */}
              <div>
                <h4 className="text-white font-semibold mb-2">Üyeler</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCommunity.membersList?.map(member => (
                    <div 
                      key={member.uid}
                      className="flex items-center gap-3 p-2 bg-[#0e1621] rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {member.firstName?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{member.firstName} {member.lastName}</p>
                        <p className="text-gray-500 text-xs">{member.email}</p>
                      </div>
                      {member.isSuperAdmin ? (
                        <button
                          onClick={() => handleToggleSuperAdmin(selectedCommunity.id, member.uid, 'remove')}
                          className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1 hover:bg-yellow-500/30"
                        >
                          <Crown className="w-3 h-3" />
                          Süper Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleSuperAdmin(selectedCommunity.id, member.uid, 'add')}
                          className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full hover:bg-gray-600"
                        >
                          Admin Yap
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subgroups */}
              <div>
                <h4 className="text-white font-semibold mb-2">Alt Gruplar</h4>
                <div className="space-y-2">
                  {selectedCommunity.subGroupsList?.map(sg => (
                    <div 
                      key={sg.id}
                      className="flex items-center gap-3 p-2 bg-[#0e1621] rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#4A90E2]/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-[#4A90E2]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{sg.name}</p>
                        <p className="text-gray-500 text-xs">{sg.memberCount} üye</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
    cyan: 'from-cyan-500 to-cyan-600',
    emerald: 'from-emerald-500 to-emerald-600',
  };

  return (
    <div className="bg-[#17212b] rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}
