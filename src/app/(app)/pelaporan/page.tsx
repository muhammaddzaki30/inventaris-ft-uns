"use client";
import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { pushRecord } from "@/components/system/sync-engine";
import { cakupanBarang } from "@/lib/permissions";
import { formatRelative, cn, generateId } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import { toast } from "sonner";
import { ClipboardList, Plus, CheckCircle, Clock, Search, X, Camera, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import type { LaporanKerusakan, Pengajuan } from "@/types";

const TINGKAT_CFG: Record<string, { label: string; cls: string }> = {
  ringan: { label: "Ringan", cls: "bg-warning/10 text-warning border-warning/30" },
  sedang: { label: "Sedang", cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  berat:  { label: "Berat",  cls: "bg-destructive/10 text-destructive border-destructive/30" },
  total:  { label: "Total",  cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" },
};

export default function PelaporanPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const barang = useAppStore((s) => s.barang);
  const laporanKerusakan = useAppStore((s) => s.laporanKerusakan);
  const addLaporanKerusakan = useAppStore((s) => s.addLaporanKerusakan);
  const addPengajuan = useAppStore((s) => s.addPengajuan);
  const addNotifikasi = useAppStore((s) => s.addNotifikasi);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ barangId: "", tingkat: "", deskripsi: "" });
  const [fotos, setFotos] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!currentUser) return null;
  const scopedBarang = cakupanBarang(currentUser, barang);
  const myLaporan = laporanKerusakan.filter((l) => l.pelaporId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const filtered = myLaporan.filter((l) => { const q = search.toLowerCase(); return !search || l.barangNama?.toLowerCase().includes(q) || l.kode.toLowerCase().includes(q); });
  const selectedBarang = scopedBarang.find((b) => b.id === form.barangId);
  const isFormValid = form.barangId && form.tingkat && form.deskripsi.length >= 10;

  const handleFiles = (files: FileList | null) => {
    try {
      if (!files || !files.length) return;
      const imgs = Array.from(files).filter((f) => f.type && f.type.startsWith("image/"));
      if (!imgs.length) { toast.error("Tidak ada gambar pada pilihan tersebut"); return; }
      const slots = Math.max(0, 6 - fotos.length);
      if (slots === 0) { toast.error("Maksimal 6 foto bukti"); return; }
      const picked = imgs.slice(0, slots);
      const compress = (f: File) => new Promise<string>((res) => {
        try {
          const url = URL.createObjectURL(f);
          const img = new Image();
          img.onload = () => {
            try {
              const MAX = 1024;
              let width = img.width, height = img.height;
              if (width > height && width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
              else if (height >= width && height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
              const canvas = document.createElement("canvas");
              canvas.width = width; canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) { URL.revokeObjectURL(url); return res(""); }
              ctx.drawImage(img, 0, 0, width, height);
              const out = canvas.toDataURL("image/jpeg", 0.7);
              URL.revokeObjectURL(url);
              res(out && out.length > 12 ? out : "");
            } catch { URL.revokeObjectURL(url); res(""); }
          };
          img.onerror = () => { URL.revokeObjectURL(url); res(""); };
          img.src = url;
        } catch { res(""); }
      });
      Promise.all(picked.map(compress)).then((urls) => {
        const valid = urls.filter(Boolean);
        if (!valid.length) { toast.error("Gagal membaca berkas gambar"); return; }
        setFotos((prev) => [...prev, ...valid].slice(0, 6));
        toast.success(`${valid.length} foto bukti ditambahkan`, { description: "Foto siap dilampirkan ke laporan." });
      }).catch(() => toast.error("Gagal membaca berkas"));
    } catch { toast.error("Terjadi kesalahan saat memuat foto"); }
  };
  const removeFoto = (i: number) => setFotos((prev) => prev.filter((_, idx) => idx !== i));
  const resetForm = () => { setForm({ barangId: "", tingkat: "", deskripsi: "" }); setFotos([]); setStep(1); };

  const handleSubmit = () => {
    if (!isFormValid || !selectedBarang || !currentUser) return;
    setLoading(true);
    const now = new Date().toISOString();
    const lkId = generateId("lk");
    const pjId = generateId("pj");
    const newLk: LaporanKerusakan = {
      id: lkId, kode: `LK-${Date.now().toString().slice(-6)}`,
      barangId: form.barangId, barangNama: selectedBarang.nama, barangKodeUnik: selectedBarang.kodeUnik,
      gedung: selectedBarang.gedung, ruanganId: selectedBarang.ruanganId, tanggalLapor: now,
      deskripsi: form.deskripsi, fotoBukti: fotos, tingkatKerusakan: form.tingkat as LaporanKerusakan["tingkatKerusakan"],
      pelaporId: currentUser.id, pelaporNama: currentUser.nama, sudahDiajukan: true, pengajuanId: pjId, createdAt: now,
    };
    const newPj: Pengajuan = {
      id: pjId, kode: `PJ-${Date.now().toString().slice(-6)}`,
      barangId: form.barangId, barangNama: selectedBarang.nama, barangKodeUnik: selectedBarang.kodeUnik,
      gedung: selectedBarang.gedung, pelaporId: currentUser.id, pelaporNama: currentUser.nama,
      pelaporSubRole: currentUser.subRole || "mahasiswa", tanggal: now, createdAt: now,
      jenisPengajuan: form.tingkat === "total" ? "penggantian" : "perbaikan",
      prioritas: form.tingkat === "total" || form.tingkat === "berat" ? "kritis" : form.tingkat === "sedang" ? "tinggi" : "sedang",
      keterangan: form.deskripsi, fotoKondisi: fotos, estimasiBiaya: 0, status: "diajukan", riwayatVerifikasi: [],
      laporanKerusakanId: lkId, tingkatKerusakan: form.tingkat as Pengajuan["tingkatKerusakan"],
    };
    addLaporanKerusakan(newLk);
    addPengajuan(newPj);
    pushRecord("laporanKerusakan", newLk);
    pushRecord("pengajuan", newPj);
    addNotifikasi({ id: generateId("n"), tipe: "laporan", judul: "Laporan Baru Masuk", pesan: `${currentUser.nama} melaporkan kerusakan ${selectedBarang.nama}`, waktu: now, dibaca: false, refId: pjId, untukRole: "pengelola", untukGedung: selectedBarang.gedung });
    toast.success("Laporan berhasil dikirim", { description: "Pengajuan otomatis dibuat untuk ditindaklanjuti" });
    resetForm(); setOpen(false); setLoading(false);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <div><p className="eyebrow mb-1">Lapor Kerusakan</p><h1 className="text-h1">Pelaporan</h1></div>
        <Button onClick={() => setOpen(true)} className="gap-2 glow-primary rounded-xl"><Plus size={15} />Buat Laporan</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Total Laporan",  val:myLaporan.length,                            color:"text-brand-600", bg:"bg-brand-600/10 border-brand-600/20" },
          { label:"Sudah Diproses", val:myLaporan.filter(l=>l.sudahDiajukan).length, color:"text-success",   bg:"bg-success/10 border-success/20" },
          { label:"Belum Diproses", val:myLaporan.filter(l=>!l.sudahDiajukan).length,color:"text-warning",   bg:"bg-warning/10 border-warning/20" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`p-3.5 rounded-xl border text-center ${bg}`}><p className={`text-2xl font-black tabular ${color}`}>{val}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p></div>
        ))}
      </div>

      <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari laporan…" className="pl-9 h-10 text-sm rounded-xl" /></div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Belum ada laporan" description="Mulai dengan menekan tombol Buat Laporan." action={<Button size="sm" onClick={() => setOpen(true)}>Buat Laporan Pertama</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((l, i) => {
            const tCfg = TINGKAT_CFG[l.tingkatKerusakan] || TINGKAT_CFG.ringan;
            return (
              <div key={l.id} className="card-hover rounded-2xl p-4 flex gap-4 items-start animate-fade-up" style={{ animationDelay: `${Math.min(i,8)*30}ms` }}>
                <div className={cn("p-2.5 rounded-xl flex-shrink-0", l.sudahDiajukan ? "bg-success/10" : "bg-warning/10")}>{l.sudahDiajukan ? <CheckCircle size={16} className="text-success" /> : <Clock size={16} className="text-warning" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="code-tag">{l.kode}</span>
                    <Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg", tCfg.cls)}>Rusak {tCfg.label}</Badge>
                    {l.sudahDiajukan && <Badge className="text-[10px] border-0 bg-success/10 text-success rounded-lg"><CheckCircle size={9} className="mr-1" />Diproses</Badge>}
                  </div>
                  <p className="font-bold text-sm">{l.barangNama}</p>
                  {l.barangKodeUnik && <p className="mono text-[11px] text-muted-foreground">{l.barangKodeUnik}</p>}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.deskripsi}</p>
                  {l.fotoBukti.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {l.fotoBukti.slice(0,4).map((src, idx) => <img key={idx} src={src} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />)}
                      {l.fotoBukti.length > 4 && <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">+{l.fotoBukti.length-4}</div>}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">{formatRelative(l.createdAt)} · {l.gedung}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList size={16} />Laporan Kerusakan</DialogTitle>
            <DialogDescription>Langkah {step} dari 2 — {step === 1 ? "Pilih barang" : "Detail & foto"}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">{[1,2].map((s) => <div key={s} className={cn("flex-1 h-1.5 rounded-full transition-colors duration-300", s <= step ? "bg-brand-600" : "bg-muted")} />)}</div>

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Pilih Barang</Label>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" role="combobox" className="w-full flex items-center justify-between gap-2 rounded-xl border border-input bg-background px-3.5 h-11 text-sm hover:bg-muted/40 transition-colors">
                      {selectedBarang
                        ? <span className="truncate text-left"><span className="font-semibold">{selectedBarang.nama}</span> <span className="mono text-[11px] text-muted-foreground">{selectedBarang.kodeUnik}</span></span>
                        : <span className="text-muted-foreground">Cari & pilih barang…</span>}
                      <ChevronsUpDown size={14} className="text-muted-foreground flex-shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-floating" align="start">
                    <Command>
                      <CommandInput placeholder="Ketik nama, kode unik, atau merek…" />
                      <CommandList>
                        <CommandEmpty>Barang tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {scopedBarang.filter(b=>b.kondisi !== "hilang").map((b) => (
                            <CommandItem key={b.id} value={`${b.nama} ${b.kodeUnik} ${b.kode} ${b.merek ?? ""}`} onSelect={() => { setForm((f) => ({ ...f, barangId: b.id })); setPickerOpen(false); }}>
                              <Check size={14} className={cn("flex-shrink-0", form.barangId === b.id ? "opacity-100 text-brand-600" : "opacity-0")} />
                              <div className="min-w-0"><p className="text-sm font-medium truncate">{b.nama}</p><p className="text-[11px] text-muted-foreground mono truncate">{b.kodeUnik} · {b.ruangan}</p></div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {selectedBarang && <div className="p-3 rounded-xl bg-muted/60 text-sm"><p className="font-semibold">{selectedBarang.nama}</p><p className="text-xs text-muted-foreground mt-0.5"><span className="mono">{selectedBarang.kodeUnik}</span> · {selectedBarang.ruangan} · {selectedBarang.gedung}</p></div>}
            </div>
          ) : (
            <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Tingkat Kerusakan</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TINGKAT_CFG).map(([v, { label, cls }]) => (
                    <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, tingkat: v }))}
                      className={cn("p-3 rounded-xl border text-sm font-semibold transition-all duration-200", form.tingkat === v ? cn(cls, "ring-2 ring-current/40 scale-[1.02]") : "bg-muted/50 border-border hover:bg-muted hover:scale-[1.01]")}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Deskripsi Kerusakan <span className="text-muted-foreground font-normal">(min. 10 karakter)</span></Label>
                <Textarea value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))} placeholder="Deskripsikan kerusakan secara detail…" rows={3} className="text-sm resize-none rounded-xl" />
                <p className="text-[10px] text-muted-foreground mt-1 tabular">{form.deskripsi.length} karakter</p>
              </div>

              {/* UPLOAD FOTO */}
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Foto Bukti <span className="text-muted-foreground font-normal">(opsional, maks. 6)</span></Label>
                {fotos.length === 0 ? (
                  <label className="w-full cursor-pointer border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-950/30 transition-colors group">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
                    <div className="w-11 h-11 rounded-xl bg-brand-600/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Camera size={20} className="text-brand-600" /></div>
                    <p className="text-sm font-semibold">Tambahkan foto bukti</p>
                    <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP — dari galeri atau kamera</p>
                  </label>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map((src, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                        <img src={src} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeFoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={13} /></button>
                      </div>
                    ))}
                    {fotos.length < 6 && (
                      <label className="aspect-square cursor-pointer rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-brand-400 hover:bg-muted/50 transition-colors text-muted-foreground">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
                        <Plus size={18} /><span className="text-[10px] font-medium">Tambah</span>
                      </label>
                    )}
                  </div>
                )}

                {fotos.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 border border-success/25 text-success">
                    <CheckCircle size={14} className="flex-shrink-0" />
                    <p className="text-xs font-semibold">{fotos.length} foto bukti siap dilampirkan ke laporan</p>
                  </div>
                )}

              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step === 2 && <Button variant="outline" size="sm" onClick={() => setStep(1)}>Kembali</Button>}
            {step === 1
              ? <Button size="sm" onClick={() => setStep(2)} disabled={!form.barangId}>Lanjut</Button>
              : <Button size="sm" onClick={handleSubmit} disabled={!isFormValid || loading}>{loading ? "Mengirim…" : "Kirim Laporan"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
