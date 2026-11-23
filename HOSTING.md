# Serverga joylash

Bu loyiha Node.js, PostgreSQL, doimiy disk va alohida Telegram worker talab qiladi. Docker konfiguratsiyasi tayyorlandi; haqiqiy serverda build va ishga tushirish hali tekshirilmagan.

## Tayyorlash

1. Docker Compose o‘rnatilgan Linux server kerak. Domen/subdomen server IP manziliga yo‘naltiriladi. 80 va 443 portlar ochiladi; PostgreSQL porti internetga ochilmaydi.
2. Manba kodni ko‘chiring. `.env.local`, `.local`, `node_modules` va `.next` ni yubormang. Mavjud mijozlar va admin ma’lumotlarini ko‘chirish uchun alohida PostgreSQL backup/restore kerak; yangi seed ularni ko‘chirmaydi.
3. `.env.production.example` dan `.env.production` yarating. Barcha REPLACE qiymatlarini almashtiring. Telegram tokenini faqat shu server fayliga kiriting. Fayl ruxsatini `chmod 600 .env.production` qiling.
4. `docker compose --env-file .env.production build`
5. `docker compose --env-file .env.production up -d db web proxy`
6. Faqat yangi bo‘sh baza uchun: `docker compose --env-file .env.production exec web node --experimental-strip-types scripts/seed.ts`. Yangi parollar container ichidagi `/app/.local/admin-accounts.txt` da. Kirgach almashtiring.
7. Lokal Telegram worker to‘xtatilgach: `docker compose --env-file .env.production up -d bot`. Bitta bot uchun ikkita polling worker ishlatmang.

## Tekshirish

HTTPS, ikkala til, admin login, video upload/playback, uchala tarif va test buyurtmaning Telegramga borishini tekshiring. Server restartidan keyin videolar va yozuvlar saqlanishini tekshiring. `docker compose --env-file .env.production logs --tail 50` bilan xatolarni tekshiring; loglarni token bilan ulashmang.

Baza uchun pg_dump va appdata volume uchun muntazam tashqi backup tashkil qiling. `docker compose down -v` ma’lumotlarni o‘chiradi — ishlatmang.

Real domen tekshirilgach SITE_INDEXABLE=true qilib web containerini qayta yarating. Google Search Console orqali domenni tasdiqlang va /sitemap.xml yuboring. Keyin https://pagespeed.web.dev da mobil va desktop sinovlarini bajaring. Lokal tekshiruv Google reytingi yoki real hosting tezligini kafolatlamaydi.
