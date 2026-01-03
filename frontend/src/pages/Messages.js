import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, User, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Messages() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const openChat = (userId, userName) => {
    navigate(`/messages/${userId}?name=${encodeURIComponent(userName)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4A90E2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621]" data-testid="messages-page">
      {/* Header */}
      <div className="bg-[#17212b] border-b border-[#242f3d] px-4 py-4">
        <h1 className="text-xl font-bold text-white mb-4">Kişiler</h1>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kişi ara..."
            className="w-full bg-[#242f3d] text-white rounded-full pl-12 pr-4 py-3 focus:outline-none"
            data-testid="user-search"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="p-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Kullanıcı bulunamadı</p>
          </div>
        ) : (
          filteredUsers.map((u) => (
            <button
              key={u.uid}
              onClick={() => openChat(u.uid, `${u.firstName} ${u.lastName}`)}
              className="w-full flex items-center gap-3 p-3 bg-[#17212b] rounded-xl mb-2 hover:bg-[#1e2c3a] transition-colors"
              data-testid={`user-item-${u.uid}`}
            >
              <div className="relative">
                {u.profileImageUrl ? (
                  <img src={u.profileImageUrl} alt="" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {u.firstName?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#17212b]" />
              </div>
              
              <div className="flex-1 text-left">
                <p className="text-white font-semibold">{u.firstName} {u.lastName}</p>
                <p className="text-gray-500 text-sm">{u.city}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
