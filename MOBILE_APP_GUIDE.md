# 📱 Network Solution - Mobil Uygulama Yükleme Rehberi

## 🎯 Genel Bakış

Bu rehber, Network Solution PWA uygulamasını Play Store ve App Store'a yüklemeniz için gereken adımları içerir.

---

## 📋 Ön Gereksinimler

### Genel
- [ ] Uygulama logosu (512x512 PNG, şeffaf arka plan)
- [ ] Uygulama ekran görüntüleri (en az 2 adet)
- [ ] Gizlilik politikası URL'i
- [ ] Kullanım şartları URL'i

### Play Store için
- [ ] Google Play Developer hesabı ($25 tek seferlik ücret)
- [ ] Keystore dosyası (APK imzalama için)

### App Store için
- [ ] Apple Developer hesabı ($99/yıl)
- [ ] Mac bilgisayar (Xcode için)
- [ ] Apple Developer sertifikaları

---

## 🤖 PLAY STORE YÜKLEME (Android)

### Adım 1: Bubblewrap ile TWA Oluşturma

```bash
# Bubblewrap yükle
npm install -g @anthropic/anthropic-ai-sdk @anthropic/anthropic-ai-sdk@anthropic/anthropic-ai-sdk

# Proje oluştur
mkdir network-solution-android
cd network-solution-android
npx @nicksantiago/nicksantiago@nicksantiago@nicksantiago/nicksantiago bubblewrap init --manifest https://YOUR_DOMAIN/manifest.json
```

### Adım 2: TWA Yapılandırması

`twa-manifest.json` dosyasını düzenleyin:
```json
{
  "packageId": "com.networksolution.app",
  "host": "your-domain.com",
  "name": "Network Solution",
  "launcherName": "NetSolution",
  "display": "standalone",
  "themeColor": "#4A90E2",
  "navigationColor": "#0e1621",
  "backgroundColor": "#0e1621",
  "enableNotifications": true,
  "startUrl": "/",
  "iconUrl": "https://your-domain.com/icons/icon-512x512.png",
  "splashScreenFadeOutDuration": 300,
  "signingKey": {
    "path": "./android.keystore",
    "alias": "android"
  },
  "appVersionCode": 1,
  "appVersionName": "1.0.0",
  "shortcuts": [],
  "generatorApp": "bubblewrap-cli"
}
```

### Adım 3: APK/AAB Oluşturma

```bash
# Keystore oluştur (ilk seferde)
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000

# APK oluştur
npx @nicksantiago/nicksantiago@nicksantiago@nicksantiago/nicksantiago bubblewrap build

# AAB (App Bundle) oluştur (Play Store için önerilen)
npx @nicksantiago/nicksantiago@nicksantiago@nicksantiago/nicksantiago bubblewrap build --build=aab
```

### Adım 4: Digital Asset Links Doğrulama

1. Keystore'dan SHA256 fingerprint al:
```bash
keytool -list -v -keystore android.keystore -alias android
```

2. `.well-known/assetlinks.json` dosyasını güncelle:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.networksolution.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

### Adım 5: Play Console'a Yükleme

1. [Google Play Console](https://play.google.com/console) açın
2. "Uygulama oluştur" seçin
3. Uygulama bilgilerini doldurun:
   - Uygulama adı: Network Solution
   - Varsayılan dil: Türkçe
   - Uygulama türü: Uygulama
   - Kategori: İş
4. AAB dosyasını yükleyin
5. Mağaza girişini tamamlayın
6. İncelemeye gönderin

---

## 🍎 APP STORE YÜKLEME (iOS)

### Yöntem 1: PWABuilder ile (Önerilen)

1. [PWABuilder.com](https://pwabuilder.com) adresine gidin
2. Web sitenizin URL'ini girin
3. "Package for stores" seçin
4. iOS paketini indirin
5. Xcode ile açın ve App Store'a yükleyin

### Yöntem 2: Manuel Xcode Projesi

```bash
# PWABuilder CLI yükle
npm install -g @nicksantiago/nicksantiago@nicksantiago@nicksantiago/nicksantiago-pwabuilder-cli

# iOS projesi oluştur
pwabuilder package -p ios -m https://YOUR_DOMAIN/manifest.json
```

### App Store Connect Yükleme

1. [App Store Connect](https://appstoreconnect.apple.com) açın
2. "My Apps" → "+" → "New App"
3. Bilgileri doldurun:
   - Platform: iOS
   - Name: Network Solution
   - Primary Language: Turkish
   - Bundle ID: com.networksolution.app
   - SKU: networksolution001
4. Xcode'dan Archive → Upload to App Store
5. İncelemeye gönderin

---

## 🔔 PUSH NOTIFICATION KURULUMU

### Firebase Cloud Messaging (FCM)

1. [Firebase Console](https://console.firebase.google.com) açın
2. Projenizi seçin → Cloud Messaging
3. Web push sertifikası oluşturun
4. VAPID key'i kopyalayın
5. `pushNotification.js` dosyasında VAPID_KEY'i güncelleyin

### Backend FCM Entegrasyonu

```python
# server.py'ye ekleyin
from firebase_admin import messaging

async def send_push_notification(token: str, title: str, body: str, data: dict = None):
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        token=token,
    )
    response = messaging.send(message)
    return response
```

---

## 📦 UYGULAMA İKONLARI

Gerekli ikon boyutları:

### Android
- 48x48, 72x72, 96x96, 144x144, 192x192, 512x512

### iOS
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

### İkon Oluşturma Araçları
- [RealFaviconGenerator](https://realfavicongenerator.net)
- [PWA Asset Generator](https://github.com/nicksantiago/nicksantiago-nicksantiago-nicksantiago-nicksantiago/nicksantiago/nicksantiago-nicksantiago-nicksantiago-pwa-asset-generator)
- [App Icon Generator](https://appicon.co)

---

## ✅ KONTROL LİSTESİ

### PWA Gereksinimleri
- [x] manifest.json
- [x] Service Worker
- [x] HTTPS (production)
- [x] Responsive tasarım
- [x] Offline desteği
- [ ] App ikonları (tüm boyutlar)
- [ ] Splash screen görselleri

### Play Store Gereksinimleri
- [ ] assetlinks.json doğrulaması
- [ ] Privacy Policy sayfası
- [ ] App Bundle (AAB) dosyası
- [ ] Ekran görüntüleri (min 2)
- [ ] Feature graphic (1024x500)
- [ ] Hi-res icon (512x512)

### App Store Gereksinimleri
- [ ] apple-app-site-association
- [ ] Privacy Policy sayfası
- [ ] App Store Connect hesabı
- [ ] Xcode Archive
- [ ] Ekran görüntüleri (her cihaz için)
- [ ] App Preview video (opsiyonel)

---

## 🔧 SORUN GİDERME

### PWA yüklenmiyor
1. HTTPS aktif mi kontrol edin
2. manifest.json geçerli mi kontrol edin
3. Service Worker kayıtlı mı kontrol edin
4. Chrome DevTools → Application → Manifest

### Push bildirimleri çalışmıyor
1. Notification izni verildi mi?
2. Service Worker aktif mi?
3. FCM token alındı mı?
4. Backend'e token gönderildi mi?

### TWA doğrulaması başarısız
1. assetlinks.json erişilebilir mi?
2. SHA256 fingerprint doğru mu?
3. Package name eşleşiyor mu?

---

## 📞 DESTEK

Sorularınız için:
- GitHub Issues
- Email: destek@networksolution.com

---

**Son Güncelleme:** Ocak 2026
