import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Rocket, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect when user and profile are loaded
  useEffect(() => {
    if (!authLoading && user) {
      if (userProfile && userProfile.firstName) {
        navigate('/my-communities', { replace: true });
      } else {
        navigate('/register', { replace: true });
      }
    }
  }, [user, userProfile, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation will be handled by useEffect after profile is loaded
    } catch (error) {
      let errorMessage = 'Giriş başarısız';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'E-posta veya şifre hatalı';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Ağ bağlantı hatası. İnternet bağlantınızı kontrol edin';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1621] flex items-center justify-center p-6" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4A90E2] rounded-full mb-4">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Network Solution</h1>
          <p className="text-gray-400 mt-2">Girişimciler İçin Platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              data-testid="login-email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#17212b] text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              data-testid="login-password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-xl p-3" data-testid="login-error">
              <p className="text-red-500 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A90E2] text-white rounded-xl py-4 font-semibold hover:bg-[#3a7bc8] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            data-testid="login-submit"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>

          <Link 
            to="/register" 
            className="block text-center text-[#4A90E2] hover:underline mt-6"
            data-testid="goto-register"
          >
            Hesabınız yok mu? Kayıt olun
          </Link>
        </form>
      </div>
    </div>
  );
}
