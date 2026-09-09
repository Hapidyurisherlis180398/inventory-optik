'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function DataPengirimanPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [totalPesanan, setTotalPesanan] = useState(0)
  const [totalOmset, setTotalOmset] = useState(0)

  // ==========================================
  // 1. MENGAMBIL SEMUA DATA DARI DATABASE
  // ==========================================
  async function getData() {
    setLoading(true)
    
    const { data: pengirimanData, error } = await supabase
      .from('data_pengiriman')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error("Gagal mengambil data:", error)
    } else if (pengirimanData) {
      setData(pengirimanData)
      setTotalPesanan(pengirimanData.length)
      
      const total = pengirimanData.reduce((sum, item) => {
        return sum + (Number(item.order_amount) || 0)
      }, 0)
      setTotalOmset(total)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

  // ==========================================
  // 2. FUNGSI UTILITAS FORMATTING & TANGGAL
  // ==========================================
  const formatColumnName = (key: string) => {
    return key
      .replace(/[^a-zA-Z0-9]+/g, '_') 
      .replace(/^_+|_+$/g, '')        
      .toLowerCase();                 
  };

  function formatRupiah(angka: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka)
  }

  function formatTanggal(dateString: any) {
    if (!dateString || dateString === '-') return '-'
    
    try {
      const str = String(dateString).trim()
      const cleaned = str.replace('T', ' ').replace(/\+.*/, '').trim()
      const parts = cleaned.split(' ')
      
      if (!parts[0] || !parts[0].includes('-')) return str

      const [year, month, day] = parts[0].split('-')
      const timePart = parts[1] || ''
      
      if (year && month && day) {
        const formattedDate = `${day}-${month}-${year}`
        return timePart ? `${formattedDate} ${timePart}` : formattedDate
      }
      
      return str
    } catch (e) {
      return String(dateString)
    }
  }

  // ==========================================
  // 3. FUNGSI UPLOAD & PELACAKAN EXCEL
  // ==========================================
  async function uploadExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        alert("File Excel kosong!")
        setLoading(false)
        return
      }

      const orderIdsInExcel = new Set<string>()
      const formattedData: any[] = []
      let duplikatInternal = 0
      let barisDilewati = 0
      
      const timeColumns = [
        'created_time', 'paid_time', 'rts_time', 
        'shipped_time', 'delivered_time', 'cancelled_time'
      ]

      const numericColumns = [
        'quantity', 'sku_quantity_of_return', 'sku_unit_original_price', 
        'sku_subtotal_before_discount', 'sku_platform_discount', 'sku_seller_discount', 
        'sku_subtotal_after_discount', 'shipping_fee_after_discount', 'original_shipping_fee', 
        'shipping_fee_seller_discount', 'shipping_fee_platform_discount', 'distance_shipping_fee', 
        'distance_fee', 'order_refund_amount', 'payment_platform_discount', 'buyer_service_fee', 
        'handling_fee', 'shipping_insurance', 'item_insurance', 'order_amount', 'weight_kg'
      ]

      for (const row of jsonData) {
        const orderIdValue = row['Order ID']?.toString()
        
        // Filter ketat: Abaikan baris kosong, teks deskripsi, atau baris penjelasan TikTok/Shopee
        if (
          !orderIdValue || 
          orderIdValue.length > 50 || 
          orderIdValue.toLowerCase().includes('identifier') || 
          orderIdValue.toLowerCase().includes('platform unique order id') || 
          orderIdValue.toLowerCase().includes('the time') || 
          orderIdValue.toLowerCase().includes('total distance fee') ||
          orderIdValue.toLowerCase().includes('status') ||
          orderIdValue.toLowerCase().includes('changes') ||
          orderIdValue.toLowerCase().includes('keterangan') ||
          orderIdValue.toLowerCase().includes('catatan')
        ) {
          barisDilewati++;
          continue; 
        }

        if (orderIdsInExcel.has(orderIdValue)) {
          duplikatInternal++;
          continue; 
        }
        
        orderIdsInExcel.add(orderIdValue)

        const newRow: any = {}
        let isValidRow = true

        Object.keys(row).forEach((key) => {
          const formattedKey = formatColumnName(key)
          let value = row[key]
          
          if (value === '' || value === undefined) {
            value = null
          }

          // Validasi dan konversi kolom waktu ke format standar database (YYYY-MM-DD)
          if (timeColumns.includes(formattedKey)) {
            if (value instanceof Date) {
              value = value.toISOString()
            } else if (value !== null && typeof value === 'string') {
              const trimmedVal = value.trim()
              
              // 1. Cek jika formatnya DD/MM/YYYY (contoh: 31/08/2026 21:33:04)
              const regexDDMMYYYY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(.*))?/
              const matchDDMM = trimmedVal.match(regexDDMMYYYY)
              
              if (matchDDMM) {
                // Ubah posisi DD dan YYYY menjadi YYYY-MM-DD
                const day = matchDDMM[1].padStart(2, '0')
                const month = matchDDMM[2].padStart(2, '0')
                const year = matchDDMM[3]
                const time = matchDDMM[4] || '00:00:00'
                
                value = `${year}-${month}-${day} ${time}`
              } 
              // 2. Cek jika sudah berformat YYYY-MM-DD
              else if (trimmedVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                value = trimmedVal
              } 
              // Jika format tidak dikenali, buang datanya (null) agar tidak error saat insert
              else {
                value = null
              }
            } else {
              value = null
            }
          }

          if (numericColumns.includes(formattedKey) && value !== null) {
            const parsedNum = Number(value)
            if (isNaN(parsedNum)) {
              value = null
            } else {
              value = parsedNum
            }
          }

          newRow[formattedKey] = value
        })

        if (isValidRow) {
          formattedData.push(newRow)
        }
      }

      if (formattedData.length === 0) {
        alert("Tidak ada data valid yang ditemukan untuk diupload. Pastikan format file Excel sesuai.")
        setLoading(false)
        event.target.value = ''
        return
      }

      // Cek ke database apakah order_id sudah ada
      const { data: existingData, error: fetchError } = await supabase
        .from('data_pengiriman')
        .select('order_id')
        .in('order_id', Array.from(orderIdsInExcel))

      if (fetchError) throw fetchError;

      const existingOrderIds = new Set(existingData?.map(d => d.order_id))
      const newDataToInsert = formattedData.filter(row => !existingOrderIds.has(row.order_id))
      const duplikatDatabase = formattedData.length - newDataToInsert.length

      if (newDataToInsert.length === 0) {
        alert(`Upload dibatalkan.\nSemua data pesanan sudah ada di database!`)
        setLoading(false)
        event.target.value = '' 
        return
      }

      // Pesan konfirmasi yang detail
      let pesanKonfirmasi = `Ditemukan ${formattedData.length} baris pesanan valid di Excel.\n`
      if (barisDilewati > 0) pesanKonfirmasi += `- Dibuang ${barisDilewati} baris keterangan/sampah dari platform.\n`
      if (duplikatInternal > 0) pesanKonfirmasi += `- Dihapus ${duplikatInternal} pesanan ganda (duplikat) di dalam file Excel.\n`
      if (duplikatDatabase > 0) pesanKonfirmasi += `- Dilewati ${duplikatDatabase} pesanan karena sudah pernah diupload ke Database.\n`
      pesanKonfirmasi += `\nAkan diupload ${newDataToInsert.length} pesanan baru. Lanjutkan?`

      if (!window.confirm(pesanKonfirmasi)) {
        setLoading(false)
        event.target.value = ''
        return
      }

      const { error: insertError } = await supabase
        .from('data_pengiriman')
        .insert(newDataToInsert)

      if (insertError) throw insertError;

      alert(`Berhasil! ${newDataToInsert.length} data pesanan baru telah ditambahkan.`)
      getData()

    } catch (err: any) {
      console.error("Error Upload:", err)
      alert(`Terjadi kesalahan saat upload: ${err.message}`)
    } finally {
      setLoading(false)
      event.target.value = '' 
    }
  }

  // ==========================================
  // 4. RENDER TAMPILAN HALAMAN (UI)
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-2 tracking-wide">
                DELIVERY DASHBOARD
              </p>
              <h1 className="text-4xl font-bold text-gray-900">DATA PENGIRIMAN</h1>
              <p className="text-gray-500 mt-3">
                Upload dan kelola seluruh data pesanan pengiriman tanpa batasan jumlah baris.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <label className={`transition-all px-6 py-4 rounded-2xl cursor-pointer font-semibold shadow-sm flex items-center gap-2 ${
                  loading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-black hover:bg-gray-800 text-white'
                }`}>
                {loading ? 'Memproses...' : '📁 Upload Excel Pesanan'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={uploadExcel}
                  disabled={loading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 font-medium animate-pulse flex items-center gap-3">
            <span className="text-xl">⏳</span> Sedang memproses dan memuat data, mohon tunggu...
          </div>
        )}

        {/* TOTAL CARDS */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 text-2xl">
              📦
            </div>
            <p className="text-sm text-gray-500 mb-2">Total Pesanan Tersimpan</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {totalPesanan.toLocaleString('id-ID')} <span className="text-lg font-medium text-gray-500">Resi</span>
            </h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4 text-2xl">
              💰
            </div>
            <p className="text-sm text-gray-500 mb-2">Estimasi Omset Pengiriman</p>
            <h2 className="text-3xl font-bold text-green-700">
              {formatRupiah(totalOmset)}
            </h2>
          </div>
        </div>

        {/* TABEL DATA PENGIRIMAN */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daftar Semua Pengiriman</h2>
              <p className="text-gray-500 text-sm mt-2">
                Menampilkan kolom pilihan spesifik dari database.
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl border border-blue-100">
              🛡️ Anti Duplikat Aktif
            </div>
          </div>

          <div className="overflow-auto max-h-[600px]">
            <table className="w-full min-w-[1400px]">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Order ID</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Variation</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Quantity</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Created Time</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Shipped Time</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Tracking ID</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Payment Method</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Order Channel</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Creator Handle</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={10} className="text-center p-12 text-gray-500">
                      Belum ada data pengiriman tersimpan. Silakan upload file Excel.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id || index} className="border-t border-gray-100 hover:bg-gray-50 transition-all text-sm">
                      <td className="p-4 font-medium text-gray-700">{index + 1}</td>
                      <td className="p-4 font-semibold text-gray-900">{item.order_id}</td>
                      <td className="p-4 text-gray-600 max-w-[180px] truncate" title={item.variation}>
                        {item.variation || '-'}
                      </td>
                      <td className="p-4 font-medium text-gray-800">{item.quantity ?? '-'}</td>
                      
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        {formatTanggal(item.created_time || item.createdTime || item['Created Time'])}
                      </td>
                      
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        {formatTanggal(item.shipped_time || item.shippedTime || item['Shipped Time'])}
                      </td>

                      <td className="p-4 font-medium text-blue-600">{item.tracking_id || '-'}</td>
                      <td className="p-4 text-gray-700">{item.payment_method || '-'}</td>
                      <td className="p-4 text-gray-700">{item.order_channel || '-'}</td>
                      <td className="p-4 font-medium text-purple-600">{item.creator_handle || '-'}</td>
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