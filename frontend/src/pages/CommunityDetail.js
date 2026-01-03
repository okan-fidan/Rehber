import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, Users, Plus, Crown, UserCheck, 
  Megaphone, Loader2,
  Lock, Globe, MessageCircle, UserPlus, Settings,
  ArrowUp, ArrowDown, Edit, X, Check, UserMinus,
  Bell, Shield
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { toast } from "../hooks/use-toast";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const [announcements, setAnnouncements] = useState([]);
  const [newGroupDialog, setNewGroupDialog] = useState(false);
  const [newAnnouncementDialog, setNewAnnouncementDialog] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', isPublic: true });
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Üye yönetimi state'leri
  const [membersDialog, setMembersDialog] = useState(false);
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);
  const [subgroupMembers, setSubgroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [editGroupDialog, setEditGroupDialog] = useState(false);
  const [editGroupData, setEditGroupData] = useState({ name: '', description: '', imageUrl: '' });
  
  // Yeni: İstek yönetimi state'leri
  const [requestsDialog, setRequestsDialog] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Yeni: Topluluk üyelerinden yönetici seçme
  const [addAdminDialog, setAddAdminDialog] = useState(false);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [loadingCommunityMembers, setLoadingCommunityMembers] = useState(false);

  useEffect(() => {
    fetchCommunity();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab, id]);

  const fetchCommunity = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/communities/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCommunity(data);
    } catch (error) {
      console.error('Topluluk yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/communities/${id}/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAnnouncements(data);
    } catch (error) {
      console.error('Duyurular yüklenirken hata:', error);
    }
  };

  const fetchSubgroupMembers = async (subgroupId) => {
    setLoadingMembers(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${subgroupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSubgroupMembers(data);
    } catch (error) {
      console.error('Üyeler yüklenirken hata:', error);
      toast({ title: "Hata", description: "Üyeler yüklenemedi", variant: "destructive" });
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchPendingRequests = async (subgroupId) => {
    setLoadingRequests(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${subgroupId}/pending-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPendingRequests(data);
    } catch (error) {
      console.error('İstekler yüklenirken hata:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchCommunityMembers = async () => {
    setLoadingCommunityMembers(true);
    try {
      const token = await user.getIdToken();
      // Topluluk üyelerini getir
      const memberIds = community?.members || [];
      const members = [];
      for (const uid of memberIds.slice(0, 50)) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/users/${uid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const userData = await res.json();
            members.push(userData);
          }
        } catch (e) {
          // Skip failed fetches
        }
      }
      setCommunityMembers(members);
    } catch (error) {
      console.error('Topluluk üyeleri yüklenirken hata:', error);
    } finally {
      setLoadingCommunityMembers(false);
    }
  };

  const handleJoinCommunity = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/communities/${id}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast({ title: "Başarılı", description: "Topluluğa katıldınız! Start grubuna eklendiniz." });
      fetchCommunity();
    } catch (error) {
      toast({ title: "Hata", description: "Katılım başarısız", variant: "destructive" });
    }
  };

  const handleLeaveCommunity = async () => {
    if (!window.confirm('Topluluktan ayrılmak istediğinize emin misiniz?')) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/communities/${id}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast({ title: "Başarılı", description: "Topluluktan ayrıldınız" });
      navigate('/communities');
    } catch (error) {
      toast({ title: "Hata", description: "Ayrılma başarısız", variant: "destructive" });
    }
  };

  const handleCreateSubGroup = async () => {
    if (!newGroupData.name.trim()) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/communities/${id}/subgroups`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGroupData)
      });
      toast({ title: "Başarılı", description: "Alt grup oluşturuldu" });
      setNewGroupDialog(false);
      setNewGroupData({ name: '', description: '', isPublic: true });
      fetchCommunity();
    } catch (error) {
      toast({ title: "Hata", description: "Alt grup oluşturulamadı", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/communities/${id}/announcements`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newAnnouncement })
      });
      toast({ title: "Başarılı", description: "Duyuru gönderildi" });
      setNewAnnouncementDialog(false);
      setNewAnnouncement('');
      fetchAnnouncements();
    } catch (error) {
      toast({ title: "Hata", description: "Duyuru gönderilemedi", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Üye yükseltme
  const handlePromoteMember = async (memberId) => {
    if (!selectedSubgroup) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}/promote/${memberId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Başarılı", description: data.message });
        fetchSubgroupMembers(selectedSubgroup.id);
        fetchCommunity();
      } else {
        toast({ title: "Hata", description: data.detail || "Yükseltme başarısız", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Yükseltme başarısız", variant: "destructive" });
    }
  };

  // Üye düşürme
  const handleDemoteMember = async (memberId) => {
    if (!selectedSubgroup) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}/demote/${memberId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Başarılı", description: data.message });
        fetchSubgroupMembers(selectedSubgroup.id);
        fetchCommunity();
      } else {
        toast({ title: "Hata", description: data.detail || "Düşürme başarısız", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Düşürme başarısız", variant: "destructive" });
    }
  };

  // Grup düzenleme
  const handleUpdateSubgroup = async () => {
    if (!selectedSubgroup) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editGroupData)
      });
      if (res.ok) {
        toast({ title: "Başarılı", description: "Grup güncellendi" });
        setEditGroupDialog(false);
        fetchCommunity();
      } else {
        const data = await res.json();
        toast({ title: "Hata", description: data.detail || "Güncelleme başarısız", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Katılma isteği gönder
  const handleRequestJoin = async (subgroupId) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${subgroupId}/request-join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Başarılı", description: "Katılma isteği gönderildi" });
        fetchCommunity();
      } else {
        toast({ title: "Hata", description: data.detail || "İstek gönderilemedi", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "İstek gönderilemedi", variant: "destructive" });
    }
  };

  // İstek onayla
  const handleApproveRequest = async (requestId) => {
    if (!selectedSubgroup) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}/approve-request/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Başarılı", description: "Katılma isteği onaylandı" });
        fetchPendingRequests(selectedSubgroup.id);
        fetchSubgroupMembers(selectedSubgroup.id);
        fetchCommunity();
      }
    } catch (error) {
      toast({ title: "Hata", description: "Onaylama başarısız", variant: "destructive" });
    }
  };

  // İstek reddet
  const handleRejectRequest = async (requestId) => {
    if (!selectedSubgroup) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}/reject-request/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast({ title: "Başarılı", description: "Katılma isteği reddedildi" });
      fetchPendingRequests(selectedSubgroup.id);
    } catch (error) {
      toast({ title: "Hata", description: "Reddetme başarısız", variant: "destructive" });
    }
  };

  // Yönetici ekle
  const handleAddAdmin = async (userId) => {
    if (!selectedSubgroup) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}/add-admin/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Başarılı", description: data.message });
        setAddAdminDialog(false);
        fetchSubgroupMembers(selectedSubgroup.id);
        fetchCommunity();
      } else {
        toast({ title: "Hata", description: data.detail || "Yönetici eklenemedi", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Yönetici eklenemedi", variant: "destructive" });
    }
  };

  // Yönetici yetkisi al
  const handleRemoveAdmin = async (userId) => {
    if (!selectedSubgroup) return;
    if (!window.confirm('Yönetici yetkisini almak istediğinize emin misiniz?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}/remove-admin/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Başarılı", description: "Yönetici yetkisi alındı" });
        fetchSubgroupMembers(selectedSubgroup.id);
        fetchCommunity();
      }
    } catch (error) {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    }
  };

  // Üye çıkar
  const handleRemoveMember = async (userId) => {
    if (!selectedSubgroup) return;
    if (!window.confirm('Üyeyi gruptan çıkarmak istediğinize emin misiniz?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/subgroups/${selectedSubgroup.id}/remove-member/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Başarılı", description: "Üye gruptan çıkarıldı" });
        fetchSubgroupMembers(selectedSubgroup.id);
        fetchCommunity();
      }
    } catch (error) {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    }
  };

  const openMembersDialog = (subgroup) => {
    setSelectedSubgroup(subgroup);
    fetchSubgroupMembers(subgroup.id);
    setMembersDialog(true);
  };

  const openEditDialog = (subgroup) => {
    setSelectedSubgroup(subgroup);
    setEditGroupData({
      name: subgroup.name,
      description: subgroup.description || '',
      imageUrl: subgroup.imageUrl || ''
    });
    setEditGroupDialog(true);
  };

  const openRequestsDialog = (subgroup) => {
    setSelectedSubgroup(subgroup);
    fetchPendingRequests(subgroup.id);
    setRequestsDialog(true);
  };

  const openAddAdminDialog = (subgroup) => {
    setSelectedSubgroup(subgroup);
    fetchSubgroupMembers(subgroup.id);
    setAddAdminDialog(true);
  };

  const isSuperAdmin = community?.isSuperAdmin || userProfile?.isAdmin || userProfile?.email?.toLowerCase() === 'metaticaretim@gmail.com';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A90E2]" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <p className="text-gray-400">Topluluk bulunamadı</p>
      </div>
    );
  }

  const getLevelColor = (level) => {
    switch(level) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-purple-500';
      case 4: return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Bekleyen istek sayısını hesapla
  const getTotalPendingRequests = () => {
    return community.subGroupsList?.reduce((total, sg) => {
      const pending = sg.pendingRequests?.filter(r => r.status === 'pending')?.length || 0;
      return total + pending;
    }, 0) || 0;
  };

  return (
    <div className="min-h-screen bg-[#0e1621] pb-20">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-gray-800">
        <div className="p-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Geri</span>
          </button>

          <div className="flex items-start gap-4 mb-4">
            <img
              src={community.imageUrl}
              alt={community.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white truncate">{community.name}</h1>
                {isSuperAdmin && (
                  <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-400">{community.memberCount} üye</p>
            </div>
            
            {community.isMember ? (
              <div className="flex gap-2">
                {!isSuperAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLeaveCommunity}
                    className="text-red-400 border-red-400 hover:bg-red-400/10"
                  >
                    Ayrıl
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={handleJoinCommunity} data-testid="join-community-btn">
                Katıl
              </Button>
            )}
          </div>

          {community.description && (
            <p className="text-gray-400 text-sm mb-4">{community.description}</p>
          )}

          {/* Admin Actions */}
          {isSuperAdmin && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <Dialog open={newGroupDialog} onOpenChange={setNewGroupDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Alt Grup Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#17212b] border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Yeni Alt Grup Oluştur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Grup Adı</Label>
                      <Input
                        value={newGroupData.name}
                        onChange={(e) => setNewGroupData({...newGroupData, name: e.target.value})}
                        placeholder="Örn: Teknoloji Girişimcileri"
                        className="bg-[#0e1621] border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Açıklama</Label>
                      <Textarea
                        value={newGroupData.description}
                        onChange={(e) => setNewGroupData({...newGroupData, description: e.target.value})}
                        placeholder="Grup hakkında kısa bir açıklama..."
                        className="bg-[#0e1621] border-gray-700 text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-white">Herkese Açık</Label>
                      <Switch
                        checked={newGroupData.isPublic}
                        onCheckedChange={(checked) => setNewGroupData({...newGroupData, isPublic: checked})}
                      />
                    </div>
                    <Button 
                      onClick={handleCreateSubGroup} 
                      disabled={submitting || !newGroupData.name.trim()}
                      className="w-full"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Oluştur'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={newAnnouncementDialog} onOpenChange={setNewAnnouncementDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Megaphone className="w-4 h-4" />
                    Duyuru Yap
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#17212b] border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Yeni Duyuru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Duyuru içeriği..."
                      className="bg-[#0e1621] border-gray-700 text-white min-h-[100px]"
                    />
                    <Button 
                      onClick={handleSendAnnouncement} 
                      disabled={submitting || !newAnnouncement.trim()}
                      className="w-full"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gönder'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {getTotalPendingRequests() > 0 && (
                <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  {getTotalPendingRequests()} bekleyen istek
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'groups' 
                  ? 'bg-[#4A90E2] text-white' 
                  : 'bg-[#0e1621] text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Alt Gruplar
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'announcements' 
                  ? 'bg-[#4A90E2] text-white' 
                  : 'bg-[#0e1621] text-gray-400 hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Duyurular
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'groups' && (
          <div className="space-y-3">
            {community.subGroupsList?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Henüz alt grup yok</p>
              </div>
            ) : (
              community.subGroupsList?.map((subgroup) => {
                const pendingCount = subgroup.pendingRequests?.filter(r => r.status === 'pending')?.length || 0;
                const isGroupAdmin = subgroup.isGroupAdmin || isSuperAdmin;
                
                return (
                  <div
                    key={subgroup.id}
                    className="bg-[#17212b] rounded-xl p-4 hover:bg-[#1e2c3a] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Grup Fotoğrafı */}
                      <div className={`w-14 h-14 ${getLevelColor(subgroup.level)} rounded-full flex items-center justify-center overflow-hidden`}>
                        {subgroup.imageUrl ? (
                          <img src={subgroup.imageUrl} alt={subgroup.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl text-white">{subgroup.name?.charAt(0)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-semibold truncate">{subgroup.name}</h3>
                          {subgroup.level && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelColor(subgroup.level)} text-white`}>
                              Lv.{subgroup.level}
                            </span>
                          )}
                          {!subgroup.isPublic && <Lock className="w-3 h-3 text-gray-500" />}
                          {subgroup.isMember && <UserCheck className="w-4 h-4 text-green-500" />}
                          {subgroup.isGroupAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                        {subgroup.description && (
                          <p className="text-sm text-gray-400 truncate">{subgroup.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{subgroup.memberCount} üye</p>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {/* Yönetici İşlemleri */}
                        {isGroupAdmin && (
                          <>
                            {pendingCount > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openRequestsDialog(subgroup)}
                                className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 p-2 relative"
                                title="Bekleyen İstekler"
                              >
                                <Bell className="w-4 h-4" />
                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                  {pendingCount}
                                </span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openMembersDialog(subgroup)}
                              className="text-gray-400 hover:text-white p-2"
                              title="Üyeleri Yönet"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAddAdminDialog(subgroup)}
                              className="text-gray-400 hover:text-white p-2"
                              title="Yönetici Ekle"
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(subgroup)}
                              className="text-gray-400 hover:text-white p-2"
                              title="Grubu Düzenle"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {/* Üye İşlemleri */}
                        {subgroup.isMember ? (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/subgroup/${subgroup.id}`)}
                            className="gap-1"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Gir
                          </Button>
                        ) : subgroup.isPublic ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const token = await user.getIdToken();
                                await fetch(`${BACKEND_URL}/api/subgroups/${subgroup.id}/join`, {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                toast({ title: "Başarılı", description: "Gruba katıldınız" });
                                fetchCommunity();
                              } catch (error) {
                                toast({ title: "Hata", description: "Katılım başarısız", variant: "destructive" });
                              }
                            }}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        ) : subgroup.hasPendingRequest ? (
                          <span className="text-xs text-orange-400 px-2 py-1 bg-orange-500/20 rounded">
                            İstek Gönderildi
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestJoin(subgroup.id)}
                            className="gap-1 text-orange-400 border-orange-400 hover:bg-orange-400/10"
                          >
                            <UserPlus className="w-4 h-4" />
                            İstek Gönder
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Henüz duyuru yok</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="bg-[#17212b] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Megaphone className="w-5 h-5 text-[#4A90E2] mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-white whitespace-pre-wrap">{announcement.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>{announcement.senderName}</span>
                        <span>•</span>
                        <span>{new Date(announcement.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Üye Yönetimi Dialog */}
      <Dialog open={membersDialog} onOpenChange={setMembersDialog}>
        <DialogContent className="bg-[#17212b] border-gray-700 max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedSubgroup?.name} - Üyeler
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingMembers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#4A90E2]" />
              </div>
            ) : subgroupMembers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Henüz üye yok</p>
            ) : (
              subgroupMembers.map((member) => (
                <div key={member.uid} className="flex items-center gap-3 p-3 bg-[#0e1621] rounded-lg">
                  <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center overflow-hidden">
                    {member.profileImageUrl ? (
                      <img src={member.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate flex items-center gap-1">
                      {member.firstName} {member.lastName}
                      {member.isGroupAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{member.city}</p>
                  </div>
                  {(isSuperAdmin || selectedSubgroup?.isGroupAdmin) && member.uid !== user?.uid && (
                    <div className="flex gap-1">
                      {selectedSubgroup?.level < 4 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePromoteMember(member.uid)}
                          className="text-green-500 hover:text-green-400 hover:bg-green-500/10 p-1"
                          title="Üst Gruba Yükselt"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                      )}
                      {selectedSubgroup?.level > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDemoteMember(member.uid)}
                          className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 p-1"
                          title="Alt Gruba Düşür"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.uid)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1"
                        title="Gruptan Çıkar"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bekleyen İstekler Dialog */}
      <Dialog open={requestsDialog} onOpenChange={setRequestsDialog}>
        <DialogContent className="bg-[#17212b] border-gray-700 max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-400" />
              Bekleyen Katılma İstekleri
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#4A90E2]" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Bekleyen istek yok</p>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center gap-3 p-3 bg-[#0e1621] rounded-lg">
                  <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center overflow-hidden">
                    {request.userImage ? (
                      <img src={request.userImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {request.userName?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{request.userName}</p>
                    <p className="text-gray-500 text-xs">{request.userCity}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApproveRequest(request.id)}
                      className="text-green-500 hover:text-green-400 hover:bg-green-500/10 p-2"
                      title="Onayla"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectRequest(request.id)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2"
                      title="Reddet"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Yönetici Ekleme Dialog */}
      <Dialog open={addAdminDialog} onOpenChange={setAddAdminDialog}>
        <DialogContent className="bg-[#17212b] border-gray-700 max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              Yönetici Ekle/Çıkar
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingMembers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#4A90E2]" />
              </div>
            ) : subgroupMembers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Henüz üye yok</p>
            ) : (
              subgroupMembers.map((member) => (
                <div key={member.uid} className="flex items-center gap-3 p-3 bg-[#0e1621] rounded-lg">
                  <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center overflow-hidden">
                    {member.profileImageUrl ? (
                      <img src={member.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate flex items-center gap-1">
                      {member.firstName} {member.lastName}
                      {member.isGroupAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{member.city}</p>
                  </div>
                  {member.uid !== user?.uid && (
                    member.isGroupAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveAdmin(member.uid)}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        Yetkiyi Al
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddAdmin(member.uid)}
                      >
                        Yönetici Yap
                      </Button>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Grup Düzenleme Dialog */}
      <Dialog open={editGroupDialog} onOpenChange={setEditGroupDialog}>
        <DialogContent className="bg-[#17212b] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Grup Ayarları
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Grup Adı</Label>
              <Input
                value={editGroupData.name}
                onChange={(e) => setEditGroupData({...editGroupData, name: e.target.value})}
                placeholder="Grup adı"
                className="bg-[#0e1621] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Açıklama</Label>
              <Textarea
                value={editGroupData.description}
                onChange={(e) => setEditGroupData({...editGroupData, description: e.target.value})}
                placeholder="Grup açıklaması..."
                className="bg-[#0e1621] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Profil Fotoğrafı URL</Label>
              <div className="flex gap-2">
                <Input
                  value={editGroupData.imageUrl}
                  onChange={(e) => setEditGroupData({...editGroupData, imageUrl: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                  className="bg-[#0e1621] border-gray-700 text-white flex-1"
                />
                {editGroupData.imageUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#0e1621]">
                    <img 
                      src={editGroupData.imageUrl} 
                      alt="Önizleme" 
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={handleUpdateSubgroup} 
              disabled={submitting}
              className="w-full"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
