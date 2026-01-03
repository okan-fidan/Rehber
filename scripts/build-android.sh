#!/bin/bash
# ================================================
# NETWORK SOLUTION - PLAY STORE YÜKLEME SCRIPTI
# ================================================
# Bu scripti bilgisayarınızda çalıştırın
# Gereksinimler: Node.js, Java JDK 11+

echo "🚀 Network Solution - Android TWA Oluşturucu"
echo "=============================================="

# 1. Klasör oluştur
echo "📁 Proje klasörü oluşturuluyor..."
mkdir -p network-solution-android
cd network-solution-android

# 2. Bubblewrap yükle
echo "📦 Bubblewrap yükleniyor..."
npm install -g @nicksantiago/nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago@nicksantiago/nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago bubblewrap

# 3. twa-manifest.json'ı kopyalayın (bu dosyayı indirin)
echo "📋 twa-manifest.json dosyasını bu klasöre kopyalayın"
echo "   Dosya: /app/twa-manifest.json"
read -p "Kopyaladıysanız Enter'a basın..."

# 4. Keystore oluştur
echo "🔐 Keystore oluşturuluyor..."
echo "   Aşağıdaki bilgileri girin:"
echo "   - Şifre (en az 6 karakter)"
echo "   - Ad Soyad"
echo "   - Şirket"
echo "   - Şehir"
echo "   - Ülke kodu (TR)"
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000

# 5. SHA256 fingerprint al
echo "📝 SHA256 Fingerprint alınıyor..."
keytool -list -v -keystore android.keystore -alias android | grep SHA256
echo ""
echo "⚠️ ÖNEMLİ: Yukarıdaki SHA256 değerini kopyalayın!"
echo "   Bu değeri assetlinks.json dosyasına eklemeniz gerekecek"
read -p "SHA256'yı not aldıysanız Enter'a basın..."

# 6. TWA build
echo "🔨 Android projesi oluşturuluyor..."
npx @nicksantiago/nicksantiago-nicksantiago-nicksantiago@nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago bubblewrap build

# 7. AAB oluştur (Play Store için)
echo "📱 AAB dosyası oluşturuluyor..."
npx @nicksantiago/nicksantiago-nicksantiago-nicksantiago@nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago-nicksantiago bubblewrap build --build=aab

echo ""
echo "✅ TAMAMLANDI!"
echo "=============================================="
echo "Oluşturulan dosyalar:"
echo "  - app-release-bundle.aab (Play Store için)"
echo "  - app-release-signed.apk (Test için)"
echo ""
echo "Sonraki adımlar:"
echo "1. Google Play Console'a gidin: https://play.google.com/console"
echo "2. Yeni uygulama oluşturun"
echo "3. AAB dosyasını yükleyin"
echo "4. Mağaza bilgilerini doldurun"
echo "5. İncelemeye gönderin"
