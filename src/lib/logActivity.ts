// src/lib/logActivity.ts
type LogActivityParams = {
  id_user?: string | number | null;
  user_nama?: string;
  user_role?: string | null;
  aktivitas: string;
  tipe?: string;
};

export function logActivity(params: LogActivityParams) {
  // Fire-and-forget — gak nge-block UI, gak throw kalau gagal.
  // ID user di localStorage berupa string custom (u-xxxx), gak cocok sama
  // kolom id_user INT di MySQL — selalu kirim null di situ, tapi tetap
  // rekam nama & peran biar log tetap kebaca "siapa ngapain".
  try {
    fetch("/api/log-aktivitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_user: null,
        user_nama: params.user_nama ?? "Sistem",
        user_role: params.user_role ?? null,
        aktivitas: params.aktivitas,
        tipe: params.tipe ?? "lainnya",
      }),
      keepalive: true, // tetap kekirim walau user langsung pindah halaman
    }).catch(() => { /* diamkan — logging gak boleh ganggu UX */ });
  } catch {
    /* diamkan */
  }
}
