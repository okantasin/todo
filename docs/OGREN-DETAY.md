# LifeOS — Ayrıntılı Teknik Derinleşme

Bu döküman [OGREN.md](OGREN.md)'in **derin** versiyonudur. Genel rehberi okuduktan sonra buraya gel.
Burada her şeyi *satır satır*, *neden öyle* ve *çalışırken adım adım ne oluyor* düzeyinde açıyoruz.

İçindekiler:
- [A. JavaScript temelleri (kodu okumak için şart)](#a-javascript-temelleri)
- [B. React render döngüsü — gerçekte ne oluyor](#b-react-render-döngüsü)
- [C. Immutability (değişmezlik) ve neden `...spread`](#c-immutability-ve-neden-spread)
- [D. Closure ve "stale state" tuzağı](#d-closure-ve-stale-state-tuzağı)
- [E. UÇTAN UCA: bir harfe basınca ne oluyor](#e-uçtan-uca-bir-harfe-basınca-ne-oluyor)
- [F. useEffect derinlemesine (bağımlılık, cleanup, race)](#f-useeffect-derinlemesine)
- [G. async/await ve Promise mekaniği](#g-asyncawait-ve-promise-mekaniği)
- [H. HTTP ve fetch katmanı](#h-http-ve-fetch-katmanı)
- [I. Prisma → SQL → Postgres içeride ne yapıyor](#i-prisma--sql--postgres)
- [J. TypeScript'i derleyici gözüyle okumak](#j-typescripti-derleyici-gözüyle-okumak)
- [K. Sık yapılan hatalar ve nedenleri](#k-sık-yapılan-hatalar)

---

## A. JavaScript temelleri

Kodu okuyabilmek için önce bu yapı taşları. Hepsi projede geçiyor.

### A.1 Değişkenler: `const` / `let`
```js
const x = 5;   // yeniden ATANAMAZ (referans sabit)
let y = 5;     // yeniden atanabilir
```
`const` bir objeyse, objenin **içi** değişebilir ama değişkene **başka obje** atayamazsın:
```js
const f = { title: 'a' };
f.title = 'b';      // ✅ olur (içerik)
f = { title: 'c' }; // ❌ olmaz (yeniden atama)
```
Bu yüzden React'te `const [state, setState] = useState()` — `state`'i asla elle değiştirmeyiz,
`setState` ile **yeni** değer veririz.

### A.2 Fonksiyonlar ve arrow (ok) fonksiyon
Üç yazım da fonksiyondur:
```js
function topla(a, b) { return a + b; }      // klasik
const topla = (a, b) => { return a + b; };  // arrow
const topla = (a, b) => a + b;              // arrow, kısa (otomatik return)
```
JSX'te sürekli görürsün:
```tsx
onClick={() => setShowForm(true)}
//       ↑ parametresiz arrow: "tıklanınca şunu çalıştır"
```
Neden `onClick={setShowForm(true)}` değil? Çünkü o, fonksiyonu **render anında çağırır**.
Biz fonksiyonun kendisini veriyoruz ki React **tıklanınca** çağırsın. `() =>` ile sarmak bunu sağlar.

### A.3 Obje ve dizi
```js
const task = { id: '1', title: 'X', tags: ['a', 'b'] };
task.title       // 'X'  (nokta ile erişim)
task['title']    // 'X'  (köşeli parantez — değişken anahtar için)
task.tags.length // 2
```

### A.4 Destructuring (parçalama)
Objeden/diziden değerleri tek satırda çıkarmak:
```tsx
const { data, updateData, loaded } = useAppData();
// = const data = useAppData().data; const updateData = useAppData().updateData; ...

const [value, setValue] = useState(false);
// dizi parçalama: 0. eleman value, 1. eleman setValue
```
`useState` **dizi** döndürür (o yüzden `[]`), `useAppData` **obje** döndürür (o yüzden `{}`).

### A.5 Spread `...` (yayma)
"Var olanı kopyala, üstüne ekle/değiştir":
```js
const a = { id: 1, title: 'X' };
const b = { ...a, title: 'Y' };   // { id: 1, title: 'Y' } — id kopyalandı, title değişti
const liste2 = [yeni, ...liste];   // yeni elemanı başa koyup gerisini kopyala
```
React'te durum güncellemenin **temel aracı** budur (sebebi: C bölümü).

### A.6 Üçlü operatör (ternary) ve `&&`
```tsx
{loaded ? <Icerik/> : <div>Yükleniyor...</div>}   // koşul ? doğruysa : yanlışsa
{filled > 0 && <span>{filled} bölüm</span>}        // sadece doğruysa göster
```
JSX içinde `if` yazamazsın; bunun yerine bu ikisini kullanırsın.

### A.7 `??` ve `?.`
```js
task.description ?? ''     // description null/undefined ise '' kullan
project?.title             // project varsa .title, yoksa undefined (patlamaz)
```
Kodda bolca var çünkü bir alan **olmayabilir** (opsiyonel).

---

## B. React render döngüsü

En kritik kavram. "Render" = React'in bileşen fonksiyonunu **çağırıp** dönen JSX'e bakması.

### Temel döngü
```
1. Bileşen fonksiyonu çalışır → JSX üretir
2. React bu JSX'i ekrandaki ile karşılaştırır (diff)
3. Sadece DEĞİŞEN DOM parçalarını günceller
4. Bir setState çağrılırsa → 1'e dön (yeniden render)
```

### Önemli: bileşen fonksiyonu **tekrar tekrar** çalışır
`TasksPage()` fonksiyonu her render'da **baştan** çalışır. İçindeki `const tasks = ...filter(...)`
satırı her seferinde yeniden hesaplanır. Bu normaldir.

Peki `useState(false)` her render'da `false`'a mı dönüyor? **Hayır.** React `useState`'in değerini
fonksiyonun *dışında* saklar; ilk render'da `false` verir, sonraki render'larda **son değeri** verir.
Hook'lar bu yüzden özeldir.

### setState **hemen** değiştirmez
```tsx
setShowForm(true);
console.log(showForm);  // hâlâ ESKİ değer! (false)
```
`setState` "bir sonraki render'da yeni değer olsun" diye **planlar**, anında değiştirmez.
Yeni değeri ancak bir sonraki render'da `showForm` olarak görürsün. (Buna "asenkron state" denir.)

### Fonksiyonel güncelleme — neden `setForm(f => ...)`
```tsx
setForm(f => ({ ...f, title: e.target.value }));
//       ↑ f = "o anki en güncel form"
```
`setForm(yeniObje)` yerine `setForm(f => ...)` kullanmak, **en güncel değeri garanti eder**.
Özellikle arka arkaya birden çok güncelleme olursa (veya closure eskimişse — D bölümü) bu güvenlidir.

---

## C. Immutability ve neden `...spread`

React **değişikliği referans karşılaştırmasıyla** anlar:
```js
eskiData === yeniData   // aynı obje mi? (içeriğe değil, KİMLİĞE bakar)
```
Eğer objeyi **içinden** değiştirirsen referans aynı kalır, React "değişmedi" sanır ve **render etmez**:
```tsx
// ❌ YANLIŞ — React fark etmez
data.tasks.push(yeniGorev);
setData(data);   // aynı referans → render yok

// ✅ DOĞRU — yeni referans üret
setData(prev => ({ ...prev, tasks: [yeniGorev, ...prev.tasks] }));
```
`lib/storage.ts`'teki `updateData` tam da bunu yapar:
```tsx
setData(prev => ({
  ...prev,                      // üst objeyi kopyala (yeni referans)
  [key]: updater(prev[key]),    // sadece ilgili dizi/alanı yenisiyle değiştir
}));
```
`[key]` köşeli parantezle: anahtar bir **değişken** (`'tasks'`, `'projects'`...). Buna
"computed property name" denir.

> **Kural:** State'i asla elle değiştirme (`push`, `x.y = z`). Hep **kopyala + değiştir**.

---

## D. Closure ve "stale state" tuzağı

JavaScript'te bir fonksiyon, **tanımlandığı andaki** değişkenleri "hatırlar" (closure).
React'te bu bazen eski (stale) değer yakalamaya yol açar:

```tsx
useEffect(() => {
  const id = setInterval(() => {
    console.log(count);  // ⚠️ HEP ilk render'daki count'u basar (örn. 0)
  }, 1000);
}, []);  // boş dizi → effect bir kez kurulur, count'un ilk halini "dondurur"
```
Çözüm: ya bağımlılığa ekle (`[count]`), ya fonksiyonel güncelleme kullan (`setCount(c => c+1)`).

Projede `debounce` bu yüzden `useRef` kullanır — `saveTimer.current` closure'a takılmaz, her zaman
**aynı kutuya** bakar (E ve F bölümlerinde görülecek).

---

## E. UÇTAN UCA: bir harfe basınca ne oluyor

Görev detayında **başlık** kutusuna "A" harfi yazdın. Adım adım:

```
1. Tarayıcı: <input>'ta keydown/input olayı oluşur
2. React: onChange tetiklenir
     onChange={e => set('title', e.target.value)}
     → e.target.value = "A" (kutunun yeni içeriği)
3. set('title', 'A') → onUpdate({ ...task, title: 'A' })   (yeni task objesi)
4. updateTask(task) → updateData('tasks', prev => prev.map(...))
     → setData(prev => ({ ...prev, tasks: yeniDizi }))      (yeni AppData)
5. setData içinde persist(next) çağrılır:
     - varsa önceki setTimeout iptal (clearTimeout)
     - yeni setTimeout kurulur: "400ms sonra PUT at"
6. React yeniden render eder → input'ta artık "A" görünür (controlled)
   useAutoGrow effect'i çalışır → textarea yüksekliği içeriğe ayarlanır
7. (Sen yazmaya devam edersen 5. adımdaki timer sürekli iptal+yeniden kurulur)
8. 400ms boyunca tuşa basmazsan timer ateşlenir:
     fetch('/api/data', { method:'PUT', body: JSON.stringify(tüm veri) })
9. Sunucu: app/api/data/route.ts → PUT(req) çalışır
     - body = await req.json()        (gelen JSON → obje)
     - prisma.$transaction([ deleteMany..., createMany... ])
10. Prisma → SQL üretir → Postgres tabloları güncellenir
11. Sunucu { ok: true } döner; tarayıcı tarafı bunu yutar (sessiz kayıt)
```

**Dikkat:** Adım 6'da ekran **anında** güncellenir (state değişti). Adım 8-10'daki veritabanı
kaydı **arka planda, gecikmeli** olur. Yani kullanıcı asla beklemez — buna "optimistic UI" mantığı denir.

---

## F. useEffect derinlemesine

### İmza
```tsx
useEffect(() => {
  // 1) ÇALIŞMA gövdesi (effect)
  return () => {
    // 2) CLEANUP (temizlik) — opsiyonel
  };
}, [bağımlılıklar]);  // 3) ne zaman tekrar çalışsın
```

### Bağımlılık dizisi üç durum
| Yazım | Ne zaman çalışır |
|---|---|
| `[]` | Sadece ilk mount'ta bir kez |
| `[x]` | Mount'ta + her `x` değiştiğinde |
| (hiç yok) | **Her render'da** (genelde istemezsin) |

### Cleanup neden var — `lib/storage.ts` veri yükleme
```tsx
useEffect(() => {
  let cancelled = false;
  fetch('/api/data')
    .then(r => r.json())
    .then(d => { if (!cancelled) setDataState(d); })   // iptal olduysa state'e dokunma
    .finally(() => { if (!cancelled) setLoaded(true); });
  return () => { cancelled = true; };   // bileşen kalkarsa "iptal" işaretle
}, []);
```
**Race condition (yarış) sorunu:** fetch bitmeden bileşen ekrandan kalkarsa, sonradan gelen cevap
olmayan bir şeye yazmaya çalışır → uyarı/hata. `cancelled` bayrağı bunu engeller. Cleanup,
React bileşeni kaldırırken (unmount) veya effect tekrar çalışmadan **önce** çağrılır.

### `useAutoGrow` effect'i
```tsx
useEffect(() => {
  const el = ref.current;            // gerçek <textarea> DOM elemanı
  if (el) {
    el.style.height = 'auto';        // önce küçült ki scrollHeight doğru ölçülsün
    el.style.height = el.scrollHeight + 'px';
  }
}, [value]);   // her metin değişiminde yeniden boyutla
```
Neden `value` bağımlılık? Çünkü boyut **içeriğe** bağlı; içerik (`value`) değişince yeniden ölçmeli.

---

## G. async/await ve Promise mekaniği

### Promise nedir
"Sonucu **henüz hazır olmayan** bir değer." Ağ/disk işleri zaman alır; JS beklerken donmaz,
işi "söz" (Promise) olarak verir, hazır olunca haber alır.

```tsx
fetch('/api/data')          // Promise döner (cevap henüz yok)
  .then(r => r.json())      // cevap gelince: gövdeyi JSON'a çevir (bu da Promise)
  .then(d => setData(d))    // JSON hazır olunca: state'e yaz
  .catch(err => ...)        // herhangi adımda hata olursa
```

### `async/await` — aynı şeyin okunaklı hali
```tsx
export async function GET() {
  const tasks = await prisma.task.findMany();  // "bitene kadar bekle, sonucu tasks'e koy"
  return NextResponse.json({ tasks });
}
```
- `async`: bu fonksiyon Promise döndürür ve içinde `await` kullanılabilir.
- `await`: "bu Promise çözülene kadar bekle." Tarayıcıyı/sunucuyu **dondurmaz**; sadece bu
  fonksiyonun akışını duraklatır, motor başka işlere bakar.

### `Promise.all` — paralel bekleme (`route.ts` GET)
```tsx
const [tasks, projects, notes, plannerEvents] = await Promise.all([
  prisma.task.findMany(),
  prisma.project.findMany(),
  prisma.note.findMany(),
  prisma.plannerEvent.findMany(),
]);
```
Dört sorguyu **aynı anda** başlatır, hepsi bitince devam eder. Tek tek `await` etseydik
(seri) daha yavaş olurdu. Sonuçları sırayla parçalıyoruz (destructuring).

---

## H. HTTP ve fetch katmanı

### Bir HTTP isteğinin parçaları
```
PUT /api/data HTTP/1.1          ← metod + yol
Content-Type: application/json  ← başlık (header): gövde JSON
                                ← boş satır
{"tasks":[...]}                 ← gövde (body)
```
Sunucu cevabı:
```
HTTP/1.1 200 OK                 ← durum kodu
{"ok":true}                     ← gövde
```

### Durum kodları (projede dönüyoruz)
| Kod | Anlam | Nerede |
|---|---|---|
| 200 | Başarılı | normal cevap |
| 400 | Geçersiz istek | bozuk JSON gelince |
| 500 | Sunucu hatası | DB yazma patlarsa |

### fetch ayrıntısı (`lib/storage.ts`)
```tsx
fetch('/api/data', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },  // "gönderdiğim şey JSON"
  body: JSON.stringify(next),                        // obje → metin (ağdan metin gider)
});
```
Karşı tarafta (`route.ts`): `const body = await req.json();` → **metin tekrar objeye** döner.
Yani: obje → `stringify` → ağ (metin) → `req.json()` → obje. Bu çevrim **her zaman** olur.

### Niçin `route.ts` sunucuda?
Veritabanı şifresi, `prisma`, dosya sistemi → bunlar **tarayıcıya gitmemeli**. Route handler
sunucuda çalışır, tarayıcı sadece `fetch` ile sonucu ister. Güvenlik sınırı budur.

---

## I. Prisma → SQL → Postgres

### Katmanlar
```
Senin kodun        prisma.task.findMany()
   ↓ Prisma çevirir
SQL                SELECT * FROM tasks;
   ↓ Postgres çalıştırır
Disk/Tablo         satırları döndürür
```
Sen SQL yazmazsın; Prisma tipli metodları SQL'e çevirir. Ama DBeaver'da **kendin SQL yazabilirsin**:
```sql
SELECT title, priority FROM tasks WHERE status = 'todo';
```

### Şemadaki her parçanın karşılığı (`prisma/schema.prisma`)
```prisma
model Task {
  id    String  @id            → tasks tablosu, id = PRIMARY KEY
  title String                 → NOT NULL text kolon
  description String?          → NULL olabilen text kolon
  tags  Json @default("[]")    → jsonb kolon, varsayılan boş dizi
  @@map("tasks")               → model adı Task ama tablo adı "tasks"
}
```
`prisma db push` bunu şu SQL'e çevirip çalıştırdı (özet):
```sql
CREATE TABLE tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  tags jsonb NOT NULL DEFAULT '[]',
  ...
);
```

### "Sil + yeniden yaz" stratejisi neden?
Veri küçük ve istemci **tüm durumu** gönderiyor. En basit tutarlı yöntem: tabloyu boşalt, gelenleri yaz.
Alternatif (her kaydı tek tek "var mı, güncelle mi, sil mi" diye karşılaştırmak) çok daha karmaşık olurdu.

### Transaction garantisi
```tsx
await prisma.$transaction([ deleteMany... , createMany... ]);
```
Postgres bunu tek bir `BEGIN ... COMMIT` bloğu yapar. Ortada elektrik kesilse bile: ya **tüm**
blok işlenir ya **hiçbiri**. Yarı silinmiş/yarı yazılmış bozuk veri oluşmaz. (ACID'in "A"sı = Atomicity.)

### jsonb vs ayrı tablo
- `title`, `status` → ana kolon: filtrele, sırala, indeksle kolay.
- `problemSolutions` (Q&A listesi) → jsonb: tek görevin alt verisi, ayrı sorgulanmıyor, ayrı tablo
  açmak gereksiz karmaşa olurdu. Pratik denge.

---

## J. TypeScript'i derleyici gözüyle okumak

TypeScript çalışma anında **yok** — sadece yazarken/derlerken hata yakalar (`npx tsc --noEmit`).
Tarayıcıya giden saf JavaScript'tir (tipler silinir).

### Tip okuma
```ts
function set<K extends keyof Task>(key: K, val: Task[K]) { ... }
```
Parça parça:
- `keyof Task` = Task'ın anahtarları birliği: `'id' | 'title' | 'priority' | ...`
- `K extends keyof Task` = K bu anahtarlardan biri olmalı.
- `Task[K]` = o anahtarın değerinin tipi. (`key='title'` ise `val` string olmalı; `key='priority'`
  ise `val` Priority olmalı.) Bu sayede `set('priority', 'banana')` derleme hatası verir.

### `as` (tip dönüştürme) — ne zaman gerekti
```tsx
data: body.tasks.map(toTaskRow) as unknown as Prisma.TaskCreateManyInput[]
```
Prisma'nın jsonb beklediği tip (`InputJsonValue`) ile bizim `QAItem[]` tipimiz teknik olarak
çakışıyordu. `as unknown as X`: "ben ne yaptığımı biliyorum, bu değeri X say." Kaçış kapısıdır,
**dikkatli** kullanılır (yanlış kullanırsan çalışma anında patlar).

### `interface` vs `type`
```ts
interface Task { id: string; ... }              // obje şekli
type Priority = 'low' | 'medium' | 'high';      // birlik/takma ad
```
İkisi de tip tanımı; obje şekilleri için `interface`, birlikler/aliaslar için `type` alışkanlık.

---

## K. Sık yapılan hatalar

| Hata | Belirti | Sebep / Çözüm |
|---|---|---|
| State'i elle değiştirmek (`arr.push`) | Ekran güncellenmiyor | Referans aynı → kopyala+değiştir (`[...arr, x]`) |
| `setState` sonrası eski değeri okumak | "Niye hâlâ eski?" | State asenkron; yeni değeri sonraki render'da gör |
| `useEffect`'e bağımlılık koymamak | Eski (stale) değer | Kullandığın değişkeni `[]`'e ekle veya `setX(x=>...)` |
| `key` unutmak (`.map`) | Konsol uyarısı, garip liste davranışı | Her elemana benzersiz `key={id}` |
| `onClick={fn()}` yazmak | Tıklamadan çalışıyor | `onClick={() => fn()}` veya `onClick={fn}` |
| Sırrı (.env) commit'lemek | Şifre GitHub'da | `.gitignore`'a ekle, `.env.example` koy |
| Uzak `@import url()` (CSS) | Derleme takılır | next/font kullan veya importu kaldır (bunu yaşadık) |
| jsonb'yi kolon sanmak | Sorgu zor | jsonb içi: `tags->>0` gibi özel operatörler gerekir |

---

## Nereden devam etmeli (kaynaklar)

- **JavaScript temeli:** MDN — "JavaScript first steps"
- **React:** react.dev → "Learn" (özellikle "Thinking in React", "State as a Snapshot")
- **Next.js App Router:** nextjs.org/docs → "App Router" bölümü
- **Prisma:** prisma.io/docs → "Get started" + "CRUD"
- **SQL pratiği:** DBeaver'da kendi `tasks` tablona `SELECT`/`WHERE`/`ORDER BY` dene

> En etkili yöntem: bu projede **küçük bir şey değiştir** (ör. yeni bir alan ekle: tipe → şemaya →
> forma), `npm run db:push` çalıştır, sonucu tarayıcıda ve DBeaver'da gör. Uçtan uca bir tur
> atmak, on döküman okumaktan iyidir.
