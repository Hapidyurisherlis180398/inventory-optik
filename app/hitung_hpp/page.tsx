'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function HitungHppPage() {
  const [dataHpp, setDataHpp] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // State untuk Ringkasan
  const [totalPesanan, setTotalPesanan] = useState(0)
  const [totalDitemukan, setTotalDitemukan] = useState(0)
  const [totalSettlement, setTotalSettlement] = useState(0)

  // ==========================================
  // FUNGSI UPLOAD & PENCOCOKAN DATA (CROSS-REFERENCE)
  // ==========================================
  async function uploadIncomeExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setDataHpp([]) // Reset data sebelumnya

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // PERBAIKAN PENTING: { raw: false } memaksa xlsx membaca semua cell sebagai string/teks.
      // Ini MENCEGAH angka 18 digit ID pesanan dibulatkan oleh sistem Javascript.
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false })

      if (jsonData.length === 0) {
        alert("File Excel Income kosong!")
        setLoading(false)
        return
      }

      // 1. Kumpulkan semua Order ID dari file Excel
      const orderIdsDariExcel = new Set<string>()
      
      jsonData.forEach((row) => {
        const orderIdValue = row['ID Pesanan/Penyesuaian'] || row['ID pesanan terkait'] || row['Order ID']
        if (orderIdValue) {
          // Hilangkan spasi dan pastikan formatnya murni teks
          orderIdsDariExcel.add(String(orderIdValue).trim())
        }
      })

      const uniqueOrderIds = Array.from(orderIdsDariExcel)

      if (uniqueOrderIds.length === 0) {
        alert("Tidak ditemukan kolom ID Pesanan/Penyesuaian di file ini.")
        setLoading(false)
        return
      }

      // 2. Tarik data variasi dari Supabase (berdasarkan ID dari Excel)
      const { data: dbData, error } = await supabase
        .from('data_pengiriman')
        .select('order_id, variation')
        .in('order_id', uniqueOrderIds)

      if (error) throw error

      // 3. Buat kamus (Map) untuk pencarian cepat: { "12345": "Kacamata Hitam" }
      const variationMap = new Map<string, string>()
      dbData?.forEach((item) => {
        variationMap.set(item.order_id, item.variation || 'Variasi Kosong')
      })

      // Fungsi bantu untuk membaca angka uang jika diformat sebagai string oleh { raw: false }
      const parseNumber = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'string') {
          // Hapus koma pemisah ribuan agar bisa dijumlahkan
          return Number(val.replace(/,/g, '')) || 0;
        }
        return Number(val) || 0;
      }

      // 4. Gabungkan (Merge) data Excel dengan Variasi dari Supabase
      let totalDitemukanCounter = 0
      let totalSettlementCounter = 0

      const mergedData = jsonData.map((row) => {
        const orderId = String(row['ID Pesanan/Penyesuaian'] || row['ID pesanan terkait']).trim()
        
        // Cari variasi di Map
        const matchedVariation = variationMap.get(orderId)
        if (matchedVariation) totalDitemukanCounter++

        // Ambil nilai keuangan dengan parser yang aman
        const pendapatan = parseNumber(row['Total Pendapatan'])
        const biaya = parseNumber(row['Total Biaya'])
        const settlement = parseNumber(row['Jumlah penyelesaian pembayaran'])

        totalSettlementCounter += settlement

        return {
          order_id: orderId,
          variation: matchedVariation || 'Data Tidak Ditemukan di DB',
          waktu: row['Waktu pemesanan'] || '-',
          pendapatan: pendapatan,
          biaya: biaya,
          settlement: settlement,
          status_match: matchedVariation ? 'Ditemukan' : 'Tidak Ditemukan'
        }
      })

      // Update State ke UI
      setDataHpp(mergedData)
      setTotalPesanan(mergedData.length)
      setTotalDitemukan(totalDitemukanCounter)
      setTotalSettlement(totalSettlementCounter)

      alert(`Pemrosesan selesai!\n\n${totalDitemukanCounter} pesanan berhasil dicocokkan.\n${mergedData.length - totalDitemukanCounter} pesanan tidak ditemukan di database.`)

    } catch (err: any) {
      console.error("Error Processing Income:", err)
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setLoading(false)
      event.target.value = '' // Reset input file
    }
  }

  // ==========================================
  // FUNGSI UTILITAS FORMATTING
  // ==========================================
  function formatRupiah(angka: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka)
  }

  function formatTanggalSingkat(dateStr: any) {
    if (!dateStr) return '-'
    if (dateStr instanceof Date) {
      return dateStr.toLocaleDateString('id-ID')
    }
    return String(dateStr).split(' ')[0]
  }

  // ==========================================
  // RENDER TAMPILAN HALAMAN (UI)
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-purple-600 mb-2 tracking-wide">
                HPP & INCOME TRACKER
              </p>
              <h1 className="text-4xl font-bold text-gray-900">HITUNG HPP & PROFIT</h1>
              <p className="text-gray-500 mt-3 max-w-2xl">
                Upload file <b>Income/Pendapatan</b> Anda. Sistem akan otomatis melacak <b>Variasi Produk</b> dari database pengiriman berdasarkan Order ID.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <label className={`transition-all px-6 py-4 rounded-2xl cursor-pointer font-semibold shadow-sm flex items-center gap-2 ${
                  loading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-black hover:bg-gray-800 text-white'
                }`}>
                {loading ? 'Menganalisa Data...' : '📊 Upload Excel Income'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={uploadIncomeExcel}
                  disabled={loading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="mb-6 bg-purple-50 border border-purple-100 text-purple-700 rounded-2xl p-4 font-medium animate-pulse flex items-center gap-3">
            <span className="text-xl">⚙️</span> Sedang mencocokkan Order ID dengan Database, mohon tunggu...
          </div>
        )}

        {/* TOTAL CARDS */}
        {dataHpp.length > 0 && (
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-2">Total Baris di File Income</p>
              <h2 className="text-3xl font-bold text-gray-900">{totalPesanan}</h2>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm border-l-4 border-l-purple-500">
              <p className="text-sm text-gray-500 mb-2">Berhasil Ditemukan Variasinya</p>
              <h2 className="text-3xl font-bold text-purple-700">
                {totalDitemukan} <span className="text-sm font-normal text-gray-500">/{totalPesanan} Pesanan</span>
              </h2>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm border-l-4 border-l-green-500">
              <p className="text-sm text-gray-500 mb-2">Total Uang Cair (Settlement)</p>
              <h2 className="text-3xl font-bold text-green-700">
                {formatRupiah(totalSettlement)}
              </h2>
            </div>
          </div>
        )}

        {/* TABEL HASIL PENCOCOKAN */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">Data Pencocokan Income & Variasi</h2>
          </div>

          <div className="overflow-auto max-h-[700px]">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Order ID</th>
                  <th className="p-4 text-left text-xs font-bold text-purple-600 uppercase bg-purple-50">Variasi Produk (Dari DB)</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Tgl Pesan</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Gross Income</th>
                  <th className="p-4 text-left text-xs font-bold text-red-500 uppercase">Total Biaya/Potongan</th>
                  <th className="p-4 text-left text-xs font-bold text-green-600 uppercase">Net Income (Cair)</th>
                </tr>
              </thead>

              <tbody>
                {dataHpp.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="text-center p-12 text-gray-500">
                      Belum ada data. Silakan upload file Excel Income Anda di atas.
                    </td>
                  </tr>
                ) : (
                  dataHpp.map((item, index) => (
                    <tr key={index} className="border-t border-gray-100 hover:bg-gray-50 transition-all text-sm">
                      <td className="p-4 font-medium text-gray-700">{index + 1}</td>
                      <td className="p-4 font-semibold text-gray-900">{item.order_id}</td>
                      
                      <td className={`p-4 font-medium ${item.status_match === 'Ditemukan' ? 'text-purple-700 bg-purple-50/30' : 'text-red-500 bg-red-50/50'}`}>
                        {item.variation}
                      </td>
                      
                      <td className="p-4 text-gray-600">{formatTanggalSingkat(item.waktu)}</td>
                      <td className="p-4 text-gray-700">{formatRupiah(item.pendapatan)}</td>
                      <td className="p-4 text-red-600">{formatRupiah(item.biaya)}</td>
                      <td className="p-4 font-bold text-green-700 bg-green-50/30">{formatRupiah(item.settlement)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}