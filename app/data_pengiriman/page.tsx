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
  // 1. MENGAMBIL DATA DARI DATABASE
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
  // 2. FUNGSI UTILITAS FORMATTING
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

  // ==========================================
  // 3. FUNGSI UPLOAD & PELACAKAN EXCEL
  // ==========================================
  async function uploadExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
      // Baca File Excel
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
      
      // Daftar kolom waktu (timestamp)
      const timeColumns = [
        'created_time', 'paid_time', 'rts_time', 
        'shipped_time', 'delivered_time', 'cancelled_time'
      ]

      // Daftar kolom angka (numeric)
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
        
        // LEWATI BARIS DESKRIPSI / PETUNJUK EXCEL
        if (!orderIdValue || orderIdValue.length > 40 || orderIdValue.includes('identifier') || orderIdValue.includes('The time') || orderIdValue.includes('Total distance fee')) {
          continue; 
        }

        // LEWATI DUPLIKAT DI DALAM FILE
        if (orderIdsInExcel.has(orderIdValue)) {
          duplikatInternal++;
          continue; 
        }
        
        orderIdsInExcel.add(orderIdValue)

        const newRow: any = {}
        Object.keys(row).forEach((key) => {
          const formattedKey = formatColumnName(key)
          let value = row[key]
          
          if (value === '' || value === undefined) {
            value = null
          }

          // CEGAH ERROR TIMESTAMP: Jika bukan format tanggal yang sah, jadikan null
          if (timeColumns.includes(formattedKey) && typeof value === 'string') {
            if (isNaN(Date.parse(value))) {
              value = null 
            }
          }

          // CEGAH ERROR NUMERIC: Jika kolom angka berisi teks/kalimat deskripsi, jadikan null
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
        formattedData.push(newRow)
      }

      // Pelacakan Duplikat dengan Database (Supabase)
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

      let pesanKonfirmasi = `Ditemukan ${formattedData.length} baris unik di Excel.\n`
      if (duplikatInternal > 0) pesanKonfirmasi += `- Dihapus ${duplikatInternal} duplikat di dalam file Excel.\n`
      if (duplikatDatabase > 0) pesanKonfirmasi += `- Dilewati ${duplikatDatabase} pesanan karena sudah ada di Database.\n`
      pesanKonfirmasi += `\nAkan diupload ${newDataToInsert.length} pesanan baru. Lanjutkan?`

      if (!window.confirm(pesanKonfirmasi)) {
        setLoading(false)
        event.target.value = ''
        return
      }

      // Insert Data Baru
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
                Upload dan kelola data pesanan dalam pengiriman dengan sistem anti-duplikasi otomatis.
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
            <span className="text-xl">⏳</span> Sedang memproses dan melacak data, mohon tunggu...
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
              {totalPesanan} <span className="text-lg font-medium text-gray-500">Resi</span>
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
              <h2 className="text-2xl font-bold text-gray-900">Daftar Pengiriman</h2>
              <p className="text-gray-500 text-sm mt-2">
                Menampilkan maksimal 100 data terbaru yang tersimpan di database.
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl border border-blue-100">
              🛡️ Anti Duplikat Aktif
            </div>
          </div>

          <div className="overflow-auto max-h-[600px]">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Order ID</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Produk</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Nominal</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Pembeli</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Kurir</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="text-center p-12 text-gray-500">
                      Belum ada data pengiriman tersimpan. Silakan upload file Excel.
                    </td>
                  </tr>
                ) : (
                  data.slice(0, 100).map((item, index) => (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition-all">
                      <td className="p-5 font-medium text-gray-700">{index + 1}</td>
                      <td className="p-5 font-semibold text-gray-900">{item.order_id}</td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200`}>
                          {item.order_status || 'Diproses'}
                        </span>
                      </td>
                      <td className="p-5 text-sm text-gray-600 max-w-[200px] truncate" title={item.product_name}>
                        {item.product_name}
                      </td>
                      <td className="p-5 font-semibold text-green-700">
                        {item.order_amount ? formatRupiah(Number(item.order_amount)) : '-'}
                      </td>
                      <td className="p-5 text-sm font-medium text-gray-800">
                        {item.buyer_username || item.recipient}
                      </td>
                      <td className="p-5 text-sm font-bold text-orange-600 uppercase">
                        {item.shipping_provider_name || item.delivery_option}
                      </td>
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