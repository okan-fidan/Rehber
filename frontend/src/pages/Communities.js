import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Search, MapPin, ChevronRight, 
  Crown, UserCheck, Loader2 
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/communities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCommunities(data);
    } catch (error) {
      console.error('Topluluklar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId) => {
    try {
      const token = await user.getIdToken();
      await fetch(`${BACKEND_URL}/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCommunities();
    } catch (error) {
      console.error('Topluluğa katılırken hata:', error);
    }
  };

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4A90E2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621]" data-testid="communities-page">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-gray-800 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-white mb-4">Tüm Topluluklar</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Şehir veya topluluk ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1621] text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
            data-testid="community-search"
          />
        </div>

        <p className="text-gray-500 text-sm mt-2">{communities.length} topluluk</p>
      </div>

      {/* Communities List */}
      <div className="p-4 space-y-3">
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz topluluk yok'}
            </p>
          </div>
        ) : (
          filteredCommunities.map((community) => (
            <div
              key={community.id}
              className="bg-[#17212b] rounded-xl p-4 hover:bg-[#1e2c3a] transition-colors cursor-pointer"
              onClick={() => navigate(`/community/${community.id}`)}
              data-testid={`community-${community.id}`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={community.imageUrl || `https://ui-avatars.com/api/?name=${community.city}&background=4A90E2&color=fff`}
                    alt={community.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {community.isSuperAdmin && (
                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold truncate">{community.name}</h3>
                    {community.isMember && (
                      <UserCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{community.city}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span>{community.memberCount} üye</span>
                    <span>{community.subGroupCount} alt grup</span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center gap-2">
                  {!community.isMember && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinCommunity(community.id);
                      }}
                      className="bg-[#4A90E2] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#3a7bc8] transition-colors"
                      data-testid={`join-community-${community.id}`}
                    >
                      Katıl
                    </button>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
