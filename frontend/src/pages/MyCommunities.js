import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Search, MapPin, ChevronRight, 
  Crown, Loader2, MessageCircle, Globe
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MyCommunities() {
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyCommunities();
  }, []);

  const fetchMyCommunities = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/communities/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMyCommunities(data);
    } catch (error) {
      console.error('Topluluklarım yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunities = myCommunities.filter(c =>
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
    <div className="min-h-screen bg-[#0e1621]" data-testid="my-communities-page">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-gray-800 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-white mb-4">Topluluklarım</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Topluluk ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1621] text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
            data-testid="my-community-search"
          />
        </div>
      </div>

      {/* Communities List */}
      <div className="p-4 space-y-3">
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz bir topluluğa üye değilsiniz'}
            </p>
            <button
              onClick={() => navigate('/communities')}
              className="mt-4 text-[#4A90E2] hover:underline flex items-center gap-2 mx-auto"
            >
              <Globe className="w-4 h-4" />
              Tüm toplulukları keşfet
            </button>
          </div>
        ) : (
          filteredCommunities.map((community) => (
            <div
              key={community.id}
              className="bg-[#17212b] rounded-xl p-4 hover:bg-[#1e2c3a] transition-colors cursor-pointer"
              onClick={() => navigate(`/community/${community.id}`)}
              data-testid={`my-community-${community.id}`}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/community/${community.id}`);
                    }}
                    className="bg-[#4A90E2] text-white text-sm p-2 rounded-lg hover:bg-[#3a7bc8] transition-colors"
                    data-testid={`enter-community-${community.id}`}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
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
