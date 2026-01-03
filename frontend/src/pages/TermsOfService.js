import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
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
        <h1 className="text-2xl font-bold text-white">Kullanım Şartları</h1>
      </div>

      <div className="p-4 text-gray-300 space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Kabul</h2>
          <p>
            Network Solution uygulamasını kullanarak bu Kullanım Şartlarını kabul etmiş 
            sayılırsınız. Bu şartları kabul etmiyorsanız, uygulamayı kullanmayınız.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Hizmet Tanımı</h2>
          <p>
            Network Solution, girişimciler ve profesyoneller için sosyal ağ platformudur. 
            Kullanıcılar topluluklar oluşturabilir, mesajlaşabilir ve iş birlikleri kurabilir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Hesap Oluşturma</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>18 yaşından büyük olmalısınız</li>
            <li>Doğru ve güncel bilgiler vermelisiniz</li>
            <li>Hesap güvenliğinizden siz sorumlusunuz</li>
            <li>Şifrenizi kimseyle paylaşmayın</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Kullanım Kuralları</h2>
          <p>Aşağıdaki davranışlar yasaktır:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Yasa dışı içerik paylaşmak</li>
            <li>Spam veya zararlı içerik göndermek</li>
            <li>Başkalarını taciz etmek veya tehdit etmek</li>
            <li>Sahte hesap oluşturmak</li>
            <li>Fikri mülkiyet haklarını ihlal etmek</li>
            <li>Sistemi kötüye kullanmak</li>
            <li>Kişisel bilgileri izinsiz paylaşmak</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. İçerik</h2>
          <p>
            Paylaştığınız içeriklerden siz sorumlusunuz. İçeriklerinizin telif hakkı size aittir, 
            ancak platformumuzda paylaşarak bize sınırlı kullanım hakkı vermiş olursunuz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Gizlilik</h2>
          <p>
            Kişisel bilgilerinizin işlenmesi hakkında detaylı bilgi için Gizlilik Politikamızı 
            inceleyiniz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Hesap Askıya Alma</h2>
          <p>
            Kullanım şartlarını ihlal eden hesapları uyarı vermeksizin askıya alma veya 
            kapatma hakkımızı saklı tutarız.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Sorumluluk Reddi</h2>
          <p>
            Uygulama "olduğu gibi" sunulmaktadır. Hizmetin kesintisiz veya hatasız olacağını 
            garanti etmiyoruz. Kullanıcılar arası etkileşimlerden sorumlu değiliz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">9. Değişiklikler</h2>
          <p>
            Bu şartları önceden haber vermeksizin değiştirme hakkımızı saklı tutarız. 
            Önemli değişiklikler uygulama içinde duyurulacaktır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">10. Uygulanacak Hukuk</h2>
          <p>
            Bu şartlar Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklar İstanbul 
            mahkemelerinde çözümlenecektir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">11. İletişim</h2>
          <p>
            Sorularınız için: <strong>destek@networksolution.com</strong>
          </p>
        </section>

        <div className="text-sm text-gray-500 mt-8 pt-4 border-t border-gray-700">
          Son güncelleme: Ocak 2026
        </div>
      </div>
    </div>
  );
}
