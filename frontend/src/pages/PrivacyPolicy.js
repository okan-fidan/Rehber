import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0e1621] pb-20">
      <div className="bg-[#17212b] border-b border-gray-800 p-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Geri</span>
        </button>
        <h1 className="text-2xl font-bold text-white">Gizlilik Politikası</h1>
      </div>

      <div className="p-4 text-gray-300 space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Giriş</h2>
          <p>
            Network Solution ("biz", "bizim" veya "uygulama") olarak gizliliğinize saygı duyuyoruz. 
            Bu Gizlilik Politikası, uygulamamızı kullandığınızda kişisel bilgilerinizi nasıl 
            topladığımızı, kullandığımızı ve koruduğumuzu açıklar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Topladığımız Bilgiler</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Hesap Bilgileri:</strong> Ad, soyad, e-posta adresi, telefon numarası, şehir</li>
            <li><strong>Profil Bilgileri:</strong> Profil fotoğrafı, meslek, özgeçmiş</li>
            <li><strong>İletişim Verileri:</strong> Gönderdiğiniz mesajlar ve paylaşımlar</li>
            <li><strong>Cihaz Bilgileri:</strong> IP adresi, tarayıcı türü, cihaz bilgileri</li>
            <li><strong>Kullanım Verileri:</strong> Uygulama içi aktiviteleriniz</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Bilgilerin Kullanımı</h2>
          <p>Topladığımız bilgileri şu amaçlarla kullanırız:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Hesabınızı oluşturmak ve yönetmek</li>
            <li>Uygulama özelliklerini sunmak</li>
            <li>Diğer kullanıcılarla iletişim kurmanızı sağlamak</li>
            <li>Bildirimleri göndermek</li>
            <li>Uygulamamızı geliştirmek</li>
            <li>Güvenliği sağlamak</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Bilgi Paylaşımı</h2>
          <p>
            Kişisel bilgilerinizi üçüncü taraflarla satmıyoruz. Bilgilerinizi yalnızca şu 
            durumlarda paylaşabiliriz:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Yasal zorunluluklar gereği</li>
            <li>Hizmet sağlayıcılarımızla (örn: hosting, analitik)</li>
            <li>Sizin açık onayınızla</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Veri Güvenliği</h2>
          <p>
            Verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>SSL/TLS şifreleme</li>
            <li>Güvenli veri depolama</li>
            <li>Erişim kontrolü</li>
            <li>Düzenli güvenlik denetimleri</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Çerezler</h2>
          <p>
            Uygulamamız, deneyiminizi iyileştirmek için çerezler ve benzer teknolojiler kullanır. 
            Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Haklarınız</h2>
          <p>KVKK kapsamında şu haklara sahipsiniz:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Verilerinize erişim hakkı</li>
            <li>Verilerinizin düzeltilmesini isteme hakkı</li>
            <li>Verilerinizin silinmesini isteme hakkı</li>
            <li>Veri işlemeye itiraz etme hakkı</li>
            <li>Veri taşınabilirliği hakkı</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Çocukların Gizliliği</h2>
          <p>
            Uygulamamız 18 yaşın altındaki kişilere yönelik değildir. Bilerek 18 yaşından 
            küçük kişilerden bilgi toplamıyoruz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">9. Değişiklikler</h2>
          <p>
            Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikleri 
            uygulama içi bildirimlerle duyuracağız.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">10. İletişim</h2>
          <p>
            Gizlilik ile ilgili sorularınız için bizimle iletişime geçebilirsiniz:
          </p>
          <p className="mt-2">
            <strong>E-posta:</strong> destek@networksolution.com
          </p>
        </section>

        <div className="text-sm text-gray-500 mt-8 pt-4 border-t border-gray-700">
          Son güncelleme: Ocak 2026
        </div>
      </div>
    </div>
  );
}
