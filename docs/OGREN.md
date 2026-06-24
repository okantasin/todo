# LifeOS — Kullanılan Yöntemler ve Kavramlar (Öğrenme Rehberi)

Bu döküman, projede kullandığımız teknikleri **HTML biliyorsun, JavaScript/React öğreniyorsun**
varsayımıyla anlatır. Her başlık gerçek dosyalara bağlıdır; kodu açıp yanında okuman tavsiye edilir.

> 📚 **Daha derin anlatım için:** [OGREN-DETAY.md](OGREN-DETAY.md) — JS temelleri, render döngüsü,
> uçtan uca akış izleri, async/Promise, Prisma→SQL içyüzü ve sık yapılan hatalar.

İçindekiler:
1. [Genel mimari](#1-genel-mimari)
2. [HTML → JSX farkı](#2-html--jsx-farkı)
3. [Server vs Client bileşenler (`'use client'`)](#3-server-vs-client-bileşenler-use-client)
4. [React Hooks](#4-react-hooks)
5. [Controlled input (kontrollü form)](#5-controlled-input-kontrollü-form)
6. [Custom hook yazmak](#6-custom-hook-yazmak)
7. [Liste render: map / filter](#7-liste-render-map--filter)
8. [Olay yönetimi ve `stopPropagation`](#8-olay-yönetimi-ve-stoppropagation)
9. [Otomatik büyüyen textarea](#9-otomatik-büyüyen-textarea)
10. [Veri saklama: localStorage → dosya → Postgres](#10-veri-saklama-localstorage--dosya--postgres)
11. [API Route Handlers (GET/PUT)](#11-api-route-handlers-getput)
12. [debounce (gecikmeli kaydetme)](#12-debounce-gecikmeli-kaydetme)
13. [Prisma + PostgreSQL](#13-prisma--postgresql)
14. [TypeScript temel kavramları](#14-typescript-temel-kavramları)
15. [Git / PR akışı](#15-git--pr-akışı)

---

## 1. Genel mimari

Bu bir **Next.js (App Router)** uygulaması. Klasör yapısı = URL yapısı:

```
app/
  layout.tsx        → her sayfayı saran kabuk (sidebar + <html><body>)
  page.tsx          → "/" adresi
  tasks/page.tsx    → "/tasks"
  notes/[id]/page.tsx → "/notes/123" (dinamik segment)
  api/data/route.ts → "/api/data" (sayfa değil, veri uç noktası)
```

Kural basit: `app/` içindeki bir klasörde **`page.tsx`** varsa, o klasör bir sayfa olur.
**`route.ts`** varsa, o bir API (veri) ucu olur. **`layout.tsx`** alt sayfaları sarar.

---

## 2. HTML → JSX farkı

React'te HTML'i JavaScript'in içine **JSX** olarak yazarsın. Neredeyse aynıdır, birkaç fark:

| HTML | JSX | Neden |
|---|---|---|
| `class="x"` | `className="x"` | `class` JS'te ayrılmış kelime |
| `style="color:red"` | `style={{ color: 'red' }}` | style bir **obje** |
| `onclick="..."` | `onClick={fn}` | camelCase + fonksiyon |
| `<input>` | `<input />` | etiketler kapanmalı |

Örnek — `components/Sidebar.tsx`:
```tsx
<aside style={{ background: 'var(--surface)', width: '220px' }} className="flex flex-col">
```
`{{ ... }}`: dıştaki `{}` "JS başlıyor", içteki `{}` "bu bir obje" demek.

CSS değişkenleri (`var(--accent)`) klasik CSS; `app/globals.css`'te tanımlı:
```css
:root { --accent: #9a7b4f; }
```

---

## 3. Server vs Client bileşenler (`'use client'`)

Next.js'te bileşenler **varsayılan olarak sunucuda** çalışır (tarayıcıya sadece sonuç HTML'i gider).
Ama `useState`, `onClick`, `localStorage` gibi **tarayıcı/etkileşim** şeyleri istiyorsan,
dosyanın en üstüne `'use client'` yazman gerekir.

`app/tasks/page.tsx` ilk satır:
```tsx
'use client';
```
Bu yüzden orada butonlara tıklayabiliyor, state tutabiliyoruz.

Buna karşılık `app/page.tsx` sunucu bileşeni — sadece yönlendirme yapıyor:
```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/tasks");   // "/" açılınca "/tasks"e gönder
}
```

> 💡 İlk açılışta sayfanın takılmasının sebebi de buydu hatırlarsan: CSS derleme aşamasıydı,
> kod değil. (Uzak font `@import`'u kaldırınca düzeldi.)

---

## 4. React Hooks

"Hook" = `use` ile başlayan, bileşene **hafıza ve yan etki** kazandıran fonksiyonlar.

### `useState` — bileşenin hafızası
```tsx
const [showForm, setShowForm] = useState(false);
//     ↑ değer      ↑ değiştiren     ↑ başlangıç
```
`setShowForm(true)` çağırınca React bileşeni **yeniden çizer** ve yeni değeri gösterir.
`app/tasks/page.tsx`'te `filter`, `showForm`, `selectedId`, `form` hep böyle.

### `useEffect` — yan etki (dış dünyayla konuşma)
"Bu bileşen ekrana gelince / şu değer değişince şunu yap." `lib/storage.ts`:
```tsx
useEffect(() => {
  fetch('/api/data').then(r => r.json()).then(d => setDataState(d));
}, []);   // ← boş [] = "sadece ilk açılışta bir kez"
```
Sondaki dizi **bağımlılık listesi**: içindeki değer değişince effect tekrar çalışır.

### `useCallback` — fonksiyonu sabit tutmak
Her render'da fonksiyon yeniden yaratılmasın diye sarmalar. `lib/storage.ts`'teki
`persist`, `setData`, `updateData` bununla sarılı. (Performans + gereksiz tekrar engelleme.)

### `useRef` — render tetiklemeden bir şeye tutunmak
İki kullanımı var bu projede:
- Bir **DOM elemanına** erişmek (`useAutoGrow`'da textarea'ya).
- Render'lar arası **kalıcı bir kutu** (debounce zamanlayıcısı: `saveTimer`).

```tsx
const saveTimer = useRef(null);   // .current değişse bile render olmaz
```

---

## 5. Controlled input (kontrollü form)

HTML'de input kendi değerini tutar. React'te değeri **state tutar**, input sadece gösterir.
Buna "controlled component" denir. `app/tasks/page.tsx`:

```tsx
<input
  value={form.title}                                   // ekranda ne görünecek
  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}  // yazınca state'i güncelle
/>
```

Döngü şöyle: **kullanıcı yazar → onChange → state değişir → input yeni değeri gösterir.**
`{ ...f, title: ... }` kısmı "eski objeyi kopyala, sadece title'ı değiştir" demek (spread operatörü).

---

## 6. Custom hook yazmak

Tekrar eden hook mantığını kendi `useXxx` fonksiyonuna taşıyabilirsin. İki tane yazdık:

### `useAutoGrow` (`app/tasks/page.tsx`)
Bir textarea'yı içeriğine göre büyütür:
```tsx
function useAutoGrow(value: string) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';              // önce sıfırla
      el.style.height = el.scrollHeight + 'px';  // sonra içerik yüksekliğine ayarla
    }
  }, [value]);   // value her değişince çalışır
  return ref;    // bu ref'i bir <textarea>'ya bağlarsın
}
```

### `useAppData` (`lib/storage.ts`)
Tüm uygulama verisini yükler/kaydeder. Sayfalar veriyi hep bundan alır:
```tsx
const { data, updateData, loaded } = useAppData();
```
Bu sayede sayfalar verinin **nerede saklandığını bilmez** — localStorage'dan Postgres'e
geçerken sayfa kodlarına hiç dokunmadık, sadece bu hook'un içini değiştirdik. (Soyutlama!)

---

## 7. Liste render: map / filter

JavaScript dizilerinin iki temel metodu, her yerde kullandık.

**`.filter()`** — koşula uyanları seç (`app/tasks/page.tsx`):
```tsx
const todo = data.tasks.filter(t => t.status === 'todo').length;
```

**`.map()`** — her elemanı bir JSX'e çevir (liste çizmek için):
```tsx
{tasks.map(task => (
  <div key={task.id}>{task.title}</div>
))}
```
`key`: React'in her satırı ayırt etmesi için **zorunlu** ve benzersiz olmalı (bu yüzden `task.id`).

---

## 8. Olay yönetimi ve `stopPropagation`

Bir görev kartına tıklayınca detay açılıyor. Ama kartın içindeki **sil** butonuna tıklayınca
detay açılmasın, sadece silsin istiyoruz. Sorun: tıklama hem butona hem (üstündeki) karta gider
("event bubbling"). Çözüm:

```tsx
<div onClick={() => setSelectedId(task.id)}>     {/* kart: detayı aç */}
  <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}>  {/* sil: yukarı sıçramayı durdur */}
```
`e.stopPropagation()` = "bu tıklama yukarıdaki elemana gitmesin".

---

## 9. Otomatik büyüyen textarea

HTML `<textarea>` sabit yükseklikte + scroll'lu gelir. Biz "yazdıkça uzasın" istedik. Teknik:

1. CSS'te elle boyutlandırmayı ve scroll'u kapat: `resize: none; overflow: hidden;`
2. Her değişiklikte JS ile yüksekliği içeriğe ayarla (`useAutoGrow`):
   `height = 'auto'` (ölç) → `height = scrollHeight + 'px'` (uygula).

`scrollHeight` = elemanın içeriğinin gerçek (scroll dahil) yüksekliği. Buraya eşitleyince
scroll yerine eleman uzar.

---

## 10. Veri saklama: localStorage → dosya → Postgres

Bu projede veriyi **üç farklı yöntemle** sakladık; evrimi görmek öğretici:

| Aşama | Nerede | Artı | Eksi |
|---|---|---|---|
| 1. localStorage | Tarayıcıda | Sıfır altyapı | Tek tarayıcı, temizlenince gider |
| 2. JSON dosyası | Sunucu diskinde `data/lifeos.json` | Restart'a dayanır | Sorgulanamaz, ölçeklenmez |
| 3. **PostgreSQL** | Veritabanında | Sorgulanabilir (DBeaver), sağlam, yedeklenir | Postgres çalışmalı |

**Kritik nokta:** Üçünde de **arayüz (`useAppData`) aynı kaldı**. Sayfalar verinin nereden
geldiğini bilmiyor. İyi yazılım tasarımının özü budur — *bağımlılığı tek noktada gizlemek*.

`localStorage` örneği (artık kullanılmıyor ama `lib/storage.ts`'te `useLocalStorage` olarak duruyor):
```tsx
localStorage.setItem('lifeos-data', JSON.stringify(next));   // yaz
const raw = localStorage.getItem('lifeos-data');             // oku
JSON.parse(raw);                                             // metni objeye çevir
```
`JSON.stringify` = obje → metin, `JSON.parse` = metin → obje. (Hem localStorage hem dosya hem
ağ üzerinden veri taşırken hep bu ikili kullanılır.)

---

## 11. API Route Handlers (GET/PUT)

`app/api/data/route.ts` bir **sayfa değil**, bir veri ucu. İçinde HTTP metodları için
fonksiyonlar var. Bunlar **sunucuda** çalışır (tarayıcıda değil), bu yüzden veritabanına
güvenle erişebilir.

```tsx
export async function GET() {            // tarayıcı veri isteyince
  const tasks = await prisma.task.findMany();
  return NextResponse.json({ tasks, ... });   // JSON döndür
}

export async function PUT(req) {         // tarayıcı veri kaydedince
  const body = await req.json();         // gelen JSON'u oku
  // ... veritabanına yaz
  return NextResponse.json({ ok: true });
}
```

Tarayıcı tarafı bunlara `fetch` ile konuşur (`lib/storage.ts`):
```tsx
fetch('/api/data')                                  // GET (okuma)
fetch('/api/data', { method: 'PUT', body: ... })    // PUT (yazma)
```

- **`async / await`**: "bu iş zaman alır (ağ/disk), bitene kadar bekle ama tarayıcıyı dondurma."
- **HTTP metodları**: GET = oku, PUT/POST = yaz/güncelle, DELETE = sil. (Konvansiyon.)

---

## 12. debounce (gecikmeli kaydetme)

Sorun: her tuş vuruşunda veritabanına yazarsak (özellikle otomatik büyüyen textarea'larda)
saniyede onlarca istek gider. Çözüm **debounce**: "yazma dursun, son değişiklikten 400ms sonra
bir kez kaydet." `lib/storage.ts`:

```tsx
const persist = useCallback((next) => {
  if (saveTimer.current) clearTimeout(saveTimer.current);   // önceki bekleyen kaydı iptal et
  saveTimer.current = setTimeout(() => {
    fetch('/api/data', { method: 'PUT', body: JSON.stringify(next) });
  }, 400);   // 400ms sessizlik olursa kaydet
}, []);
```
`setTimeout` zamanlayıcı kurar, `clearTimeout` iptal eder. Her yeni harfte önceki zamanlayıcı
iptal olur; sadece sen durunca tek istek gider. (Arama kutuları, otomatik kayıt hep böyle yapılır.)

---

## 13. Prisma + PostgreSQL

**PostgreSQL** = ilişkisel veritabanı. **Prisma** = JS'ten veritabanına tip-güvenli konuşma aracı (ORM).

### Şema (`prisma/schema.prisma`)
Tabloları burada *tarif* ediyoruz:
```prisma
model Task {
  id    String  @id          // birincil anahtar
  title String                // zorunlu metin
  description String?         // ? = isteğe bağlı (null olabilir)
  tags  Json    @default("[]") // dizi/obje için jsonb kolon
  @@map("tasks")             // veritabanındaki tablo adı küçük harf
}
```
`prisma db push` komutu bu tarifi gerçek tablolara çevirir.

### Sorgular (`app/api/data/route.ts`)
```tsx
await prisma.task.findMany();              // SELECT * FROM tasks
await prisma.task.createMany({ data });    // toplu INSERT
await prisma.task.deleteMany();            // DELETE FROM tasks
```

### Transaction (işlem) — ya hep ya hiç
Kaydederken "önce her şeyi sil, sonra yeniden yaz" yapıyoruz. Ya yarıda kalırsa? `$transaction`
hepsini tek blokta çalıştırır; bir adım patlarsa **hepsi geri alınır**, veri bozulmaz:
```tsx
await prisma.$transaction([
  prisma.task.deleteMany(),
  prisma.task.createMany({ data: ... }),
  ...
]);
```

### jsonb kolon
Görevin alt listeleri (Q&A, etiketler) ayrı tablo yapmadan **jsonb** olarak saklanıyor.
Ana alanlar (başlık, durum) düzgün kolon → DBeaver'da sorgulanabilir; iç içe küçük listeler jsonb.

### Singleton (`lib/db.ts`)
Geliştirme modunda kod her değişince yeniden yüklenir; her seferinde yeni veritabanı bağlantısı
açılmasın diye **tek bir** Prisma örneği tutarız:
```tsx
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
```
`??` = "soldaki yoksa sağdakini kullan" (nullish coalescing).

---

## 14. TypeScript temel kavramları

Bu proje `.ts`/`.tsx` yani **TypeScript** — JavaScript + tip kontrolü. Hatayı sen değil
derleyici yakalar (`npx tsc --noEmit`).

`lib/types.ts` veri şekillerini tanımlar:
```ts
export interface Task {
  id: string;
  priority: Priority;     // başka bir tip
  description?: string;   // ? = olmayabilir
  tags: string[];         // metin dizisi
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';  // sadece bu 4 değer
```
- `interface` = bir objenin hangi alanları olmalı.
- `'a' | 'b'` (union) = "şunlardan biri" — yanlış değer yazarsan derleyici uyarır.
- `string[]` = metin dizisi; `Task[]` = görev dizisi.
- **Generic** (`<T>`): tip-bağımsız yardımcılar (`useLocalStorage<T>`) — "her tiple çalış".

---

## 15. Git / PR akışı

Kod değişikliklerini sakladığımız yöntem:

```bash
git add -A                  # değişiklikleri sahneye al
git commit -m "mesaj"       # bir kayıt noktası oluştur
git push                    # uzak sunucuya (GitHub) gönder
```
- **branch (dal):** `feat/lifeos-app` — ana koddan ayrı bir çalışma hattı.
- **PR (Pull Request):** dalı ana koda birleştirme talebi + inceleme noktası ([#1](https://github.com/okantasin/todo/pull/1)).
- **`.gitignore`:** repoya **girmemesi** gereken dosyalar (`.env` sırlar, `/data/`, `node_modules`).
  Şifre/bağlantı bilgisi asla commit edilmez; örnek için `.env.example` konur.

---

## Hızlı sözlük

| Terim | Tek cümle |
|---|---|
| **JSX** | JS içinde HTML yazma biçimi |
| **State** | Bileşenin değişebilen hafızası (`useState`) |
| **Hook** | `use` ile başlayan, bileşene yetenek katan fonksiyon |
| **Props** | Bir bileşene dışarıdan verilen parametreler |
| **Controlled input** | Değerini state'in tuttuğu form alanı |
| **Server/Client component** | Sunucuda mı tarayıcıda mı çalıştığı (`'use client'`) |
| **Route Handler** | `app/.../route.ts` — sayfa değil veri ucu |
| **fetch** | Tarayıcıdan sunucuya HTTP isteği |
| **async/await** | Zaman alan işi bekleme şekli |
| **debounce** | Sık tetiklenen işi geciktirip tek seferde yapma |
| **ORM (Prisma)** | Koddan veritabanına tip-güvenli erişim |
| **Transaction** | Ya hep ya hiç çalışan veritabanı işlemi |
| **jsonb** | Postgres'te JSON tutan kolon tipi |
| **TypeScript** | Tip kontrollü JavaScript |
```
```

> Öğrenme sırası önerisi: **2 → 3 → 5 → 4 → 6 → 7** (arayüz tarafı), sonra **11 → 10 → 12 → 13**
> (veri tarafı). Her başlıkta adı geçen dosyayı açıp ilgili satırları kendi gözünle takip et.
