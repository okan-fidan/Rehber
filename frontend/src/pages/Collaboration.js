import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, MapPin, Phone, X, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const categories = ['Danışmanlık', 'Yazılım', 'Pazarlama', 'Tasarım', 'Finansal', 'Hukuk', 'Diğer'];

export default function Collaboration() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    category: 'Danışmanlık',
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const createService = async () => {
    if (!newService.title || !newService.description) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newService)
      });
      
      if (response.ok) {
        setModalVisible(false);
        setNewService({ title: '', description: '', category: 'Danışmanlık' });
        fetchServices();
        alert('İlan oluşturuldu!');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      alert('İlan oluşturulamadı');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4A90E2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]" data-testid="collaboration-page">
      {/* Header */}
      <div className="bg-[#2a2a2a] border-b border-[#333] px-5 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">İşbirliği</h1>
          <p className="text-gray-500 text-sm">Hizmetler ve ilanlar</p>
        </div>
        <button
          onClick={() => setModalVisible(true)}
          className="w-12 h-12 bg-[#4A90E2] rounded-full flex items-center justify-center"
          data-testid="new-service-button"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Services List */}
      <div className="p-4">
        {services.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#333] rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 text-lg">Henüz ilan yok</p>
            <p className="text-gray-500 text-sm">İlk ilanı siz oluşturun!</p>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className="bg-[#2a2a2a] rounded-2xl p-4 mb-4">
              <div className="flex gap-2 mb-3">
                <span className="bg-[#1a3a5a] text-[#4A90E2] text-xs font-semibold px-3 py-1.5 rounded-full">
                  {service.category}
                </span>
                <span className="bg-[#1a1a1a] text-[#4A90E2] text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {service.city}
                </span>
              </div>
              
              <h3 className="text-white text-lg font-semibold mb-2">{service.title}</h3>
              <p className="text-gray-400 text-sm mb-3 leading-relaxed">{service.description}</p>
              
              <div className="flex items-center justify-between pt-3 border-t border-[#333]">
                <span className="text-gray-500 text-sm">{service.userName}</span>
                <a 
                  href={`tel:${service.contactPhone}`}
                  className="flex items-center gap-2 text-[#4A90E2]"
                >
                  <Phone className="w-4 h-4" />
                  {service.contactPhone}
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Service Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setModalVisible(false)}>
          <div className="w-full bg-[#1a1a1a] rounded-t-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#333]">
              <h2 className="text-xl font-bold text-white">Yeni İlan Oluştur</h2>
              <button onClick={() => setModalVisible(false)}>
                <X className="w-7 h-7 text-white" />
              </button>
            </div>

            <div className="p-5">
              <label className="text-white font-medium mb-2 block">Başlık</label>
              <input
                placeholder="Hizmet başlığı"
                value={newService.title}
                onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                className="w-full bg-[#2a2a2a] text-white rounded-xl p-4 focus:outline-none mb-5"
                data-testid="service-title"
              />

              <label className="text-white font-medium mb-2 block">Kategori</label>
              <div className="flex flex-wrap gap-2 mb-5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewService({ ...newService, category: cat })}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      newService.category === cat 
                        ? 'bg-[#4A90E2] text-white font-semibold' 
                        : 'bg-[#2a2a2a] text-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <label className="text-white font-medium mb-2 block">Açıklama</label>
              <textarea
                placeholder="Hizmet detayları"
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                rows={6}
                className="w-full bg-[#2a2a2a] text-white rounded-xl p-4 focus:outline-none resize-none mb-5"
                data-testid="service-description"
              />

              <button
                onClick={createService}
                className="w-full bg-[#4A90E2] text-white rounded-xl py-4 font-semibold"
                data-testid="submit-service"
              >
                İlan Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
