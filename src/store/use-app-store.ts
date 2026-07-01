"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Barang, Pengajuan, Peminjaman, Notifikasi, Ruangan, QrCode, RiwayatBarang, LaporanKerusakan, Maintenance, Vendor, DetailPenghapusan, StockOpname, DetailStockOpname, LogAktivitas, Role, SubRole } from "@/types";
import { getSeedData, DEMO_USERS } from "@/lib/seed";
import { logActivity } from "@/lib/logActivity";

interface AppState {
  hasHydrated: boolean;
  currentUser: User | null;
  users: User[];
  barang: Barang[];
  pengajuan: Pengajuan[];
  peminjaman: Peminjaman[];
  notifikasi: Notifikasi[];
  ruangan: Ruangan[];
  vendor: Vendor[];
  laporanKerusakan: LaporanKerusakan[];
  maintenanceData: Maintenance[];
  detailPenghapusan: DetailPenghapusan[];
  riwayatBarang: RiwayatBarang[];
  stockOpname: StockOpname[];
  detailStockOpname: DetailStockOpname[];
  logAktivitas: LogAktivitas[];
  chatMessages: ChatMessage[];
  qrCodes: QrCode[];

  // Auth
  login: (email: string, password: string) => User | null;
  logout: () => void;
  register: (nama: string, email: string, password: string) => { ok: boolean; error?: string };
  updateProfile: (patch: Partial<User>) => void;
  assignRole: (role: Role, subRole?: SubRole) => void;
  // Barang
  addBarang: (b: Barang) => void;
  updateBarang: (b: Barang) => void;
  deleteBarang: (id: string) => void;
  // Pengajuan
  addPengajuan: (p: Pengajuan) => void;
  updatePengajuan: (p: Pengajuan) => void;
  // Peminjaman
  addPeminjaman: (p: Peminjaman) => void;
  updatePeminjaman: (p: Peminjaman) => void;
  // Notifikasi
  addNotifikasi: (n: Notifikasi) => void;
  tandaiNotifDibaca: (id: string) => void;
  tandaiSemuaDibaca: () => void;
  // Users
  addUser: (u: User) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;
  mergeUsers: (incoming: User[]) => void;
  // Laporan kerusakan
  addLaporanKerusakan: (lk: LaporanKerusakan) => void;
  updateLaporanKerusakan: (lk: LaporanKerusakan) => void;
  // Maintenance
  addMaintenance: (m: Maintenance) => void;
  updateMaintenance: (m: Maintenance) => void;
  // Stock Opname
  addStockOpname: (so: StockOpname) => void;
  updateStockOpname: (so: StockOpname) => void;
  addDetailStockOpname: (d: DetailStockOpname) => void;
  addLogAktivitas: (l: LogAktivitas) => void;
  addChatMessage: (m: ChatMessage) => void;
  startChat: (contact: ChatContact) => string;
  markChatRead: (threadId: string, side: "user" | "staff") => void;
  addRuangan: (r: Ruangan) => void;
  updateRuangan: (r: Ruangan) => void;
  deleteRuangan: (id: string) => void;
  deleteMaintenance: (id: string) => void;
  addDetailPenghapusan: (d: DetailPenghapusan) => void;
  deleteDetailPenghapusan: (id: string) => void;
  deletePeminjaman: (id: string) => void;
  deletePengajuan: (id: string) => void;
  // Reset
  resetData: () => void;
  setHasHydrated: (v: boolean) => void;
}

const initData = () => {
  const seed = getSeedData();
  return {
    hasHydrated: false,
    currentUser: null,
    users: seed.users,
    barang: seed.barang,
    pengajuan: seed.pengajuan,
    peminjaman: seed.peminjaman,
    notifikasi: seed.notifikasi,
    ruangan: seed.ruangan,
    vendor: seed.vendor,
    laporanKerusakan: seed.laporanKerusakan,
    maintenanceData: seed.maintenanceData,
    detailPenghapusan: seed.detailPenghapusan,
    riwayatBarang: seed.riwayatBarang,
    stockOpname: seed.stockOpname,
    detailStockOpname: seed.detailStockOpname,
    logAktivitas: seed.logAktivitas,
    chatMessages: [],
    qrCodes: seed.qrCodes,
  };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initData(),

      setHasHydrated: (v) => set({ hasHydrated: v }),

      login: (email, password) => {
        const user = get().users.find(
          (u) => u.email === email && u.password === password && u.isActive
        );
        if (!user) return null;
        const userForCookie = { id: user.id, role: user.role, subRole: user.subRole, prodi: user.prodi, gedung: user.gedung };
        if (typeof document !== "undefined") {
          document.cookie = `ft_user=${encodeURIComponent(JSON.stringify(userForCookie))}; path=/; SameSite=Lax`;
        }
        set({ currentUser: user });
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: user.id,
          userNama: user.nama,
          userRole: user.subRole || user.role,
          aktivitas: "Login ke sistem",
          tipe: "login",
          waktu: new Date().toISOString(),
        });
        return user;
      },

      logout: () => {
        if (typeof document !== "undefined") {
          document.cookie = "ft_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        set({ currentUser: null });
      },

      register: (nama, email, password) => {
        const ada = get().users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (ada) return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
        const u: User = { id: "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), nama: nama.trim(), email: email.trim(), password, role: "user", subRole: "mahasiswa", roleSelected: true, isActive: true };
        set((s) => ({ users: [...s.users, u], currentUser: u }));
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: u.id,
          userNama: u.nama,
          userRole: u.subRole,
          aktivitas: "Mendaftar akun baru sebagai Mahasiswa",
          tipe: "create",
          waktu: new Date().toISOString(),
        });
        if (typeof document !== "undefined") {
          document.cookie = `ft_user=${encodeURIComponent(JSON.stringify({ id: u.id, role: u.role, subRole: u.subRole, prodi: u.prodi, gedung: u.gedung }))}; path=/; SameSite=Lax`;
        }
        // simpan ke server agar admin di device lain bisa lihat
        fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "register", user: u }),
        }).catch(() => {});
        return { ok: true };
      },

      updateProfile: (patch) => set((s) => {
        if (!s.currentUser) return {};
        const updated = { ...s.currentUser, ...patch };
        if (typeof document !== "undefined") {
          document.cookie = `ft_user=${encodeURIComponent(JSON.stringify({ id: updated.id, role: updated.role, subRole: updated.subRole, prodi: updated.prodi, gedung: updated.gedung }))}; path=/; SameSite=Lax`;
        }
        return { currentUser: updated, users: s.users.map((x) => (x.id === updated.id ? updated : x)) };
      }),

      assignRole: (role, subRole) => {
        const cu = get().currentUser;
        if (!cu) return;
        const prodiDefault = subRole && ["dosen", "laboran", "kaprodi"].includes(subRole) ? (cu.prodi || "Teknik Industri") : cu.prodi;
        const gedungDefault = role === "pengelola" ? (cu.gedung || "Gedung 1") : cu.gedung;
        const updated: User = { ...cu, role, subRole: role === "user" ? subRole : undefined, prodi: prodiDefault, gedung: gedungDefault, roleSelected: true };
        set((s) => ({ currentUser: updated, users: s.users.map((u) => (u.id === updated.id ? updated : u)) }));
        if (typeof document !== "undefined") {
          document.cookie = `ft_user=${encodeURIComponent(JSON.stringify({ id: updated.id, role: updated.role, subRole: updated.subRole, prodi: updated.prodi, gedung: updated.gedung }))}; path=/; SameSite=Lax`;
        }
      },

      addBarang: (b) => {
        set((s) => ({ barang: [...s.barang, b] }));
        const cu = get().currentUser;
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: b.ditambahkanOleh || cu?.id || "",
          userNama: cu?.nama || "Sistem",
          userRole: cu?.subRole || cu?.role,
          aktivitas: `Menambahkan barang ${b.nama} (${b.kodeUnik})`,
          tipe: "create",
          waktu: new Date().toISOString(),
        });
      },
      updateBarang: (b) => set((s) => ({ barang: s.barang.map((x) => (x.id === b.id ? b : x)) })),
      deleteBarang: (id) => set((s) => ({ barang: s.barang.filter((x) => x.id !== id) })),

      addPengajuan: (p) => {
        set((s) => ({ pengajuan: [...s.pengajuan, p] }));
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: p.pelaporId,
          userNama: p.pelaporNama,
          userRole: p.pelaporSubRole,
          aktivitas: `Mengajukan ${p.jenisPengajuan} untuk ${p.barangNama} (${p.kode})`,
          tipe: "create",
          waktu: new Date().toISOString(),
        });
      },
      updatePengajuan: (p) => {
        set((s) => ({ pengajuan: s.pengajuan.map((x) => (x.id === p.id ? p : x)) }));
        const cu = get().currentUser;
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: cu?.id || "",
          userNama: cu?.nama || "Sistem",
          userRole: cu?.subRole || cu?.role,
          aktivitas: `Status pengajuan ${p.kode} → ${p.status}`,
          tipe: "update",
          waktu: new Date().toISOString(),
        });
      },

      addPeminjaman: (p) => {
        set((s) => ({ peminjaman: [...s.peminjaman, p] }));
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: p.peminjamId,
          userNama: p.peminjamNama,
          userRole: get().currentUser?.subRole || get().currentUser?.role,
          aktivitas: `Meminjam ${p.barangNama}`,
          tipe: "create",
          waktu: new Date().toISOString(),
        });
      },
      updatePeminjaman: (p) => {
        set((s) => ({ peminjaman: s.peminjaman.map((x) => (x.id === p.id ? p : x)) }));
        if (p.status === "dikembalikan") {
          get().addLogAktivitas({
            id: `log-${Date.now()}`,
            userId: p.peminjamId,
            userNama: p.peminjamNama,
            userRole: get().currentUser?.subRole || get().currentUser?.role,
            aktivitas: `Mengembalikan ${p.barangNama}`,
            tipe: "update",
            waktu: new Date().toISOString(),
          });
        }
      },

      addNotifikasi: (n) => set((s) => ({ notifikasi: [n, ...s.notifikasi] })),
      tandaiNotifDibaca: (id) => set((s) => ({ notifikasi: s.notifikasi.map((n) => (n.id === id ? { ...n, dibaca: true } : n)) })),
      tandaiSemuaDibaca: () => set((s) => ({ notifikasi: s.notifikasi.map((n) => ({ ...n, dibaca: true })) })),

      addUser: (u) => set((s) => ({ users: [...s.users, u] })),
      updateUser: (u) => set((s) => ({ users: s.users.map((x) => (x.id === u.id ? u : x)) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((x) => x.id !== id) })),
      mergeUsers: (incoming) => set((s) => {
        const map = new Map(s.users.map((u) => [u.id, u]));
        incoming.forEach((u) => { if (!map.has(u.id)) map.set(u.id, u); });
        return { users: Array.from(map.values()) };
      }),

      addLaporanKerusakan: (lk) => {
        set((s) => ({ laporanKerusakan: [...s.laporanKerusakan, lk] }));
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: lk.pelaporId,
          userNama: lk.pelaporNama,
          userRole: get().currentUser?.subRole || get().currentUser?.role,
          aktivitas: `Melaporkan kerusakan ${lk.barangNama} (${lk.kode})`,
          tipe: "create",
          waktu: new Date().toISOString(),
        });
      },
      updateLaporanKerusakan: (lk) => set((s) => ({ laporanKerusakan: s.laporanKerusakan.map((x) => (x.id === lk.id ? lk : x)) })),

      addMaintenance: (m) => {
        set((s) => ({ maintenanceData: [...s.maintenanceData, m] }));
        const cu = get().currentUser;
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: cu?.id || "",
          userNama: cu?.nama || "Sistem",
          userRole: cu?.subRole || cu?.role,
          aktivitas: `Mengajukan order maintenance ${m.kode} untuk ${m.barangNama}`,
          tipe: "create",
          waktu: new Date().toISOString(),
        });
      },
      updateMaintenance: (m) => set((s) => ({ maintenanceData: s.maintenanceData.map((x) => (x.id === m.id ? m : x)) })),

      addStockOpname: (so) => set((s) => ({ stockOpname: [...s.stockOpname, so] })),
      updateStockOpname: (so) => set((s) => ({ stockOpname: s.stockOpname.map((x) => (x.id === so.id ? so : x)) })),
      addDetailStockOpname: (d) => set((s) => ({ detailStockOpname: [...s.detailStockOpname, d] })),
      addLogAktivitas: (l) => {
        set((s) => ({ logAktivitas: [l, ...s.logAktivitas] }));
        // ID user di localStorage berupa string custom (u-xxxx), gak cocok sama
        // kolom id_user INT di MySQL — kirim null, tapi tetap rekam nama & peran.
        logActivity({
          id_user: null,
          user_nama: l.userNama,
          user_role: l.userRole ?? null,
          aktivitas: l.aktivitas,
          tipe: l.tipe,
        });
      },
      addChatMessage: (m) => set((s) => ({ chatMessages: [...s.chatMessages, m] })),
      startChat: (contact) => {
        const cu = get().currentUser; if (!cu) return "";
        const threadId = `${cu.id}::${contact}`;
        const exists = get().chatMessages.some((m) => m.threadId === threadId);
        if (!exists) {
          const labels: Record<ChatContact, string> = { admin: "Admin Sistem", pengelola: "Penanggung Jawab Ruangan", laboran: "Laboran" };
          const now = new Date().toISOString();
          set((s) => ({ chatMessages: [...s.chatMessages, {
            id: "chat-" + Date.now().toString(36), threadId, userId: cu.id, userNama: cu.nama, contactRole: contact,
            senderId: "", senderNama: labels[contact], fromSide: "bot",
            text: `Halo ${cu.nama.split(" ")[0]}! Anda terhubung dengan ${labels[contact]}. Pesan Anda akan kami terima — mohon tunggu, tim segera membalas. Sampaikan keluhan atau pertanyaan Anda di sini.`,
            waktu: now, dibaca: false,
          }] }));
        }
        return threadId;
      },
      markChatRead: (threadId, side) => set((s) => ({
        chatMessages: s.chatMessages.map((m) => (m.threadId === threadId && m.fromSide !== side ? { ...m, dibaca: true } : m)),
      })),
      addRuangan: (r) => {
        set((s) => ({ ruangan: [...s.ruangan, r] }));
        const cu = get().currentUser;
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: cu?.id || "",
          userNama: cu?.nama || "Sistem",
          userRole: cu?.subRole || cu?.role,
          aktivitas: `Menambahkan ruangan ${r.namaRuang} (${r.kodeRuang})`,
          tipe: "create",
          waktu: new Date().toISOString(),
        });
      },
      updateRuangan: (r) => {
        set((s) => ({ ruangan: s.ruangan.map((x) => (x.id === r.id ? r : x)) }));
        const cu = get().currentUser;
        get().addLogAktivitas({
          id: `log-${Date.now()}`,
          userId: cu?.id || "",
          userNama: cu?.nama || "Sistem",
          userRole: cu?.subRole || cu?.role,
          aktivitas: `Mengubah data ruangan ${r.namaRuang} (${r.kodeRuang})`,
          tipe: "update",
          waktu: new Date().toISOString(),
        });
      },
      deleteRuangan: (id) => set((s) => ({ ruangan: s.ruangan.filter((x) => x.id !== id) })),
      deleteMaintenance: (id) => set((s) => ({ maintenanceData: s.maintenanceData.filter((x) => x.id !== id) })),
      addDetailPenghapusan: (d) => set((s) => ({ detailPenghapusan: [d, ...s.detailPenghapusan] })),
      deleteDetailPenghapusan: (id) => set((s) => ({ detailPenghapusan: s.detailPenghapusan.filter((x) => x.id !== id) })),
      deletePeminjaman: (id) => set((s) => ({ peminjaman: s.peminjaman.filter((x) => x.id !== id) })),
      deletePengajuan: (id) => set((s) => ({ pengajuan: s.pengajuan.filter((x) => x.id !== id) })),

      resetData: () => {
        if (typeof document !== "undefined") {
          document.cookie = "ft_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        set({ ...initData(), hasHydrated: true });
      },
    }),
    {
      name: "ft-uns-inventaris-v3",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (s) => ({
        currentUser: s.currentUser,
        users: s.users,
        barang: s.barang,
        pengajuan: s.pengajuan,
        peminjaman: s.peminjaman,
        notifikasi: s.notifikasi,
        ruangan: s.ruangan,
        laporanKerusakan: s.laporanKerusakan,
        maintenanceData: s.maintenanceData,
        detailPenghapusan: s.detailPenghapusan,
        riwayatBarang: s.riwayatBarang,
        stockOpname: s.stockOpname,
        detailStockOpname: s.detailStockOpname,
        logAktivitas: s.logAktivitas,
        chatMessages: s.chatMessages,
      }),
    }
  )
);

// Demo accounts for login page
export { DEMO_USERS };
