/**
 * ============================================================
 *  KONEKSI DATABASE MySQL — Sistem Inventaris FT UNS
 *  Modul siap pakai memakai paket `mysql2`.
 * ------------------------------------------------------------
 *  Langkah:
 *    1. Pastikan MySQL/MariaDB berjalan (XAMPP/Laragon).
 *    2. Import database/schema.sql lewat phpMyAdmin.
 *    3. Di root project jalankan:  npm install mysql2
 *    4. Buat file .env.local (lihat database/README.md).
 *    5. Import { query } dari modul ini di API route Anda.
 * ============================================================
 */
const mysql = require("mysql2/promise");

// Pool koneksi (lebih efisien daripada koneksi tunggal)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",      // XAMPP default: kosong
  database: process.env.DB_NAME || "inventaris_ft_uns",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

/** Jalankan query apa pun dengan parameter aman (anti SQL-injection). */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/* ---------- Contoh fungsi siap pakai ---------- */

async function getAllBarang() {
  return query(
    `SELECT b.*, r.nama_ruang, g.nama_gedung, s.nama_status
       FROM barang b
       LEFT JOIN ruangan r ON b.id_ruangan = r.id_ruangan
       LEFT JOIN gedung  g ON r.id_gedung  = g.id_gedung
       LEFT JOIN status_barang s ON b.id_status = s.id_status
      ORDER BY b.created_at DESC`
  );
}

async function addBarang(data) {
  const sql = `INSERT INTO barang
      (kode_barang, nup, kode_unik, nama_barang, merek, kategori, penguasaan,
       tahun_perolehan, nilai_perolehan, jumlah, satuan, keterangan, deskripsi,
       id_ruangan, id_status, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const p = [
    data.kode_barang, data.nup, data.kode_unik, data.nama_barang, data.merek,
    data.kategori, data.penguasaan, data.tahun_perolehan, data.nilai_perolehan,
    data.jumlah, data.satuan, data.keterangan, data.deskripsi,
    data.id_ruangan, data.id_status, data.created_by,
  ];
  const res = await query(sql, p);
  return res.insertId;
}

async function updateBarang(id, data) {
  await query(
    `UPDATE barang SET nama_barang=?, merek=?, kategori=?, nilai_perolehan=?,
        id_ruangan=?, id_status=?, updated_at=NOW() WHERE id_barang=?`,
    [data.nama_barang, data.merek, data.kategori, data.nilai_perolehan,
     data.id_ruangan, data.id_status, id]
  );
}

async function deleteBarang(id) {
  await query(`DELETE FROM barang WHERE id_barang=?`, [id]);
}

/** Catat aktivitas ke audit trail. */
async function logAktivitas({ id_user, user_nama, user_role, aktivitas, tipe }) {
  await query(
    `INSERT INTO log_aktivitas (id_user, user_nama, user_role, aktivitas, tipe)
     VALUES (?,?,?,?,?)`,
    [id_user, user_nama, user_role, aktivitas, tipe]
  );
}

module.exports = {
  pool, query,
  getAllBarang, addBarang, updateBarang, deleteBarang, logAktivitas,
};
