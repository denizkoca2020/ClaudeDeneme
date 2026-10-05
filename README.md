# 🎈 Balon Patlatma

7 yaşındaki oğlumla birlikte yaptığımız, iPad'de oynanan küçük bir oyun.

## Nasıl oynanır?
- ▶ düğmesine bas.
- Yukarı uçan balonlara dokun ve patlat! Her balon **1 ⭐** kazandırır.
- **Altın yıldızlı balonlar** 3 ⭐ değerinde.
- Her 10 ⭐'da seviye atlanır 🎉: balonlar biraz hızlanır.
- Kaybetmek yok, kaçan balonlar sorun değil 🙂
- 🏠 ana ekrana döner, 🔊 sesi açar ya da kapatır. 🏆 en yüksek skoru gösterir.

## iPad'e kurulum
1. Oyunu GitHub Pages'te yayınla: GitHub'da depo → **Settings → Pages** → "Deploy from a branch" → dalı ve `/ (root)` klasörünü seç → **Save**.
   (Not: Ücretsiz hesapta Pages için deponun **public** olması gerekir.)
2. Birkaç dakika sonra verilen adresi (ör. `https://denizkoca2020.github.io/ClaudeDeneme/`) iPad'de **Safari** ile aç.
3. Paylaş düğmesi ⬆️ → **Ana Ekrana Ekle**. Artık oyun kendi simgesiyle tam ekran açılır ve internet olmadan da çalışır.

## Bilgisayarda deneme
```bash
python3 -m http.server 8000
# sonra tarayıcıda http://localhost:8000
```

## Birlikte değiştirebileceğimiz yerler
`game.js` dosyasının en üstündeki ayarlar:
- `COLORS`: balon renkleri
- `STARS_PER_LEVEL`: kaç yıldızda seviye atlanır
- `GOLDEN_CHANCE`: altın balon ne sıklıkla çıkar
- `MAX_BALLOONS`: ekranda en fazla kaç balon olur

> Oyunu değiştirdikten sonra `sw.js` içindeki `VERSION` değerini artırın (ör. `balon-v2`). Böylece iPad yeni sürümü indirir.

## Dosyalar
| Dosya | Ne işe yarar |
|-------|--------------|
| `index.html` | Oyun sayfası |
| `style.css` | Görünüm (düğmeler, yazılar) |
| `game.js` | Oyun mantığı, çizim ve sesler |
| `manifest.json`, `sw.js` | "Ana Ekrana Ekle" ve çevrimdışı çalışma |
| `icons/` | Uygulama simgeleri |
