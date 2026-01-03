import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, Users, Plus, Crown, UserCheck, 
  Megaphone, Settings, ChevronRight, Loader2,
  Lock, Globe, MessageCircle, UserPlus
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups', 'announcements', 'members'
  const [announcements, setAnnouncements] = useState([]);
  const [newGroupDialog, setNewGroupDialog] = useState(false);
  const [newAnnouncementDialog, setNewAnnouncementDialog] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', isPublic: true });
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleJoinCommunity = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/communities/${id}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCommunity();
    } catch (error) {
      console.error('Topluluğa katılırken hata:', error);
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
      navigate('/communities');
    } catch (error) {
      console.error('Topluluktan ayrılırken hata:', error);
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
      setNewGroupDialog(false);
      setNewGroupData({ name: '', description: '', isPublic: true });
      fetchCommunity();
    } catch (error) {
      console.error('Alt grup oluşturulurken hata:', error);
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
      setNewAnnouncementDialog(false);
      setNewAnnouncement('');
      fetchAnnouncements();
    } catch (error) {
      console.error('Duyuru gönderilirken hata:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinSubGroup = async (subgroupId) => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/subgroups/${subgroupId}/request-join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCommunity();
    } catch (error) {
      console.error('Gruba katılırken hata:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4A90E2] animate-spin" />
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

  const isSuperAdmin = community.isSuperAdmin || userProfile?.isAdmin;

  return (
    <div className="min-h-screen bg-[#0e1621]" data-testid="community-detail-page">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-gray-800">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => navigate('/communities')}
              className="p-2 hover:bg-[#0e1621] rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{community.name}</h1>
                {isSuperAdmin && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <p className="text-sm text-gray-400">{community.memberCount} üye</p>
            </div>
            
            {/* Actions */}
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

          {/* Description */}
          {community.description && (
            <p className="text-gray-400 text-sm mb-4">{community.description}</p>
          )}

          {/* Admin Actions */}
          {isSuperAdmin && (
            <div className="flex gap-2 mb-4">
              <Dialog open={newGroupDialog} onOpenChange={setNewGroupDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" data-testid="create-subgroup-btn">
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
                        data-testid="new-group-name"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Açıklama</Label>
                      <Textarea
                        value={newGroupData.description}
                        onChange={(e) => setNewGroupData({...newGroupData, description: e.target.value})}
                        placeholder="Grup hakkında kısa bir açıklama..."
                        className="bg-[#0e1621] border-gray-700 text-white"
                        data-testid="new-group-description"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-white">Herkese Açık</Label>
                      <Switch
                        checked={newGroupData.isPublic}
                        onCheckedChange={(checked) => setNewGroupData({...newGroupData, isPublic: checked})}
                        data-testid="new-group-public"
                      />
                    </div>
                    <Button 
                      onClick={handleCreateSubGroup} 
                      disabled={submitting || !newGroupData.name.trim()}
                      className="w-full"
                      data-testid="submit-new-group"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Oluştur'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={newAnnouncementDialog} onOpenChange={setNewAnnouncementDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2" data-testid="send-announcement-btn">
                    <Megaphone className="w-4 h-4" />
                    Duyuru Gönder
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
                      className="bg-[#0e1621] border-gray-700 text-white min-h-[120px]"
                      data-testid="announcement-content"
                    />
                    <Button 
                      onClick={handleSendAnnouncement} 
                      disabled={submitting || !newAnnouncement.trim()}
                      className="w-full"
                      data-testid="submit-announcement"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gönder'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                {isSuperAdmin && (
                  <p className="text-gray-500 text-sm mt-2">
                    Yukarıdaki "Alt Grup Ekle" butonunu kullanarak yeni grup oluşturabilirsiniz.
                  </p>
                )}
              </div>
            ) : (
              community.subGroupsList?.map((subgroup) => (
                <div
                  key={subgroup.id}
                  className="bg-[#17212b] rounded-xl p-4 hover:bg-[#1e2c3a] transition-colors"
                  data-testid={`subgroup-${subgroup.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#4A90E2] rounded-full flex items-center justify-center">
                      {subgroup.isPublic ? (
                        <Globe className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold truncate">{subgroup.name}</h3>
                        {subgroup.isMember && (
                          <UserCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        {subgroup.isGroupAdmin && (
                          <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      {subgroup.description && (
                        <p className="text-sm text-gray-400 truncate">{subgroup.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{subgroup.memberCount} üye</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {subgroup.isMember ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/subgroup/${subgroup.id}`)}
                          className="gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Sohbet
                        </Button>
                      ) : subgroup.hasPendingRequest ? (
                        <span className="text-xs text-yellow-500 px-3 py-1 bg-yellow-500/10 rounded-full">
                          İstek Bekliyor
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJoinSubGroup(subgroup.id)}
                          className="gap-2"
                          data-testid={`join-subgroup-${subgroup.id}`}
                        >
                          <UserPlus className="w-4 h-4" />
                          {subgroup.isPublic ? 'Katıl' : 'İstek Gönder'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
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
                <div
                  key={announcement.id}
                  className="bg-[#17212b] rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold">{announcement.senderName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(announcement.timestamp).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{announcement.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
