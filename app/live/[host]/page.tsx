'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation' 
import { supabase } from '../../../lib/supabase' 
import * as XLSX from 'xlsx'

export default function DynamicLiveReportPage() {
  const params = useParams()
  const host = params.host as string 

  const tableName = `live_reports_${host}`
  const displayName = host ? host.replace(/_/g, ' ').toUpperCase() : ''

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [laporanWaktu, setLaporanWaktu] = useState<any[]>([])
  const [totalTerbayar, setTotalTerbayar] = useState(0)
  
  // STATE BARU UNTUK STATISTIK HARI INI, KEMARIN, MINGGU, BULAN
  const [statsPeriode, setStatsPeriode] = useState({ today: 0, yesterday: 0, week: 0, month: 0 })

  // --- STATE UNTUK MODAL UPLOAD ---
  const [showModalUpload, setShowModalUpload] = useState(false)
  const [pinUpload, setPinUpload] = useState('')
  const [tempFile, setTempFile] = useState<File | null>(null)

  // --- STATE UNTUK MODAL LUNASI BATCH ---
  const [showModalLunasi, setShowModalLunasi] = useState(false)
  const [pinLunasi, setPinLunasi] = useState('')
  const [tempWaktu, setTempWaktu] = useState<string>('')

  // --- STATE UNTUK PENCARIAN ID PESANAN ---
  const [searchQuery, setSearchQuery] = useState('')

  async function getData() {
    setLoading(true)

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', {
        ascending: true,
      })

    if (!error && data) {
      const orderIds = data.map((item) => item.order_id).filter(Boolean)
      const pengirimanMap = new Map()

      if (orderIds.length > 0) {
        const { data: pengirimanData, error: errPengiriman } = await supabase
          .from('data_pengiriman')
          .select('order_id, created_time, paid_time, variation, payment_method, creator_handle')
          .in('order_id', orderIds)

        if (!errPengiriman && pengirimanData) {
          pengirimanData.forEach((p) => {
            pengirimanMap.set(p.order_id, {
              created_time: p.created_time, 
              paid_time: p.paid_time, 
              variation: p.variation,
              payment_method: p.payment_method,
              creator_handle: p.creator_handle,
            })
          })
        }
      }

      const mergedData = data.map((item) => {
        const infoPengiriman = pengirimanMap.get(item.order_id)
        
        let waktuDibuat = null;
        if (infoPengiriman) {
          const payMethod = infoPengiriman.payment_method || '';
          if (payMethod.toLowerCase().includes('bayar di tempat')) {
            waktuDibuat = infoPengiriman.created_time;
          } else {
            waktuDibuat = infoPengiriman.paid_time;
          }
        }

        return {
          ...item,
          waktu_orderan_dibuat: waktuDibuat,
          variasi_produk: infoPengiriman?.variation || '-',
          payment_method: infoPengiriman?.payment_method || '-',
          creator_handle: infoPengiriman?.creator_handle || '-',
        }
      })

      setData(mergedData) 

      let countToday = 0;
      let countYesterday = 0;
      let countWeek = 0;
      let countMonth = 0;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

      mergedData.forEach((item) => {
        let dateToUse = item.waktu_orderan_dibuat || item.created_at;
        if (!dateToUse) return;

        let validString = String(dateToUse).replace(' ', 'T');
        if (!validString.includes('Z') && !validString.includes('+')) {
          validString += 'Z';
        }
        const d = new Date(validString);
        if (isNaN(d.getTime())) return;

        if (d >= startOfToday) countToday++;
        else if (d >= startOfYesterday && d < startOfToday) countYesterday++;
        if (d >= startOfWeek) countWeek++;
        if (d >= startOfMonth) countMonth++;
      });

      setStatsPeriode({ today: countToday, yesterday: countYesterday, week: countWeek, month: countMonth });

      const totalBayarSemua = mergedData.reduce((sum, item) => {
        if (item.status && item.status.includes('TERBAYAR')) {
          const angka = Number(item.total_pendapatan?.toString().replace(/[^\d-]/g, ''))
          return sum + (angka || 0)
        }
        return sum
      }, 0)

      setTotalTerbayar(totalBayarSemua)

      const group: any = {}

      mergedData.forEach((item) => {
        if (item.status && item.status.includes('TERBAYAR')) {
          const waktu = item.status
          const angka = Number(item.total_pendapatan?.toString().replace(/[^\d-]/g, ''))

          if (!group[waktu]) group[waktu] = { total: 0, jumlahPesanan: 0 }

          group[waktu].total += angka || 0
          group[waktu].jumlahPesanan += 1
        }
      })

      const hasilGroup = Object.entries(group).map(([waktu, value]: any) => ({
        waktu,
        total: value.total,
        jumlahPesanan: value.jumlahPesanan,
      }))

      setLaporanWaktu(hasilGroup.reverse())
    }

    setLoading(false)
  }

  useEffect(() => {
    if (host) getData()
  }, [host])

  function formatRupiah(angka: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(angka)
  }

  function formatTanggal(rawString: string) {
    if (!rawString) return '-';
    let validString = rawString.replace(' ', 'T');
    if (!validString.includes('Z') && !validString.includes('+')) {
      validString += 'Z';
    }
    const date = new Date(validString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta', 
    }).format(date);
  }

  function exportBelumTerbayar() {
    const belumTerbayar = data.filter((item) => !item.status || !item.status.includes('TERBAYAR'))
    if (belumTerbayar.length === 0) {
      alert('Tidak ada data belum terbayar')
      return
    }

    const exportData = belumTerbayar.map((item, index) => ({
      NO: index + 1,
      'ID Pesanan': item.order_id,
      TOKO: item.toko,
      'Total Pendapatan': item.total_pendapatan,
      STATUS: item.status || 'BELUM DIBAYAR',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Belum Dibayar')

    const tanggal = new Date().toLocaleDateString('id-ID').replace(/\//g, '-')
    const formatNamaFile = host.replace(/_/g, '-').toUpperCase()
    const namaFile = `${formatNamaFile}-BELUM-DIBAYAR-${tanggal}.xlsx`

    XLSX.writeFile(workbook, namaFile)
  }

  function handleSelectFileExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setTempFile(file)
    setShowModalUpload(true)
    event.target.value = ''
  }

  async function prosesUploadExcel() {
    if (pinUpload !== '!@#$%') {
      alert('PIN salah')
      setPinUpload('')
      return
    }

    setShowModalUpload(false)
    setPinUpload('')
    if (!tempFile) return
    setLoading(true)

    const buffer = await tempFile.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

    for (const item of jsonData) {
      const orderId = item['ID Pesanan/Penyesuaian']?.toString()
      if (!orderId) continue

      const { data: existing } = await supabase
        .from(tableName)
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle()

      if (existing) continue

      await supabase.from(tableName).insert([
        {
          nomor: item['NO']?.toString() || '',
          order_id: orderId,
          toko: item['TOKO']?.toString() || '',
          total_pendapatan: item['Total Pendapatan']?.toString() || '',
          status: item['STATUS']?.toString() || '',
        },
      ])
    }

    alert(`Upload data ${displayName} selesai tanpa duplicate`)
    setTempFile(null)
    getData()
    setLoading(false)
  }

  function handleKlikLunasi(waktu: string) {
    setTempWaktu(waktu)
    setShowModalLunasi(true)
  }

  async function prosesLunasiBatch() {
    if (pinLunasi !== '123') {
      alert('Password salah')
      setPinLunasi('')
      return
    }

    setShowModalLunasi(false)
    setPinLunasi('')

    const { data: rows } = await supabase
      .from(tableName)
      .select('*')
      .eq('status', tempWaktu)

    if (!rows || rows.length === 0) {
      alert('Data tidak ditemukan')
      return
    }

    await supabase.from(tableName).delete().eq('status', tempWaktu)
    alert(`Batch ${displayName} berhasil dilunasi`)
    getData()
  }

  const filteredData = data.filter((item) => {
    if (searchQuery === '') return true
    return item.order_id?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (!host) return <div className="min-h-screen bg-gray-50" />

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 relative font-sans text-gray-900">
      
      {/* MODAL UPLOAD EXCEL */}
      {showModalUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Masukkan PIN Upload
            </h3>
            <input
              type="password"
              placeholder="•••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              value={pinUpload}
              onChange={(e) => setPinUpload(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') prosesUploadExcel()
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModalUpload(false)
                  setPinUpload('')
                  setTempFile(null)
                }}
                className="px-4 py-2.5 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={prosesUploadExcel}
                className="bg-gray-900 hover:bg-gray-800 transition-colors text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm"
              >
                Upload Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LUNASI */}
      {showModalLunasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Konfirmasi Pelunasan
            </h3>
            <input
              type="password"
              placeholder="Masukkan Password"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              value={pinLunasi}
              onChange={(e) => setPinLunasi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') prosesLunasiBatch()
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModalLunasi(false)
                  setPinLunasi('')
                }}
                className="px-4 py-2.5 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={prosesLunasiBatch}
                className="bg-gray-900 hover:bg-gray-800 transition-colors text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm"
              >
                Lunasi Batch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="bg-white border border-gray-200/60 rounded-3xl p-6 md:p-8 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-1">
                Live Report Dashboard
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Data Kinerja {displayName}
              </h1>
              <p className="text-gray-500 mt-1.5 text-sm">
                Monitoring *realtime* hasil penjualan live dan status pembayaran pesanan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={exportBelumTerbayar}
                className="bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                Export Tertunda
              </button>

              <label className="bg-gray-900 hover:bg-gray-800 transition-all text-white px-5 py-2.5 rounded-xl cursor-pointer text-sm font-medium shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleSelectFileExcel}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* BANNER MOTIVASI PERFORMA MINGGUAN / BULANAN (GRAFIK MINI) */}
        {data.length > 0 && (
          <div className="mb-6">
            {(() => {
              const diff = statsPeriode.today - statsPeriode.yesterday;
              
              let bgColor = "from-slate-800 to-slate-900";
              let title = "Performa Stabil";
              let icon = "🎯";
              let desc = `Hari ini pesanan sama dengan kemarin. Evaluasi strategi untuk menaikkan grafik.`;
              
              if (diff > 0) {
                bgColor = "from-gray-800 to-gray-900"; // Tetap profesional
                title = "Tren Positif";
                icon = "📈";
                desc = `Hari ini naik ${diff} pesanan dibandingkan kemarin. Pertahankan ritme penjualan yang baik ini.`;
              } else if (diff < 0) {
                bgColor = "from-gray-800 to-gray-900";
                title = "Tren Menurun";
                icon = "📉";
                desc = `Hari ini turun ${Math.abs(diff)} pesanan dibandingkan kemarin. Waktunya meninjau kembali promosi.`;
              }

              return (
                <div className={`bg-gradient-to-r ${bgColor} rounded-3xl p-6 md:p-8 text-white shadow-md transition-all`}>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold mb-1.5 flex items-center gap-2">
                        {title}
                        <span className="text-2xl">{icon}</span>
                      </h3>
                      <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed">{desc}</p>
                    </div>
                  </div>

                  {/* KARTU GRAFIK MINI */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
                    <div className="bg-white/5 backdrop-blur-sm p-4 text-center">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Hari Ini</p>
                      <p className="text-2xl md:text-3xl font-semibold">{statsPeriode.today}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm p-4 text-center">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Kemarin</p>
                      <p className="text-2xl md:text-3xl font-semibold">{statsPeriode.yesterday}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm p-4 text-center">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">7 Hari Terakhir</p>
                      <p className="text-2xl md:text-3xl font-semibold">{statsPeriode.week}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm p-4 text-center">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">30 Hari Terakhir</p>
                      <p className="text-2xl md:text-3xl font-semibold">{statsPeriode.month}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* CARD SUMMARY (TOTAL TERBAYAR / DLL) */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Pesanan</p>
            <h2 className="text-2xl font-bold text-gray-900">{data.length}</h2>
            <p className="text-xs text-gray-400 mt-1">Akumulasi seluruh data tercatat</p>
          </div>

          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Selesai Dibayar
            </p>
            <h2 className="text-2xl font-bold text-gray-900">
              {data.filter((item) => item.status && item.status.includes('TERBAYAR')).length}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Pesanan dengan status lunas</p>
          </div>

          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Tertunda / Belum Bayar
            </p>
            <h2 className="text-2xl font-bold text-gray-900">
              {data.filter((item) => !item.status || !item.status.includes('TERBAYAR')).length}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Menunggu konfirmasi pembayaran</p>
          </div>

          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1">Nominal Terbayar</p>
            <h2 className="text-xl font-bold text-gray-900 truncate" title={formatRupiah(totalTerbayar)}>
              {formatRupiah(totalTerbayar)}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Akumulasi seluruh pemasukan</p>
          </div>
        </div>

        {/* LAPORAN RIWAYAT */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Riwayat Pembayaran Batch
            </h2>
          </div>

          <div className="grid gap-3">
            {laporanWaktu.length === 0 ? (
              <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-500">Data riwayat pembayaran belum tersedia.</p>
              </div>
            ) : (
              laporanWaktu.map((item, index) => {
                const prevItem = laporanWaktu[index + 1];
                let trendText = "Stabil";
                let trendColor = "text-gray-500";
                let TrendIcon = () => <span className="text-gray-400 font-bold ml-1.5">-</span>;

                if (prevItem) {
                  const diff = item.jumlahPesanan - prevItem.jumlahPesanan;
                  if (diff > 0) {
                    trendText = `Naik ${diff}`;
                    trendColor = "text-emerald-600";
                    TrendIcon = () => <svg className="w-3 h-3 ml-1.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
                  } else if (diff < 0) {
                    trendText = `Turun ${Math.abs(diff)}`;
                    trendColor = "text-rose-600";
                    TrendIcon = () => <svg className="w-3 h-3 ml-1.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
                  }
                } else if (laporanWaktu.length > 1 && index === laporanWaktu.length - 1) {
                  trendText = "Sesi Perdana";
                  trendColor = "text-blue-600";
                }

                return (
                  <div
                    key={index}
                    className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="hidden sm:flex w-12 h-12 rounded-full bg-gray-50 border border-gray-100 items-center justify-center text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              Lunas
                            </span>
                            <span className="text-sm font-medium text-gray-600">{item.waktu}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <h2 className="text-xl font-bold text-gray-900">
                              {formatRupiah(Number(item.total))}
                            </h2>
                            <span className="text-sm text-gray-500 flex items-center">
                              {item.jumlahPesanan} Pesanan <TrendIcon /><span className={`ml-1 text-xs font-medium ${trendColor}`}>{trendText}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleKlikLunasi(item.waktu)}
                        className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                      >
                        Selesaikan Batch
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* TABLE SECTION (CLEAN & PROFESSIONAL) */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Rincian Transaksi</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Detail seluruh pesanan masuk dan status keuangannya.
              </p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Cari ID Pesanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors placeholder:text-gray-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 text-center">No</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Pesanan</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu Pembuatan</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Variasi</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Metode Bayar</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kreator</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Toko</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Pendapatan</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Diinput</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-sm text-gray-500">
                      Memuat data transaksi...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-sm text-gray-500">
                      {searchQuery ? `Tidak ada pesanan dengan ID "${searchQuery}"` : 'Belum ada data pesanan tersedia.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    const isCOD = item.payment_method?.toLowerCase().includes('bayar di tempat');
                    const isTerbayar = item.status && item.status.includes('TERBAYAR');

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 text-sm text-gray-400 text-center">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {item.order_id}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {item.waktu_orderan_dibuat 
                            ? String(item.waktu_orderan_dibuat).replace('T', ' ').split('+')[0].replace('Z', '') 
                            : '-'}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          {item.variasi_produk && item.variasi_produk !== '-' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/60">
                              {item.variasi_produk}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            {isCOD ? (
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            )}
                            <span className={isCOD ? "text-gray-700 font-medium" : "text-gray-600"}>{item.payment_method || '-'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {item.creator_handle && item.creator_handle !== '-' ? (
                            <span><span className="text-gray-400 mr-0.5">@</span>{item.creator_handle.replace('@', '')}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 font-medium">
                          {item.toko || '-'}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 text-right tabular-nums">
                          {item.total_pendapatan}
                        </td>
                        <td className="px-5 py-4 text-sm text-center">
                          {isTerbayar ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 uppercase tracking-wide">
                              {item.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/10 uppercase tracking-wide">
                              Tertunda
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">
                          {item.created_at ? formatTanggal(item.created_at) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}