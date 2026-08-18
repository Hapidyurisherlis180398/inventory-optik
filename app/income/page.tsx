'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function IncomePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isIncomeUpdated, setIsIncomeUpdated] = useState(false)
  
  const [totalPembayaran, setTotalPembayaran] = useState(0)
  const [totalPendapatan, setTotalPendapatan] = useState(0)

  // --- STATE UNTUK DATA DINAMIS & PELACAKAN ---
  const [daftarHost, setDaftarHost] = useState<any[]>([])
  const [dataKetLive, setDataKetLive] = useState<any[]>([])
  
  const [grandTotalTerbayar, setGrandTotalTerbayar] = useState(0)
  const [grandTotalOmset, setGrandTotalOmset] = useState(0)
  
  // State untuk menyimpan "Kamus Pelacakan" (Order ID -> Nama Host)
  const [pelacakHost, setPelacakHost] = useState<Record<string, string>>({})

  async function getData() {
    setLoading(true)

    // ==========================================
    // 1. AMBIL DAFTAR HOST & BANGUN KAMUS PELACAKAN
    // ==========================================
    const { data: hosts } = await supabase
      .from('daftar_host_live')
      .select('*')
      .order('id', { ascending: true })

    let tempPelacakHost: Record<string, string> = {}
    let tempDataKetLive = []
    let tempGrandTerbayar = 0
    let tempGrandOmset = 0

    if (hosts) {
      setDaftarHost(hosts) 
      
      // Looping ke semua tabel host
      for (const host of hosts) {
        const tableName = `live_reports_${host.slug}`
        
        // Ambil SEMUA order_id, total_pendapatan, dan status dari tabel ini
        const { data: hostData } = await supabase
          .from(tableName)
          .select('order_id, total_pendapatan, status')
        
        let terbayarHost = 0
        let omsetHost = 0

        if (hostData) {
          hostData.forEach((row) => {
            // A. Masukkan order_id ini ke "Kamus Pelacakan"
            if (row.order_id) {
              tempPelacakHost[row.order_id] = host.nama
            }

            // B. Hitung Angka Pendapatan
            const angka = Number(row.total_pendapatan?.toString().replace(/[^\d-]/g, '')) || 0
            
            // Tambahkan ke Total Omset (Semua status dihitung)
            omsetHost += angka

            // Tambahkan ke Total Terbayar (Hanya yang berstatus TERBAYAR)
            if (row.status && row.status.includes('TERBAYAR')) {
              terbayarHost += angka
            }
          })
        }

        // Simpan data kalkulasi orang ini
        tempDataKetLive.push({
          id: host.id,
          nama: host.nama,
          totalTerbayar: terbayarHost,
          totalOmset: omsetHost
        })

        // Tambahkan ke Grand Total
        tempGrandTerbayar += terbayarHost
        tempGrandOmset += omsetHost
      }

      setDataKetLive(tempDataKetLive)
      setGrandTotalTerbayar(tempGrandTerbayar)
      setGrandTotalOmset(tempGrandOmset)
      setPelacakHost(tempPelacakHost) // Simpan kamus pelacak ke state
    }

    // ==========================================
    // 2. AMBIL DATA INCOME GLOBAL
    // ==========================================
    const { data: incomeData, error: incomeError } = await supabase
      .from('income')
      .select('*')
      .order('id', {
        ascending: false,
      })

    if (!incomeError && incomeData) {
      setData(incomeData)

      // TOTAL PEMBAYARAN
      const totalBayar = incomeData.reduce((sum, item) => {
        const angka = Number(
          item.jumlah_pembayaran?.toString().replace(/[^\d-]/g, '')
        )
        return sum + (angka || 0)
      }, 0)

      // TOTAL PENDAPATAN
      const totalIncome = incomeData.reduce((sum, item) => {
        const angka = Number(
          item.total_pendapatan?.toString().replace(/[^\d-]/g, '')
        )
        return sum + (angka || 0)
      }, 0)

      setTotalPembayaran(totalBayar)
      setTotalPendapatan(totalIncome)
    }

    setLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

  function formatRupiah(angka: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(angka)
  }

  async function uploadExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)

    // HAPUS DATA LAMA
    await supabase.from('income').delete().neq('id', 0)

    // BACA FILE EXCEL
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

    // INSERT DATA
    for (const item of jsonData) {
      const orderId = item['ID Pesanan/Penyesuaian']?.toString()

      if (!orderId) continue

      await supabase.from('income').insert([
        {
          order_id: orderId,
          jumlah_pembayaran: item['Jumlah penyelesaian pembayaran']?.toString() || '',
          total_pendapatan: item['Total Pendapatan']?.toString() || '',
        },
      ])
    }

    alert('Income terbaru berhasil diperbarui')
    setIsIncomeUpdated(true)
    getData()

    setLoading(false)
  }

  // =========================
  // SINKRONISASI INCOME
  // =========================
  async function sinkronkanIncome() {
    setLoading(true)

    const sekarang = new Date()
    const waktuIndonesia = sekarang.toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    })

    const { data: incomes } = await supabase.from('income').select('*')

    if (!incomes) {
      alert('Data income kosong')
      setLoading(false)
      return
    }

    if (daftarHost.length === 0) {
      alert('Daftar Host kosong. Pastikan Anda sudah mengatur Host di menu Atur Host.')
      setLoading(false)
      return
    }

    for (const income of incomes) {
      const orderId = income.order_id

      const updateData = {
        total_pendapatan: income.total_pendapatan,
        status: 'TERBAYAR • ' + waktuIndonesia,
      }

      for (const host of daftarHost) {
        const tableName = `live_reports_${host.slug}`
        
        await supabase
          .from(tableName)
          .update(updateData)
          .eq('order_id', orderId)
      }
    }

    alert('Sinkronisasi income berhasil dilakukan ke seluruh cabang/host!')
    setIsIncomeUpdated(false)
    getData()

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-green-600 mb-2 tracking-wide">
                INCOME DASHBOARD
              </p>
              <h1 className="text-4xl font-bold text-gray-900">DATA INCOME</h1>
              <p className="text-gray-500 mt-3">
                Monitoring income dan sinkronisasi pembayaran ke seluruh cabang realtime
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {/* UPLOAD */}
              <label className="bg-black hover:bg-gray-800 transition-all text-white px-6 py-4 rounded-2xl cursor-pointer font-semibold shadow-sm">
                Upload Excel Income
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={uploadExcel}
                  className="hidden"
                />
              </label>

              {/* SINKRON */}
              <button
                onClick={sinkronkanIncome}
                disabled={!isIncomeUpdated}
                className={`transition-all px-6 py-4 rounded-2xl font-semibold shadow-sm ${
                  !isIncomeUpdated
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Sinkronkan Income
              </button>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 font-medium animate-pulse">
            Sedang memproses dan melacak pesanan ke seluruh cabang...
          </div>
        )}

        {/* TOTAL CARDS */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 text-2xl">
              💳
            </div>
            <p className="text-sm text-gray-500 mb-2">Total Hasil Narik Toko</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {formatRupiah(totalPembayaran)}
            </h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4 text-2xl">
              📈
            </div>
            <p className="text-sm text-gray-500 mb-2">Total Omset Toko</p>
            <h2 className="text-3xl font-bold text-green-700">
              {formatRupiah(totalPendapatan)}
            </h2>
          </div>
        </div>

        {/* TABEL KETERANGAN LIVE (TERBAYAR & TOTAL OMSET) */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm mb-8">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900">Ringkasan Performa Cabang</h2>
            <p className="text-gray-500 text-sm mt-2">
              Perbandingan total yang sudah terbayar dengan total keseluruhan omset yang dihasilkan host.
            </p>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Nama Host / Cabang</th>
                  <th className="p-5 text-right text-xs font-bold text-gray-500 uppercase text-blue-600">Total Omset Keseluruhan</th>
                  <th className="p-5 text-right text-xs font-bold text-gray-500 uppercase text-green-600">Total Sudah Terbayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataKetLive.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Memuat data host...
                    </td>
                  </tr>
                ) : (
                  dataKetLive.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-all">
                      <td className="p-5 font-medium text-gray-700">{index + 1}</td>
                      <td className="p-5 font-bold text-gray-900">{item.nama}</td>
                      <td className="p-5 text-right font-bold text-blue-600 bg-blue-50/30">
                        {formatRupiah(item.totalOmset)}
                      </td>
                      <td className="p-5 text-right font-bold text-green-600">
                        {formatRupiah(item.totalTerbayar)}
                      </td>
                    </tr>
                  ))
                )}
                
                {/* BARIS TOTAL KESELURUHAN */}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={2} className="p-5 font-bold text-right text-gray-900 uppercase">
                    GRAND TOTAL
                  </td>
                  <td className="p-5 text-right font-bold text-xl text-blue-700">
                    {formatRupiah(grandTotalOmset)}
                  </td>
                  <td className="p-5 text-right font-bold text-xl text-green-700">
                    {formatRupiah(grandTotalTerbayar)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL DATA INCOME (DENGAN PELACAKAN HOST) */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Data Income & Pelacakan</h2>
              <p className="text-gray-500 text-sm mt-2">
                Daftar seluruh data income beserta sumber host-nya.
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 px-4 py-2 bg-purple-50 text-purple-700 text-sm font-bold rounded-xl border border-purple-100">
              🔍 Sistem Pelacak Aktif
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">ID Pesanan / Penyesuaian</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Jumlah Pembayaran</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Total Pendapatan</th>
                  
                  {/* KOLOM BARU: KET. LIVE */}
                  <th className="p-5 text-left text-xs font-bold text-purple-600 uppercase">Ket. Live (Sumber)</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-gray-500">
                      Belum ada data
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    // MENGAMBIL NAMA HOST DARI KAMUS PELACAK
                    // Jika tidak ditemukan di database cabang manapun, pakai "Live Hapid"
                    const ketLiveHost = pelacakHost[item.order_id] || 'Live Hapid'
                    const isHapid = ketLiveHost === 'Live Hapid'

                    return (
                      <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition-all">
                        <td className="p-5 font-medium text-gray-700">{index + 1}</td>
                        <td className="p-5 font-semibold text-gray-900">{item.order_id}</td>
                        <td className="p-5"><span className="font-semibold text-blue-700">{item.jumlah_pembayaran}</span></td>
                        <td className="p-5"><span className="font-semibold text-green-700">{item.total_pendapatan}</span></td>
                        
                        {/* TAMPILAN KOLOM KET LIVE */}
                        <td className="p-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                            isHapid 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : 'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}>
                            {isHapid ? '🚀' : '👤'} {ketLiveHost}
                          </span>
                        </td>
                      </tr>
                    )
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