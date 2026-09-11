'use client'

import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function HitungHppPage() {
  const [dataHpp, setDataHpp] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // State untuk Data Upload & Pencocokan
  const [totalPesanan, setTotalPesanan] = useState(0)
  const [totalDitemukan, setTotalDitemukan] = useState(0)

  // State untuk Input Variabel HPP
  const [costFrame, setCostFrame] = useState<number>(0)
  const [costLensNormal, setCostLensNormal] = useState<number>(0)
  const [costLensMinus, setCostLensMinus] = useState<number>(0)
  const [costLensPlus, setCostLensPlus] = useState<number>(0)
  const [costOther, setCostOther] = useState<number>(0)

  // State untuk Pencarian & Pengurutan (Sort)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  // ==========================================
  // FUNGSI UPLOAD & PENCOCOKAN DATA
  // ==========================================
  async function uploadIncomeExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setDataHpp([]) 
    setSearchTerm('')
    setSortConfig(null)

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

      const rawMergedData = jsonData.map((row) => {
        const orderId = String(row['ID Pesanan/Penyesuaian'] || row['ID pesanan terkait']).trim()
        
        const matchedVariation = variationMap.get(orderId)
        if (matchedVariation) totalDitemukanCounter++

        const pendapatan = parseNumber(row['Total Pendapatan'])
        const biaya = parseNumber(row['Total Biaya'])
        const settlement = parseNumber(row['Jumlah penyelesaian pembayaran'])

        return {
          order_id: orderId,
          variation: matchedVariation || '',
          waktu: row['Waktu pemesanan'] || '-',
          pendapatan: pendapatan,
          biaya: biaya,
          settlement: settlement,
          status_match: matchedVariation ? 'Ditemukan' : 'Tidak Ditemukan'
        }
      })

      setDataHpp(rawMergedData)
      setTotalPesanan(rawMergedData.length)
      setTotalDitemukan(totalDitemukanCounter)

    } catch (err: any) {
      console.error("Error Processing Income:", err)
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setLoading(false)
      event.target.value = '' 
    }
  }

  // ==========================================
  // KALKULASI HPP, PENCARIAN & PENGURUTAN (UseMemo)
  // ==========================================
  const processedData = useMemo(() => {
    let calculatedData = dataHpp.map(item => {
      let hppFrame = 0
      let hppLens = 0
      let hppOther = 0
      let orderBadge = ''

      if (item.status_match === 'Ditemukan' && item.variation) {
        hppFrame = costFrame || 0
        hppOther = costOther || 0

        const varLower = item.variation.toLowerCase()
        if (varLower.includes('minus')) {
          hppLens = costLensMinus || 0
        } else if (varLower.includes('plus')) {
          hppLens = costLensPlus || 0
        } else if (varLower.includes('normal')) {
          hppLens = costLensNormal || 0
        }
      }

      // Penyesuaian label & pemotongan berdasarkan nilai settlement
      if (item.settlement === 0) {
        orderBadge = 'RETUR'
        hppFrame = 0             
        hppLens = 0              
        hppOther = 0             // Karena net cair 0, total HPP juga 0 (semua komponen = 0)
      } else if (item.settlement < 0) {
        orderBadge = 'PENGEMBALIAN BARANG'
        hppFrame = 0             
        hppLens = hppLens / 2    // Lensa dibagi 2, Biaya lain-lain tetap normal
      }

      const totalHpp = hppFrame + hppLens + hppOther
      const profit = item.settlement - totalHpp

      return {
        ...item,
        hppFrame,
        hppLens,
        hppOther,
        totalHpp,
        profit,
        orderBadge
      }
    })

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase()
      calculatedData = calculatedData.filter(item => 
        item.order_id.toLowerCase().includes(lowercasedTerm)
      )
    }

    if (sortConfig !== null) {
      calculatedData.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        if (aValue === undefined || aValue === null) aValue = ''
        if (bValue === undefined || bValue === null) bValue = ''

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return calculatedData
  }, [dataHpp, costFrame, costLensNormal, costLensMinus, costLensPlus, costOther, searchTerm, sortConfig])

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Kalkulasi Total Metrik Global (Berdasarkan data yang tampil/tersaring)
  const globalSettlement = processedData.reduce((sum, item) => sum + item.settlement, 0)
  const globalTotalHpp = processedData.reduce((sum, item) => sum + item.totalHpp, 0)
  const globalProfit = processedData.reduce((sum, item) => sum + item.profit, 0)

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

  // Komponen Helper untuk Ikon Sort
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) {
      return <svg className="w-3.5 h-3.5 ml-1 opacity-20 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
    }
    return sortConfig.direction === 'asc' 
      ? <svg className="w-3.5 h-3.5 ml-1 text-[#F56600] inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-3.5 h-3.5 ml-1 text-[#F56600] inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
  }

  // ==========================================
  // FUNGSI EXPORT PDF
  // ==========================================
  const downloadPDF = () => {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(18)
    doc.setTextColor(245, 102, 0) 
    doc.text('Laporan Detail HPP & Profit Bersih', 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Pesanan: ${processedData.length}`, 14, 30)
    doc.text(`SALDO CAIR KE TOKO: ${formatRupiah(globalSettlement)} | PROFIT BERSIH GLOBAL: ${formatRupiah(globalProfit)}`, 14, 36)

    const tableColumn = ["No", "Order ID", "Variasi", "Net Cair", "HPP Frame", "HPP Lensa", "Biaya Lain", "Total HPP", "Profit Bersih"]
    const tableRows: any[] = []

    processedData.forEach((item, index) => {
      const rowData = [
        index + 1,
        item.order_id + (item.orderBadge ? ` (${item.orderBadge})` : ''),
        item.variation || 'Tidak Ditemukan',
        formatRupiah(item.settlement),
        formatRupiah(item.hppFrame),
        formatRupiah(item.hppLens),
        formatRupiah(item.hppOther),
        formatRupiah(item.totalHpp),
        formatRupiah(item.profit)
      ]
      tableRows.push(rowData)
    })

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [90, 18, 90], textColor: [255, 255, 255] }, 
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        3: { halign: 'right' }, 
        4: { halign: 'right' }, 
        5: { halign: 'right' }, 
        6: { halign: 'right' }, 
        7: { halign: 'right', fontStyle: 'bold' }, 
        8: { halign: 'right', fontStyle: 'bold', textColor: [245, 102, 0] } 
      }
    })

    doc.save(`Laporan_HPP_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // ==========================================
  // RENDER TAMPILAN HALAMAN (UI)
  // ==========================================
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-200 p-4 md:p-8 font-sans selection:bg-[#F56600] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="relative overflow-hidden bg-[#121212] border border-gray-800 rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#5A125A] opacity-20 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#5A125A]/20 border border-[#5A125A]/50">
                <p className="text-xs font-bold text-[#FFD700] tracking-widest uppercase">
                  Financial Dashboard
                </p>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#F56600]">
                Income & Profit Tracker
              </h1>
              <p className="text-gray-400 max-w-2xl text-sm md:text-base leading-relaxed">
                Sinkronisasi file <span className="text-white font-semibold">Income</span> dengan database pengiriman. Tentukan HPP komponen produk untuk melihat estimasi profit bersih secara otomatis.
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
                <input type="file" accept=".xlsx,.xls" onChange={uploadIncomeExcel} disabled={loading} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* SETUP HPP FORM */}
        {dataHpp.length > 0 && (
          <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-6 h-6 text-[#F56600]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              <h2 className="text-xl font-bold text-white">Pengaturan HPP Dasar (Rp)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Harga Frame</label>
                <input type="number" min="0" value={costFrame || ''} onChange={(e) => setCostFrame(Number(e.target.value))} className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white focus:border-[#F56600] focus:ring-1 focus:ring-[#F56600] outline-none transition-all font-mono" placeholder="Contoh: 60000" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lensa Normal</label>
                <input type="number" min="0" value={costLensNormal || ''} onChange={(e) => setCostLensNormal(Number(e.target.value))} className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white focus:border-[#F56600] focus:ring-1 focus:ring-[#F56600] outline-none transition-all font-mono" placeholder="Contoh: 70000" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lensa Minus</label>
                <input type="number" min="0" value={costLensMinus || ''} onChange={(e) => setCostLensMinus(Number(e.target.value))} className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white focus:border-[#F56600] focus:ring-1 focus:ring-[#F56600] outline-none transition-all font-mono" placeholder="Contoh: 75000" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lensa Plus</label>
                <input type="number" min="0" value={costLensPlus || ''} onChange={(e) => setCostLensPlus(Number(e.target.value))} className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white focus:border-[#F56600] focus:ring-1 focus:ring-[#F56600] outline-none transition-all font-mono" placeholder="Contoh: 80000" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Biaya Lain-lain</label>
                <input type="number" min="0" value={costOther || ''} onChange={(e) => setCostOther(Number(e.target.value))} className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white focus:border-[#F56600] focus:ring-1 focus:ring-[#F56600] outline-none transition-all font-mono" placeholder="Contoh: 25000" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 italic">*HPP akan otomatis dihitung ke dalam tabel. Jika Keterangan <strong className="text-red-400">PENGEMBALIAN BARANG</strong> (Cair Minus) Frame dianggap 0 & Lensa dibagi 2. Jika <strong className="text-red-400">RETUR</strong> (Cair 0) maka seluruh komponen HPP tidak dihitung (Rp 0).</p>
          </div>
        )}

        {/* METRIC CARDS GLOBAL */}
        {dataHpp.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-700"></div>
              <p className="text-sm text-gray-400 font-medium mb-1">Data Ditampilkan</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black text-white">{processedData.length}</h2>
                <span className="text-xs font-medium text-gray-500">/ {totalPesanan} Pesanan</span>
              </div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#5A125A]"></div>
              <p className="text-sm text-gray-400 font-medium mb-1">SALDO CAIR KE TOKO (Tampil)</p>
              <h2 className="text-2xl font-black text-white">{formatRupiah(globalSettlement)}</h2>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#9E2A00]"></div>
              <p className="text-sm text-gray-400 font-medium mb-1">TOTAL HPP GLOBAL(Tampil)</p>
              <h2 className="text-2xl font-black text-[#FF8A8A]">{formatRupiah(globalTotalHpp)}</h2>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#F56600] shadow-[0_0_10px_#F56600]"></div>
              <p className="text-sm text-gray-400 font-medium mb-1">PROFIT BERSIH GLOBAL (Tampil)</p>
              <h2 className={`text-2xl font-black ${globalProfit >= 0 ? 'text-[#FFD700]' : 'text-red-500'}`}>
                {formatRupiah(globalProfit)}
              </h2>
            </div>
          </div>
        )}

        {/* DATA TABLE & SEARCH & PDF DOWNLOAD */}
        <div className="bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181818]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F56600]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Detail Perhitungan per Pesanan
            </h2>

            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              {/* SEARCH BAR */}
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Cari ID Pesanan..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={dataHpp.length === 0}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-gray-700 rounded-xl text-sm text-white focus:border-[#F56600] focus:ring-1 focus:ring-[#F56600] outline-none transition-all disabled:opacity-50"
                />
              </div>

              {/* BUTTON DOWNLOAD PDF */}
              <button 
                onClick={downloadPDF}
                disabled={processedData.length === 0}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5A125A] hover:bg-[#721872] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
            <table className="w-full min-w-[1400px] text-left border-collapse">
              <thead className="bg-[#1A1A1A] sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">No</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors select-none" onClick={() => requestSort('order_id')}>
                    Order ID <SortIcon columnKey="order_id" />
                  </th>
                  <th className="p-4 text-xs font-bold text-[#FFD700] uppercase tracking-wider bg-[#5A125A]/10 cursor-pointer hover:bg-[#5A125A]/20 transition-colors select-none" onClick={() => requestSort('variation')}>
                    Variasi Produk <SortIcon columnKey="variation" />
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors select-none" onClick={() => requestSort('settlement')}>
                    Net Cair <SortIcon columnKey="settlement" />
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-l border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors select-none" onClick={() => requestSort('hppFrame')}>
                    HPP Frame <SortIcon columnKey="hppFrame" />
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors select-none" onClick={() => requestSort('hppLens')}>
                    HPP Lensa <SortIcon columnKey="hppLens" />
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors select-none" onClick={() => requestSort('hppOther')}>
                    Biaya Lain <SortIcon columnKey="hppOther" />
                  </th>
                  <th className="p-4 text-xs font-bold text-[#9E2A00] uppercase tracking-wider bg-[#9E2A00]/10 border-r border-gray-800 cursor-pointer hover:bg-[#9E2A00]/20 transition-colors select-none" onClick={() => requestSort('totalHpp')}>
                    Total HPP <SortIcon columnKey="totalHpp" />
                  </th>
                  <th className="p-4 text-xs font-bold text-[#F56600] uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors select-none" onClick={() => requestSort('profit')}>
                    Profit Bersih <SortIcon columnKey="profit" />
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800/50">
                {processedData.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-600">
                        {searchTerm ? (
                          <>
                            <svg className="w-16 h-16 mb-4 opacity-40 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <p className="text-lg font-medium text-gray-400">Pencarian Tidak Ditemukan</p>
                            <p className="text-sm mt-1">Order ID "{searchTerm}" tidak ada di dalam daftar.</p>
                          </>
                        ) : (
                          <>
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-lg font-medium text-gray-400">Belum ada data tersedia</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedData.map((item, index) => (
                    <tr key={index} className="hover:bg-[#1A1A1A] transition-colors duration-200 group">
                      <td className="p-4 text-sm text-gray-500 font-medium">{index + 1}</td>
                      <td className="p-4 text-sm text-gray-300 font-mono">
                        {item.order_id}
                        {item.orderBadge && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-red-900/50 text-red-400 border border-red-800 font-sans tracking-wider">
                            {item.orderBadge}
                          </span>
                        )}
                      </td>
                      
                      <td className="p-4 bg-[#5A125A]/5 group-hover:bg-[#5A125A]/10">
                        {item.status_match === 'Ditemukan' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-[#5A125A]/30 border border-[#5A125A]/50 text-[#FFD700] text-xs font-semibold leading-relaxed">
                            {item.variation}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-[#9E2A00]/20 text-[#F56600] text-xs font-medium">
                            Tidak Ditemukan
                          </span>
                        )}
                      </td>
                      
                      <td className={`p-4 text-sm font-semibold ${item.settlement < 0 ? 'text-red-400' : 'text-gray-200'}`}>
                        {formatRupiah(item.settlement)}
                      </td>
                      
                      <td className="p-4 text-sm text-gray-400 border-l border-gray-800 relative">
                        {item.orderBadge && item.status_match === 'Ditemukan' ? (
                          <span className="text-gray-600 line-through mr-2 text-xs">{formatRupiah(costFrame)}</span>
                        ) : null}
                        {formatRupiah(item.hppFrame)}
                      </td>
                      
                      <td className="p-4 text-sm text-gray-400">
                        {item.orderBadge && item.status_match === 'Ditemukan' ? (
                          <span className="text-gray-600 line-through mr-2 text-xs">
                            {formatRupiah(
                              item.variation.toLowerCase().includes('minus') ? costLensMinus : 
                              item.variation.toLowerCase().includes('plus') ? costLensPlus : costLensNormal
                            )}
                          </span>
                        ) : null}
                        {formatRupiah(item.hppLens)}
                      </td>
                      <td className="p-4 text-sm text-gray-400">
                        {item.orderBadge === 'RETUR' && item.status_match === 'Ditemukan' ? (
                          <span className="text-gray-600 line-through mr-2 text-xs">{formatRupiah(costOther)}</span>
                        ) : null}
                        {formatRupiah(item.hppOther)}
                      </td>
                      
                      <td className="p-4 text-sm text-[#FF8A8A] font-bold bg-[#9E2A00]/5 border-r border-gray-800">
                        {formatRupiah(item.totalHpp)}
                      </td>
                      
                      <td className={`p-4 text-sm font-bold ${item.profit >= 0 ? 'text-[#FFD700] bg-[#F56600]/5' : 'text-red-500 bg-red-900/10'}`}>
                        {formatRupiah(item.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </main>
  )
}