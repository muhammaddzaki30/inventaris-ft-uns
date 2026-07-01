// 1. Kunci link database Neon lu langsung di paling atas biar aman
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_QNC2qPLUd9pa@ep-quiet-poetry-ad8zhqkl-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// 2. AUTO-DETECT PrismaClient
let PrismaClient;
const possiblePaths = [
  './src/generated/prisma',
  '@prisma/client',
  './generated/prisma',
  '../generated/prisma',
  './prisma/generated/client',
];

let loadedFrom = null;
for (const p of possiblePaths) {
  try {
    const mod = require(p);
    if (mod.PrismaClient) {
      PrismaClient = mod.PrismaClient;
      loadedFrom = p;
      break;
    }
  } catch (e) {}
}

if (!PrismaClient) {
  console.error("❌ GAGAL: PrismaClient tidak ditemukan di path manapun.");
  console.error("   Jalankan dulu: npx prisma generate");
  process.exit(1);
}

console.log(`📦 PrismaClient berhasil dimuat dari: ${loadedFrom}\n`);

// Prisma v7 WAJIB pake "adapter". Pake @prisma/adapter-pg karena
// DATABASE_URL kita connection string postgres standar lewat pooler Neon.
let prisma;
try {
  const { PrismaPg } = require('@prisma/adapter-pg');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  prisma = new PrismaClient({ adapter });
  console.log("🔌 Terhubung pakai adapter-pg\n");
} catch (e) {
  console.error("❌ Gagal setup adapter-pg:", e.message);
  console.error("   Jalankan dulu: npm install @prisma/adapter-pg pg");
  process.exit(1);
}

async function main() {
  console.log("🚀 Memulai Sinkronisasi & Seeding ke Neon Database...\n");

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("🟢 Koneksi ke database OK\n");
  } catch (e) {
    console.error("❌ GAGAL KONEKSI KE DATABASE:", e.message);
    console.error("   Cek lagi password/connection string DATABASE_URL di atas.");
    process.exit(1);
  }

  let id_role = 1, id_status = 1, id_gedung = 1, id_vendor = 1, id_user = 1;
  let id_ruangan = 1, id_barang = 1, id_pengajuan = 1, id_lapor = 1, id_opname = 1;

  // ==========================================
  // 1. TABEL MASTER
  // ==========================================
  try {
    const role = await prisma.roles.create({ data: { nama_role: "admin" } });
    id_role = role.id_role || role.id || 1;
    console.log("✅ 1. Tabel roles berhasil diisi");
  } catch (e) {
    if (e.code === 'P2002') console.log("ℹ️ 1. Tabel roles (Sudah ada / Skip)");
    else console.log("❌ 1. Tabel roles gagal:", e.message);
  }

  try {
    const status = await prisma.status_barang.create({ data: { nama_status: "baik" } });
    id_status = status.id_status || status.id || 1;
    console.log("✅ 2. Tabel status_barang berhasil diisi");
  } catch (e) {
    if (e.code === 'P2002') console.log("ℹ️ 2. Tabel status_barang (Sudah ada / Skip)");
    else console.log("❌ 2. Tabel status_barang gagal:", e.message);
  }

  try {
    const gedung = await prisma.gedung.create({ data: { kode_gedung: "FT-A", nama_gedung: "Gedung A Fakultas Teknik" } });
    id_gedung = gedung.id_gedung || gedung.id || 1;
    console.log("✅ 3. Tabel gedung berhasil diisi");
  } catch (e) {
    if (e.code === 'P2002') console.log("ℹ️ 3. Tabel gedung (Sudah ada / Skip)");
    else console.log("❌ 3. Tabel gedung gagal:", e.message);
  }

  try {
    const vendor = await prisma.vendor.create({
      data: {
        nama_vendor: "PT Komputer Jaya",
        kontak: "08123456789",
        email: "info@komputerjaya.com",
        alamat: "Jl. Slamet Riyadi, Surakarta"
      }
    });
    id_vendor = vendor.id_vendor || vendor.id || 1;
    console.log("✅ 4. Tabel vendor berhasil diisi");
  } catch (e) {
    if (e.code === 'P2002') console.log("ℹ️ 4. Tabel vendor (Sudah ada / Skip)");
    else console.log("❌ 4. Tabel vendor gagal:", e.message);
  }

  // ==========================================
  // 2. TABEL PENGGUNA & LOKASI
  // ==========================================
  try {
    const user = await prisma.users.create({
      data: {
        nama: "Budi Admin",
        email: "admin_" + Math.floor(Math.random() * 10000) + "@uns.ac.id",
        password: "hashedpassword123",
        id_role: id_role
      }
    });
    id_user = user.id_user || user.id || 1;
    console.log("✅ 5. Tabel users berhasil diisi");
  } catch (e) {
    console.log("❌ 5. Tabel users gagal:", e.message);
  }

  try {
    const ruangan = await prisma.ruangan.create({
      data: {
        kode_ruangan: "R-" + Math.floor(Math.random() * 10000),
        nama_ruangan: "Lab Komputer 1",
        id_gedung: id_gedung,
        lantai: 1,
        penanggung_jawab: id_user
      }
    });
    id_ruangan = ruangan.id_ruangan || ruangan.id || 1;
    console.log("✅ 6. Tabel ruangan berhasil diisi");
  } catch (e) {
    console.log("❌ 6. Tabel ruangan gagal:", e.message);
  }

  // ==========================================
  // 3. TABEL INTI (Barang & QR)
  // ==========================================
  const randomKode = "IT-LAP-" + Math.floor(Math.random() * 100000);
  try {
    const barang = await prisma.barang.create({
      data: {
        kode_barang: randomKode,
        nup: "001",
        kode_unik: randomKode + "-001",
        nama_barang: "Laptop Asus ROG",
        merek: "Asus",
        penguasaan: "milik_sendiri",
        tahun_perolehan: 2024,
        keterangan: "Pengadaan baru 2024",
        id_ruangan: id_ruangan,
        id_status: id_status,
        created_by: id_user
      }
    });
    id_barang = barang.id_barang || barang.id || 1;
    console.log("✅ 7. Tabel barang berhasil diisi");
  } catch (e) {
    console.log("❌ 7. Tabel barang gagal:", e.message);
  }

  try {
    await prisma.qr_code.create({
      data: {
        id_barang: id_barang,
        kode_unik: "QR-" + Math.floor(Math.random() * 100000),
        id_ruangan: id_ruangan,
        isi_qr: JSON.stringify({ id: id_barang, kode: randomKode }),
        file_qr: "/qrcodes/test.png"
      }
    });
    console.log("✅ 8. Tabel qr_code berhasil diisi");
  } catch (e) {
    console.log("❌ 8. Tabel qr_code gagal:", e.message);
  }

  // ==========================================
  // 4. TABEL TRANSAKSI
  // ==========================================
  try {
    const pengajuan = await prisma.pengajuan.create({
      data: {
        id_barang: id_barang,
        id_user_pengaju: id_user,
        jenis_pengajuan: "maintenance",
        alasan: "Keyboard rusak sebagian",
        status_pengajuan: "pending"
      }
    });
    id_pengajuan = pengajuan.id_pengajuan || pengajuan.id || 1;
    console.log("✅ 9. Tabel pengajuan berhasil diisi");
  } catch (e) {
    console.log("❌ 9. Tabel pengajuan gagal:", e.message);
  }

  try {
    await prisma.maintenance.create({
      data: {
        id_barang: id_barang,
        id_pengajuan: id_pengajuan,
        id_vendor: id_vendor,
        tanggal_mulai: new Date(),
        prioritas: "sedang",
        status_maintenance: "dijadwalkan",
        deskripsi_perbaikan: "Ganti keyboard laptop",
        biaya: 500000,
        id_user: id_user
      }
    });
    console.log("✅ 10. Tabel maintenance berhasil diisi");
  } catch (e) {
    console.log("❌ 10. Tabel maintenance gagal:", e.message);
  }

  try {
    const laporanKerusakan = await prisma.laporan_kerusakan.create({
      data: {
        id_barang: id_barang,
        deskripsi: "Layar sering berkedip",
        tingkat_kerusakan: "ringan",
        id_user: id_user,
        status_verifikasi: "pending"
      }
    });
    id_lapor = laporanKerusakan.id_lapor || laporanKerusakan.id_laporan_kerusakan || laporanKerusakan.id || 1;
    console.log("✅ 11. Tabel laporan_kerusakan berhasil diisi");
  } catch (e) {
    console.log("❌ 11. Tabel laporan_kerusakan gagal:", e.message);
  }

  try {
    const stockOpname = await prisma.stock_opname.create({
      data: {
        periode: "Semester Ganjil 2024",
        tanggal_mulai: new Date(),
        diminta_oleh: "Dekanat FT",
        id_user: id_user,
        status: "berjalan",
        catatan: "Pengecekan rutin tahunan"
      }
    });
    id_opname = stockOpname.id_opname || stockOpname.id || 1;
    console.log("✅ 12. Tabel stock_opname berhasil diisi");
  } catch (e) {
    console.log("❌ 12. Tabel stock_opname gagal:", e.message);
  }

  try {
    await prisma.detail_stock_opname.create({
      data: {
        id_opname: id_opname,
        id_barang: id_barang,
        id_ruangan: id_ruangan,
        id_status: id_status,
        tingkat_kerusakan: "ringan",
        id_user: id_user,
        catatan: "Kondisi fisik masih oke"
      }
    });
    console.log("✅ 13. Tabel detail_stock_opname berhasil diisi");
  } catch (e) {
    console.log("❌ 13. Tabel detail_stock_opname gagal:", e.message);
  }

  try {
    await prisma.penghapusan.create({
      data: {
        id_barang: id_barang,
        sumber: "laporan_kerusakan",
        id_laporan_kerusakan: id_lapor,
        tanggal_penghapusan: new Date(),
        alasan: "Barang sudah hancur total",
        id_user: id_user
      }
    });
    console.log("✅ 14. Tabel penghapusan berhasil diisi");
  } catch (e) {
    console.log("❌ 14. Tabel penghapusan gagal:", e.message);
  }

  try {
    await prisma.riwayat_barang.create({
      data: {
        id_barang: id_barang,
        id_status_lama: id_status,
        id_status_baru: id_status,
        permasalahan: "Pencatatan awal barang",
        sumber: "manual",
        id_user: id_user
      }
    });
    console.log("✅ 15. Tabel riwayat_barang berhasil diisi");
  } catch (e) {
    console.log("❌ 15. Tabel riwayat_barang gagal:", e.message);
  }

  try {
    await prisma.laporan.create({
      data: {
        nama_laporan: "Laporan Aset FT 2024",
        format_file: "pdf",
        generated_by: id_user
      }
    });
    console.log("✅ 16. Tabel laporan berhasil diisi");
  } catch (e) {
    console.log("❌ 16. Tabel laporan gagal:", e.message);
  }

  try {
    await prisma.log_aktivitas.create({
      data: {
        id_user: id_user,
        aktivitas: "Admin Budi melakukan inisialisasi data master sistem secara massal"
      }
    });
    console.log("✅ 17. Tabel log_aktivitas berhasil diisi");
  } catch (e) {
    console.log("❌ 17. Tabel log_aktivitas gagal:", e.message);
  }

  console.log("\n🎉 SELESAI TOTAL! Data berhasil disuntikkan ke database.");
  console.log("Silakan langsung buka tab 'Tables' atau 'Data Editor' di dashboard website Neon lu buat mantau!");
}

main()
  .catch((e) => console.error("Fatal Error:", e))
  .finally(async () => await prisma.$disconnect());