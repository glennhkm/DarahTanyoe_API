# Darahtanyoe - API

Darahtanyoe adalah sebuah ekosistem donor darah yang memudahkan peminta dan pendonor dalam melakukan transaksi. API ini digunakan untuk mengelola otentikasi, validasi permintaan darah, serta broadcast pendonor terdekat.

## Teknologi yang Digunakan
API Darahtanyoe dikembangkan menggunakan:
- **Node.js** - Runtime JavaScript untuk backend.
- **Express.js** - Framework web untuk membangun REST API.
- **PostgreSQL + PostGIS** - Database relasional dengan dukungan GIS untuk pencarian pendonor dalam radius 5 km.
- **Twilio** - Layanan OTP untuk autentikasi pengguna.
- **WhatsApp Cloud API** - Digunakan untuk mengirim broadcast ke pendonor terdekat.
- **Supabase** - Backend as a Service untuk autentikasi dan database.
- **Vercel** - Platform deployment untuk API.

## Cara Menjalankan Proyek
Pastikan Anda sudah menginstal **Node.js** dan **Yarn** di sistem Anda.

1. Clone repository ini:
   ```sh
   git clone https://github.com/username/darahtanyoe-api.git
   cd darahtanyoe-api
   ```

2. Salin file konfigurasi `.env.example` ke `.env` lalu isi dengan kredensial yang sesuai:
   ```sh
   cp .env.example .env
   ```

3. Instal dependensi:
   ```sh
   yarn install
   ```

4. Jalankan aplikasi dalam mode pengembangan:
   ```sh
   yarn dev
   ```
   API akan berjalan di `http://localhost:5000`

## Deployment
API ini dideploy di Vercel dan dapat diakses melalui link berikut:
[https://darahtanyoe-api.vercel.app](https://darahtanyoe-api.vercel.app)

## Fitur Utama (MVP)
- **Otentikasi OTP** - Pengguna dapat masuk menggunakan OTP melalui Twilio.
- **Validasi Permintaan Darah** - Rumah sakit atau PMI dapat memvalidasi permintaan donor darah.
- **Broadcast Pendonor Terdekat** - Menggunakan PostGIS untuk mencari pendonor dalam radius 5 km dan mengirim notifikasi melalui WhatsApp Cloud API.

---
**Darahtanyoe - Transparan, Terhubung, Terselematkan.**

