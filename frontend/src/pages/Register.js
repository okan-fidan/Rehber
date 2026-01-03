import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TURKISH_CITIES } from '../lib/cities';
import { UserPlus, Mail, Lock, User, Phone, MapPin, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(TURKISH_CITIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp, user, setUserProfile } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password || !firstName || !lastName || !city) {
      setError('Email, isim, soyisim ve şehir alanları zorunludur');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      let currentUser = user;
      
      if (!currentUser) {
        await signUp(email, password);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const { auth } = await import('../lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`${BACKEND_URL}/api/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          phone: phone || undefined,
          city
        })
      });

      if (!response.ok) {
        throw new Error('Kayıt başarısız');
      }

      const userProfile = await response.json();
      setUserProfile(userProfile);
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      
      alert('Kayıt tamamlandı!');
      navigate('/groups');
    } catch (error) {
      const errorMessage = error.message || 'Kayıt başarısız';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1621] flex items-center justify-center p-6" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#4A90E2] rounded-full mb-4">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Kayıt Ol</h1>
          <p className="text-gray-400 mt-1 text-sm">Network Solution'a katılın</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <div className="relative">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="İsim *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              data-testid="register-firstname"
            />
          </div>

          <div className="relative">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Soyisim *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              data-testid="register-lastname"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              placeholder="E-posta *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              data-testid="register-email"
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="tel"
              placeholder="Telefon (İsteğe Bağlı)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              data-testid="register-phone"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              placeholder="Şifre (min 6 karakter) *"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              data-testid="register-password"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] appearance-none cursor-pointer"
              data-testid="register-city"
            >
              {TURKISH_CITIES.map((cityName) => (
                <option key={cityName} value={cityName}>{cityName}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-xl p-3" data-testid="register-error">
              <p className="text-red-500 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A90E2] text-white rounded-xl py-4 font-semibold hover:bg-[#3a7bc8] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
            data-testid="register-submit"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Kayıt yapılıyor...
              </>
            ) : (
              'Kayıt Ol'
            )}
          </button>

          <Link 
            to="/login" 
            className="block text-center text-[#4A90E2] hover:underline mt-4"
            data-testid="goto-login"
          >
            Zaten hesabınız var mı? Giriş yapın
          </Link>
        </form>
      </div>
    </div>
  );
}
