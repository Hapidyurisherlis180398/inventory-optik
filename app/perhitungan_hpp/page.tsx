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
    setDataHpp([]) 

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false })

      if (jsonData.length === 0) {
        alert("File Excel Income kosong!")
        setLoading(false)
        return
      }

      const orderIdsDariExcel = new Set<string>()
      
      jsonData.forEach((row) => {
        const orderIdValue = row['ID Pesanan/Penyesuaian'] || row['ID pesanan terkait'] || row['Order ID']
        if (orderIdValue) {
          orderIdsDariExcel.add(String(orderIdValue).trim())
        }
      })

      const uniqueOrderIds = Array.from(orderIdsDariExcel)

      if (uniqueOrderIds.length === 0) {
        alert("Tidak ditemukan kolom ID Pesanan/Penyesuaian di file ini.")
        setLoading(false)
        return
      }

      const { data: dbData, error } = await supabase
        .from('data_pengiriman')
        .select('order_id, variation')
        .in('order_id', uniqueOrderIds)

      if (error) throw error

      const variationMap = new Map<string, string>()
      dbData?.forEach((item) => {
        variationMap.set(item.order_id, item.variation || 'Variasi Kosong')
      })

      const parseNumber = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'string') {
          return Number(val.replace(/,/g, '')) || 0;
        }
        return Number(val) || 0;
      }

      let totalDitemukanCounter = 0
      let totalSettlementCounter = 0

      const mergedData = jsonData.map((row) => {
        const orderId = String(row['ID Pesanan/Penyesuaian'] || row['ID pesanan terkait']).trim()
        
        const matchedVariation = variationMap.get(orderId)
        if (matchedVariation) totalDitemukanCounter++

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

      setDataHpp(mergedData)
      setTotalPesanan(mergedData.length)
      setTotalDitemukan(totalDitemukanCounter)
      setTotalSettlement(totalSettlementCounter)

    } catch (err: any) {
      console.error("Error Processing Income:", err)
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setLoading(false)
      event.target.value = '' 
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
    <main className="min-h-screen bg-[#0a0a0a] text-gray-200 p-4 md:p-8 font-sans selection:bg-[#F56600] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="relative overflow-hidden bg-[#121212] border border-gray-800 rounded-3xl p-8 md:p-10 shadow-2xl">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#5A125A] opacity-20 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#5A125A]/20 border border-[#5A125A]/50">
                <p className="text-xs font-bold text-[#FFD700] tracking-widest uppercase">
                  Financial Dashboard
                </p>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#F56600]">
                Income & HPP Tracker
              </h1>
              <p className="text-gray-400 max-w-2xl text-sm md:text-base leading-relaxed">
                Sinkronisasi cerdas antara file <span className="text-white font-semibold">Income</span> dengan database pengiriman. Lacak variasi produk dan hitung profitabilitas secara otomatis.
              </p>
            </div>

            <div className="flex-shrink-0">
              <label className={`relative group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl cursor-pointer font-bold transition-all duration-300 ${
                  loading 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#9E2A00] to-[#F56600] text-white shadow-[0_0_20px_rgba(245,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,215,0,0.4)] hover:-translate-y-1'
                }`}>
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Menganalisa Data...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <span>Upload Excel Income</span>
                  </>
                )}
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

        {/* METRIC CARDS */}
        {dataHpp.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-lg hover:border-gray-700 transition-colors relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-700 group-hover:bg-gray-500 transition-colors"></div>
              <p className="text-sm text-gray-400 font-medium mb-1">Total Baris File Income</p>
              <h2 className="text-4xl font-black text-white">{totalPesanan}</h2>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-lg hover:border-[#5A125A]/50 transition-colors relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#5A125A] shadow-[0_0_10px_#5A125A]"></div>
              <p className="text-sm text-gray-400 font-medium mb-1">Variasi Ditemukan</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-4xl font-black text-white">{totalDitemukan}</h2>
                <span className="text-sm font-medium text-[#FFD700]">/ {totalPesanan} Match</span>
              </div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-lg hover:border-[#F56600]/50 transition-colors relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#F56600] shadow-[0_0_10px_#F56600]"></div>
              <p className="text-sm text-gray-400 font-medium mb-1">Total Settlement (Cair)</p>
              <h2 className="text-3xl lg:text-4xl font-black text-[#FFD700] tracking-tight">
                {formatRupiah(totalSettlement)}
              </h2>
            </div>
          </div>
        )}

        {/* DATA TABLE */}
        <div className="bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#181818]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F56600]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              Hasil Sinkronisasi Data
            </h2>
          </div>

          <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead className="bg-[#1A1A1A] sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">No</th>
                  <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="p-5 text-xs font-bold text-[#FFD700] uppercase tracking-wider bg-[#5A125A]/10 border-b-2 border-[#5A125A]">Varian Produk (DB)</th>
                  <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Tgl Pesan</th>
                  <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Income</th>
                  <th className="p-5 text-xs font-bold text-[#9E2A00] uppercase tracking-wider">Potongan / Biaya</th>
                  <th className="p-5 text-xs font-bold text-[#F56600] uppercase tracking-wider">Net (Cair)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800/50">
                {dataHpp.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-600">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-lg font-medium text-gray-400">Belum ada data tersedia</p>
                        <p className="text-sm mt-1">Upload file Income di atas untuk mulai menganalisa.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  dataHpp.map((item, index) => (
                    <tr key={index} className="hover:bg-[#1A1A1A] transition-colors duration-200 group">
                      <td className="p-5 text-sm text-gray-500 font-medium">{index + 1}</td>
                      <td className="p-5 text-sm text-gray-300 font-mono">{item.order_id}</td>
                      
                      {/* Variation Badge Styling */}
                      <td className="p-5 bg-[#5A125A]/5 group-hover:bg-[#5A125A]/10 transition-colors">
                        {item.status_match === 'Ditemukan' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-md bg-[#5A125A]/30 border border-[#5A125A]/50 text-[#FFD700] text-sm font-semibold shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] mr-2"></span>
                            {item.variation}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-md bg-[#9E2A00]/20 border border-[#9E2A00]/40 text-[#F56600] text-sm font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F56600] mr-2"></span>
                            Tidak Ditemukan
                          </span>
                        )}
                      </td>
                      
                      <td className="p-5 text-sm text-gray-400">{formatTanggalSingkat(item.waktu)}</td>
                      <td className="p-5 text-sm text-gray-300 font-medium">{formatRupiah(item.pendapatan)}</td>
                      <td className="p-5 text-sm text-[#FF8A8A] font-medium">{formatRupiah(item.biaya)}</td>
                      <td className="p-5 text-sm text-[#FFD700] font-bold bg-[#F56600]/5">{formatRupiah(item.settlement)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Global Styles for Scrollbar & Animations inside the component */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #121212; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </main>
  )
}