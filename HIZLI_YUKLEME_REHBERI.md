# 📱 Network Solution - Hızlı Yükleme Rehberi

## 🎯 Bu Dosyada Ne Var?
Sadece yapmanız gereken adımlar, kopyala-yapıştır komutları.

---

## BÖLÜM 1: HAZIRLIK (5 dakika)

### 1.1 Node.js Yükleyin
- https://nodejs.org adresinden LTS sürümü indirin
- Kurulumu tamamlayın

### 1.2 Java JDK Yükleyin  
- https://adoptium.net adresinden JDK 11 veya 17 indirin
- Kurulumu tamamlayın

### 1.3 Kontrol Edin
```bash
node --version
java --version
```

---

## BÖLÜM 2: PLAY STORE (Android) - 30 dakika

### Adım 1: Google Play Console Hesabı
1. https://play.google.com/console adresine gidin
2. Google hesabınızla giriş yapın
3. "Başlayın" butonuna tıklayın
4. **$25** ödeme yapın (tek seferlik)
5. Bilgilerinizi doldurun
6. Hesap onayını bekleyin (1-48 saat)

### Adım 2: Bilgisayarınızda Terminal Açın

**Windows:** PowerShell veya CMD açın
**Mac:** Terminal açın
**Linux:** Terminal açın

### Adım 3: Komutları Çalıştırın

```bash
# 1. Klasör oluştur
mkdir network-solution-android
cd network-solution-android

# 2. Bubblewrap yükle
npm install -g @nicksantiago/nicksantiago-nicksantiago-nicksantiago@nicksantiago/nicksantiago-nicksantiago-nicksantiago-nicksantiago bubblewrap

# 3. Proje başlat (YOUR_DOMAIN yerine sitenizin adresini yazın)
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.json
```

**Sorulara Cevaplar:**
- Domain: `YOUR_DOMAIN` (sitenizin adresi)
- Package name: `com.networksolution.app`
- App name: `Network Solution`
- Launcher name: `NetSolution`
- Theme color: `#4A90E2`
- Background color: `#0e1621`
- Start URL: `/`
- Enable notifications: `Y`

### Adım 4: Keystore Oluşturun

```bash
# Keystore oluştur (şifre soracak, unutmayın!)
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000
```

**ÖNEMLİ:** Şifreyi ve keystore dosyasını güvenli yerde saklayın!

### Adım 5: SHA256 Alın

```bash
keytool -list -v -keystore android.keystore -alias android
```

Çıktıdan `SHA256:` ile başlayan satırı kopyalayın.

### Adım 6: assetlinks.json Güncelleyin

Sitenizde `/.well-known/assetlinks.json` dosyasını açın ve SHA256 değerini ekleyin:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.networksolution.app",
    "sha256_cert_fingerprints": [
      "BURAYA_SHA256_YAPIŞTIRIN"
    ]
  }
}]
```

### Adım 7: AAB Oluşturun

```bash
# Build al
bubblewrap build

# AAB oluştur (Play Store için)
bubblewrap build --build=aab
```

### Adım 8: Play Console'a Yükleyin

1. https://play.google.com/console açın
2. "Uygulama oluştur" tıklayın
3. Bilgileri doldurun:
   - Ad: `Network Solution`
   - Dil: `Türkçe`
   - Ücretsiz
   - Kategori: `İş`
4. "Oluştur" tıklayın

### Adım 9: AAB Yükleyin

1. Sol menüden "Production" seçin
2. "Sürüm oluştur" tıklayın
3. `app-release-bundle.aab` dosyasını sürükleyip bırakın
4. Sürüm notları yazın: `İlk sürüm`
5. "İncele" tıklayın
6. "Üretime başla" tıklayın

### Adım 10: Mağaza Bilgilerini Doldurun

Sol menüden sırayla:
1. **Ana mağaza girişi**
   - Kısa açıklama (80 karakter)
   - Tam açıklama
   
2. **Grafikler**
   - Uygulama simgesi (512x512)
   - Öne çıkan grafik (1024x500)
   - Ekran görüntüleri (min 2)

3. **İçerik derecelendirmesi**
   - Anketi doldurun

4. **Gizlilik politikası**
   - URL: `https://YOUR_DOMAIN/privacy-policy`

5. İncelemeye gönderin

---

## BÖLÜM 3: APP STORE (iOS) - 45 dakika

### Adım 1: Apple Developer Hesabı
1. https://developer.apple.com adresine gidin
2. "Account" → "Join" seçin
3. Apple ID ile giriş yapın
4. **$99/yıl** ödeme yapın
5. Onay bekleyin (1-2 gün)

### Adım 2: PWABuilder ile Paket Oluşturun

1. https://pwabuilder.com adresine gidin
2. URL girin: `https://YOUR_DOMAIN`
3. "Start" tıklayın
4. "Package for stores" seçin
5. "iOS" seçin
6. "Generate" tıklayın
7. ZIP dosyasını indirin

### Adım 3: Xcode ile Açın (Mac Gerekli)

1. ZIP'i açın
2. `.xcodeproj` dosyasını çift tıklayın
3. Xcode açılacak

### Adım 4: Signing Ayarları

1. Sol panelden projeyi seçin
2. "Signing & Capabilities" sekmesi
3. Team: Apple Developer hesabınızı seçin
4. Bundle Identifier: `com.networksolution.app`

### Adım 5: Archive Oluşturun

1. Product → Archive
2. Bekleyin (5-10 dakika)
3. Organizer açılacak

### Adım 6: App Store'a Yükleyin

1. "Distribute App" tıklayın
2. "App Store Connect" seçin
3. "Upload" seçin
4. Bekleyin

### Adım 7: App Store Connect

1. https://appstoreconnect.apple.com açın
2. "My Apps" → "+" → "New App"
3. Bilgileri doldurun
4. Ekran görüntüleri yükleyin
5. Build seçin
6. İncelemeye gönderin

---

## ✅ KONTROL LİSTESİ

### Play Store
- [ ] Google Play Console hesabı ($25)
- [ ] Node.js ve Java yüklendi
- [ ] Bubblewrap yüklendi
- [ ] Keystore oluşturuldu
- [ ] SHA256 assetlinks.json'a eklendi
- [ ] AAB dosyası oluşturuldu
- [ ] Play Console'a yüklendi
- [ ] Mağaza bilgileri dolduruldu
- [ ] İncelemeye gönderildi

### App Store
- [ ] Apple Developer hesabı ($99/yıl)
- [ ] Mac bilgisayar erişimi var
- [ ] PWABuilder paketi indirildi
- [ ] Xcode'da build alındı
- [ ] App Store Connect'e yüklendi
- [ ] Bilgiler dolduruldu
- [ ] İncelemeye gönderildi

---

## 🆘 SORUN MU VAR?

### Bubblewrap yüklenmiyor
```bash
npm cache clean --force
npm install -g @nicksantiago/nicksantiago-nicksantiago-nicksantiago@nicksantiago/nicksantiago-nicksantiago-nicksantiago-nicksantiago bubblewrap
```

### Keystore şifresi hatası
Yeni keystore oluşturun, eskisini silin.

### TWA doğrulaması başarısız
- assetlinks.json'ın erişilebilir olduğundan emin olun
- URL: `https://YOUR_DOMAIN/.well-known/assetlinks.json`

### App Store reddi
- Uygulamanın yeterli içerik sunduğundan emin olun
- Native özellikler ekleyin (push notification gibi)

---

**Başarılar! 🚀**
