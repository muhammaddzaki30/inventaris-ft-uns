"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/store/use-app-store";
import { pushRecord } from "@/components/system/sync-engine";
import { cakupanBarang, cakupanPeminjaman, bisaLihatNilaiAset } from "@/lib/permissions";
import { formatTanggal, formatRelative, cn, generateId } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailDialog } from "@/components/common/detail-dialog";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import { toast } from "sonner";
import { Repeat2, Plus, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, AlertTriangle, Search } from "lucide-react";
import type { Peminjaman } from "@/types";

export default function PeminjamanPage() {
  const currentUser     = useAppStore((s) => s.currentUser);
  const barang          = useAppStore((s) => s.barang);
  const peminjaman      = useAppStore((s) => s.peminjaman);
  const addPeminjaman   = useAppStore((s) => s.addPeminjaman);
  const updatePeminjaman= useAppStore((s) => s.updatePeminjaman);
  const updateBarang    = useAppStore((s) => s.updateBarang);
  const deletePeminjaman = useAppStore((s) => s.deletePeminjaman);
  const addLog          = useAppStore((s) => s.addLogAktivitas);
  const [mode, setMode] = useState<"pinjam"|"kembali">("pinjam");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Peminjaman | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ barangId: "", tanggalPinjam: new Date().toISOString().split("T")[0], rencanaKembali: "", keperluan: "" });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detail, setDetail] = useState<(typeof filtered)[number] | null>(null);
  const [confirmDel, setConfirmDel] = useState<(typeof filtered)[number] | null>(null);
  const bisaKelolaPinjam = !!currentUser && (currentUser.role === "admin" || currentUser.role === "pengelola" || ["laboran","kaprodi"].includes(currentUser.subRole || ""));
  const [catatanKembali, setCatatanKembali] = useState("");

  if (!currentUser) return null;
  const scopedBarang   = cakupanBarang(currentUser, barang);
  const scopedPinjaman = cakupanPeminjaman(currentUser, peminjaman);
  const tersedia = scopedBarang.filter((b) => b.statusPeminjaman === "tersedia" && b.kondisi === "baik");

  const filtered = useMemo(() => scopedPinjaman.filter((p) => {
    const q = search.toLowerCase();
    const ms = !search || p.barangNama?.toLowerCase().includes(q) || p.peminjamNama.toLowerCase().includes(q);
    return ms && (mode === "pinjam" ? p.status === "dipinjam" : p.status === "dikembalikan");
  }), [scopedPinjaman, search, mode]);

  const aktiveDipinjam = scopedPinjaman.filter((p) => p.status === "dipinjam" && p.peminjamId === currentUser.id);
  const terlambat = aktiveDipinjam.filter((p) => new Date(p.rencanaKembali) < new Date());

  const handlePinjam = () => {
    if (!form.barangId || !form.rencanaKembali || !form.keperluan) return;
    setLoading(true);
    const brg = scopedBarang.find((b) => b.id === form.barangId);
    if (!brg) { setLoading(false); return; }
    if (brg.kondisi !== "baik") { toast.error("Barang tidak dapat dipinjam", { description: `Kondisi ${brg.nama} saat ini: ${brg.kondisi.replace("_", " ")}. Hanya barang kondisi Baik yang bisa dipinjam.` }); setLoading(false); return; }
    if (brg.statusPeminjaman === "dipinjam") { toast.error("Barang sedang dipinjam orang lain"); setLoading(false); return; }
    const now = new Date().toISOString();
    const newPm: Peminjaman = {
      id: generateId("pm"), barangId: form.barangId, barangNama: brg.nama, barangKodeUnik: brg.kodeUnik,
      gedung: brg.gedung, peminjamId: currentUser.id, peminjamNama: currentUser.nama,
      tanggalPinjam: form.tanggalPinjam, rencanaKembali: form.rencanaKembali, keperluan: form.keperluan,
      status: "dipinjam", createdAt: now,
    };
    addPeminjaman(newPm);
    updateBarang({ ...brg, statusPeminjaman: "dipinjam" });
    toast.success(`${brg.nama} berhasil dipinjam!`);
    setForm({ barangId:"", tanggalPinjam:new Date().toISOString().split("T")[0], rencanaKembali:"", keperluan:"" });
    setOpen(false); setLoading(false);
  };

  const handleKembali = () => {
    if (!selected) return;
    setLoading(true);
    const brg = barang.find((b) => b.id === selected.barangId);
    const now = new Date().toISOString();
    updatePeminjaman({ ...selected, status: "dikembalikan", tanggalKembaliAktual: now, kondisiKembali: "baik", catatanKembali });
    if (brg) updateBarang({ ...brg, statusPeminjaman: "tersedia" });
    toast.success("Pengembalian berhasil dicatat!");
    setSelected(null); setCatatanKembali(""); setLoading(false);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Sirkulasi</p>
          <h1 className="text-h1">Peminjaman & Pengembalian</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola peminjaman barang inventaris</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 glow-primary"><Plus size={15}/>Pinjam Barang</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Sedang Dipinjam", val:scopedPinjaman.filter(p=>p.status==="dipinjam").length, color:"text-brand-600", bg:"bg-brand-600/10 border-brand-600/20" },
          { label:"Pinjaman Saya",   val:aktiveDipinjam.length, color:"text-info",        bg:"bg-info/10 border-info/20" },
          { label:"Terlambat",        val:terlambat.length,      color:"text-destructive", bg:"bg-destructive/10 border-destructive/20" },
          { label:"Dikembalikan",     val:scopedPinjaman.filter(p=>p.status==="dikembalikan").length, color:"text-success", bg:"bg-success/10 border-success/20" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`p-3 rounded-xl border text-center ${bg}`}>
            <p className={`text-2xl font-black tabular-nums ${color}`}>{val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Terlambat alert */}
      {terlambat.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/8 border border-destructive/25">
          <AlertTriangle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">{terlambat.length} peminjaman melewati batas waktu</p>
            <p className="text-xs text-destructive/70 mt-0.5">Segera kembalikan barang tersebut</p>
          </div>
        </div>
      )}

      {/* Tab */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {([["pinjam","Aktif Dipinjam"],["kembali","Dikembalikan"]] as const).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-semibold transition-all", mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari barang atau peminjam..." className="pl-9 h-9 text-sm" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={Repeat2} title={mode === "pinjam" ? "Tidak ada peminjaman aktif" : "Belum ada pengembalian"} description="Data akan muncul di sini." />
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const overdue = p.status === "dipinjam" && new Date(p.rencanaKembali) < new Date();
            const isMine = p.peminjamId === currentUser.id;
            return (
              <div key={p.id} role="button" onClick={() => setDetail(p)}
                className={cn("bg-card rounded-2xl border p-4 flex gap-4 items-start animate-fade-up cursor-pointer card-hover",
                  overdue ? "border-destructive/30 bg-destructive/[0.02]" : "border-border")}
                style={{ animationDelay: `${Math.min(i,8)*30}ms` }}>
                <div className={cn("p-2 rounded-xl flex-shrink-0", p.status === "dipinjam" ? "bg-brand-600/10" : "bg-success/10")}>
                  {p.status === "dipinjam" ? <ArrowDownCircle size={16} className="text-brand-600" /> : <ArrowUpCircle size={16} className="text-success" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg", p.status==="dipinjam"?"bg-brand-600/10 text-brand-600 border-brand-600/20":"bg-success/10 text-success border-success/20")}>
                      {p.status === "dipinjam" ? <Clock size={9} className="mr-1" /> : <CheckCircle size={9} className="mr-1" />}
                      {p.status === "dipinjam" ? "Dipinjam" : "Dikembalikan"}
                    </Badge>
                    {overdue && <Badge className="text-[10px] bg-destructive text-white border-0"><AlertTriangle size={9} className="mr-1"/>Terlambat</Badge>}
                  </div>
                  <p className="font-bold text-sm">{p.barangNama}</p>
                  {p.barangKodeUnik && <p className="font-mono text-[11px] text-muted-foreground">{p.barangKodeUnik}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">Oleh: {p.peminjamNama}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Keperluan: {p.keperluan}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
                    <span>Pinjam: {formatTanggal(p.tanggalPinjam)}</span>
                    <span className={overdue ? "text-destructive font-semibold" : ""}>Kembali: {formatTanggal(p.rencanaKembali)}</span>
                  </div>
                </div>
                {p.status === "dipinjam" && isMine && (
                  <Button size="sm" variant="outline" className="flex-shrink-0 text-xs" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>Kembalikan</Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Pinjam */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pinjam Barang</DialogTitle>
            <DialogDescription>Isi form peminjaman barang inventaris</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Barang yang Dipinjam</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button type="button" role="combobox" className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 h-9 text-sm hover:bg-muted/40 transition-colors">
                    {(() => { const sb = tersedia.find((b) => b.id === form.barangId); return sb ? <span className="truncate text-left"><span className="font-semibold">{sb.nama}</span> <span className="mono text-[11px] text-muted-foreground">{sb.kodeUnik}</span></span> : <span className="text-muted-foreground">Cari & pilih barang…</span>; })()}
                    <ChevronsUpDown size={14} className="text-muted-foreground flex-shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Ketik nama, kode unik, atau merek…" />
                    <CommandList>
                      <CommandEmpty>Barang tersedia tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {tersedia.map((b) => (
                          <CommandItem key={b.id} value={`${b.nama} ${b.kodeUnik} ${b.merek ?? ""}`} onSelect={() => { setForm((f) => ({ ...f, barangId: b.id })); setPickerOpen(false); }}>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Tanggal Pinjam</Label>
                <Input type="date" value={form.tanggalPinjam} onChange={(e) => setForm((f) => ({ ...f, tanggalPinjam: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Rencana Kembali</Label>
                <Input type="date" value={form.rencanaKembali} onChange={(e) => setForm((f) => ({ ...f, rencanaKembali: e.target.value }))} min={form.tanggalPinjam} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Keperluan</Label>
              <Textarea value={form.keperluan} onChange={(e) => setForm((f) => ({ ...f, keperluan: e.target.value }))} placeholder="Jelaskan keperluan peminjaman..." rows={3} className="text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handlePinjam} disabled={!form.barangId || !form.rencanaKembali || !form.keperluan || loading}>
              {loading ? "Memproses..." : "Konfirmasi Pinjam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Kembali */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setCatatanKembali(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pengembalian</DialogTitle>
            <DialogDescription>Kembalikan {selected?.barangNama}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-muted/50 text-sm space-y-1">
              <p className="font-semibold">{selected?.barangNama}</p>
              <p className="text-xs text-muted-foreground">Dipinjam: {selected && formatTanggal(selected.tanggalPinjam)}</p>
              <p className="text-xs text-muted-foreground">Rencana kembali: {selected && formatTanggal(selected.rencanaKembali)}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Catatan (opsional)</Label>
              <Textarea value={catatanKembali} onChange={(e) => setCatatanKembali(e.target.value)} placeholder="Kondisi barang saat dikembalikan..." rows={3} className="text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Batal</Button>
            <Button size="sm" onClick={handleKembali} disabled={loading}>{loading ? "Memproses..." : "Konfirmasi Kembali"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DetailDialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail?.barangNama || "Detail Peminjaman"} subtitle={detail?.barangKodeUnik} icon={Repeat2}
        badges={detail && <Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg", detail.status==="dipinjam"?"bg-brand-600/10 text-brand-600 border-brand-600/20":"bg-success/10 text-success border-success/20")}>{detail.status==="dipinjam"?"Dipinjam":"Dikembalikan"}</Badge>}
        rows={detail ? [
          { label:"Kode Unik", value:detail.barangKodeUnik || "—", mono:true },
          { label:"Peminjam", value:detail.peminjamNama },
          { label:"Tanggal Pinjam", value:formatTanggal(detail.tanggalPinjam) },
          { label:"Rencana Kembali", value:formatTanggal(detail.rencanaKembali) },
          ...(detail.tanggalKembali ? [{ label:"Tanggal Kembali", value:formatTanggal(detail.tanggalKembali) }] : []),
          { label:"Keperluan", value:detail.keperluan, full:true },
          ...(detail.catatanKembali ? [{ label:"Catatan Pengembalian", value:detail.catatanKembali, full:true }] : []),
        ] : []}
        footer={detail && (bisaKelolaPinjam || detail.peminjamId === currentUser.id) && (<Button variant="outline" size="sm" className="w-full rounded-xl gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setConfirmDel(detail); setDetail(null); }}><Trash2 size={13} />Hapus Catatan Peminjaman</Button>)}
      />
      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} title="Hapus catatan peminjaman?" description={confirmDel ? `Peminjaman ${confirmDel.barangNama} oleh ${confirmDel.peminjamNama} akan dihapus.` : ""} confirmText="Ya, Hapus" onConfirm={() => { if (confirmDel) { const now = new Date().toISOString(); if (confirmDel.status === "dipinjam") { const b = barang.find((x) => x.id === confirmDel.barangId); if (b) updateBarang({ ...b, statusPeminjaman: "tersedia" }); } deletePeminjaman(confirmDel.id); addLog({ id:`log-${Date.now()}`, userId:currentUser.id, userNama:currentUser.nama, userRole:currentUser.subRole||currentUser.role, aktivitas:`Menghapus catatan peminjaman ${confirmDel.barangNama}`, tipe:"delete", waktu:now }); toast.success("Catatan peminjaman dihapus"); setConfirmDel(null); } }} />
    </div>
  );
}
