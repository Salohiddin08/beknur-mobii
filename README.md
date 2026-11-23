# Beknur Mobii

Lokal Next.js + PostgreSQL loyihasi. Sayt o‘zbek va rus tillarida. Dark creative-production dizayni, scroll bilan aylanadigan GLB kamera, portfolio, tariflar, buyurtma formasi va rollarga asoslangan admin panel.

## Ishga tushirish

Loyiha papkasida `pnpm local` bajaring yoki `Start-local.ps1` faylini PowerShell orqali ishga tushiring. Bu lokal PostgreSQL, sayt va sozlangan bo‘lsa Telegram worker’ni boshlaydi.

- Sayt: http://127.0.0.1:3000/uz
- Admin: http://127.0.0.1:3000/admin
- Lokal login/parollar: `.local/admin-accounts.txt`. Ularni Git’ga yuklamang. Kirgach parolni admin panel orqali o‘zgartirish mumkin.
- `developer` va `owner`: barcha bo‘limlar. `manager`: buyurtmalar va mijozlar.

## Portfolio boshqaruvi

Admin → Portfolio → Qo‘shish. O‘zbekcha/ruscha sarlavha, kategoriya, MP4 video va muqova rasmini kiriting. Faylni kompyuterdan yuklash yoki HTTPS havolasini berish mumkin. Video uchun bevosita MP4 havolasi kerak; Telegram post havolasi video fayli o‘rnini bosmaydi.

“Saytda ko‘rsatish” belgisi e’lon qilish/yashirishni boshqaradi. “Ko‘rish” video oynasini ochadi. “Tahrirlash” va “O‘chirish” amallari bazada saqlanadi. O‘chirish tasdiqlash oynasi orqali bajariladi. Import bir marta ishlaydi: o‘chirilgan import videolari restartda qaytmaydi.

38 ta ochiq Telegram videosi dastlab import qilingan. Mualliflik/manbalar: `ASSETS.md`. Fayl yuklash chegarasi 150 MB. Yuklangan fayllar `.local/media/` ichida saqlanadi. Yozuv o‘chirilganda jismoniy media fayli avtomatik o‘chirilmaydi.

## Telegramni ulash — hali talab qilinadigan sozlama

Chatga yuborilgan eski tokenni ishlatmang. BotFather’da yangilangan tokenni `.env.local` faylidagi `TELEGRAM_BOT_TOKEN` qiymatiga faqat lokal ravishda yozing.

1. Worker ishlamayotgan paytda jamoa guruhiga `/start@beknurmobii_bot` yuboring.
2. `node --env-file=.env.local --experimental-strip-types scripts/discover-group.ts` buyrug‘i guruh nomi va ID’sini chiqaradi.
3. Kerakli jamoa guruhining ID’sini `TELEGRAM_CHAT_ID` ga kiriting.
4. `pnpm bot` orqali worker’ni boshlang. Bot guruh administratori bo‘lsin.

Bot faqat sozlangan guruhda boshqariladi. `/orders`, `/new`, `/stats`, `/start`, `/help` va holat tugmalari bor. Saytdagi buyurtma bazaga yoziladi, Telegram ishlamasa qayta yuborish navbatida qoladi. Telegram yetkazilishi tasdiqlanmaguncha foydalanuvchiga faqat “Buyurtma saqlandi” ko‘rsatiladi. Aloqa uzilib, Telegram xabarni qabul qilgani tasdiqlanmay qolgan kamdan-kam holatda qayta yuborilgan xabar takrorlanishi mumkin; buyurtma raqami bir xil qoladi.

## Tekshirish

`pnpm build` — production build va TypeScript.

`pnpm test` — alohida vaqtinchalik PostgreSQL schema’da 6 ta integratsiya testi: narx snapshot’i, idempotency, validatsiya, rollar/session/origin, rate limiting, Telegram xatolik/retry/huquqlar.

`node scripts/check-admin.mjs` — ishlayotgan lokal serverda admin loginlari, rollar, rasm yuklash va portfolio CRUD’ni tekshiradi. Faqat o‘zi yaratgan test yozuvi/faylini tozalaydi.

Telegram testi mock API orqali bajariladi. Yangi token va guruh ID’siz haqiqiy guruhga yetkazish tekshirilmagan.

## Internetga joylashtirish

Node.js 22+ va oddiy PostgreSQL serverdan foydalaning. `DATABASE_URL`ni production bazaga, `APP_ORIGIN`ni HTTPS domeningizga o‘zgartiring. `pnpm build`, keyin `pnpm start`; bot worker alohida doimiy jarayon bo‘lsin. Reverse proxy localhost:3000 ga yo‘naltirsin. Faqat proxy X-Forwarded-For qiymatini o‘zi qayta yozsa `TRUST_PROXY=true` qiling.

`.local/media` va PostgreSQL uchun doimiy disk/backup zarur. `.env.local`, `.local/admin-accounts.txt`, baza fayllari Git’ga yoki ochiq hosting papkasiga joylanmaydi. Embedded PostgreSQL faqat lokal ko‘rish uchun; production’da alohida boshqariladigan PostgreSQL tavsiya etiladi.
