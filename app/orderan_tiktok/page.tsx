'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase' // Sesuaikan path ini jika perlu

// Tipe Data Orderan
interface Orderan {
  id: number
  order_id: string
  pembeli: string
  produk: string
  variation: string
  payment_method: string
  creator_handle: string
  lokasi: string
  catatan: string
  pesan: string
  total_pendapatan: string
  created_time: string
  status: string
}

export default function OrderanTiktokPage() {
  const [orders, setOrders] = useState<Orderan[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // POPUP DETAIL ORDER
  const [selectedOrder, setSelectedOrder] = useState<Orderan | null>(null)

  // AMBIL DATA DARI SUPABASE
  async function fetchOrders() {
    try {
      setRefreshing(true)
      setMessage('')
      
      const { data, error } = await supabase
        .from('data_orderan_semua_toko_tiktok')
        .select('*')
        .order('id', { ascending: false }) // Yang terbaru di atas

      if (error) {
        setMessage('❌ Gagal mengambil data orderan')
        console.error(error)
        return
      }

      setOrders(data || [])
    } catch (err) {
      console.log(err)
      setMessage('❌ Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // JALANKAN SAAT HALAMAN DIBUKA
  useEffect(() => {
    fetchOrders()

    // (Opsional) Auto-refresh tiap 1 menit
    const interval = setInterval(() => {
      fetchOrders()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <main className="min-h-screen bg-white p-4 md:p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Data Orderan TikTok
            </h1>
            <p className="text-gray-500 mt-2">
              Pantau pesanan masuk secara real-time dari semua toko
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={refreshing}
            className={`rounded-2xl px-6 py-4 font-semibold text-white transition-all ${
              refreshing ? 'bg-gray-400' : 'bg-black hover:bg-gray-800 shadow-lg'
            }`}
          >
            {refreshing ? 'Memuat...' : '🔄 Refresh Data'}
          </button>
        </div>

        {/* PESAN ERROR/SUKSES */}
        {message && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 font-medium">
            {message}
          </div>
        )}

        {/* STATUS & STATISTIK KECIL */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-100 rounded-3xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 font-medium">Total Pesanan</p>
            <h2 className="text-3xl font-bold mt-1">{orders.length}</h2>
          </div>
          <div className="bg-gray-100 rounded-3xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 font-medium">Perlu Dikirim</p>
            <h2 className="text-3xl font-bold text-red-600 mt-1">
              {orders.filter(o => o.status.includes('Perlu Dikirim')).length}
            </h2>
          </div>
        </div>

        {/* LIST ORDERAN */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-lg">Daftar Pesanan Terbaru</h2>
            <span className="text-sm font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
              {loading ? 'Menyinkronkan...' : '🟢 Live'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                  <th className="p-4 font-semibold">Order ID & Waktu</th>
                  <th className="p-4 font-semibold">Pembeli</th>
                  <th className="p-4 font-semibold">Produk</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                      Memuat data pesanan...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                      Belum ada pesanan tersimpan.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{order.order_id}</div>
                        <div className="text-xs text-gray-500 mt-1">{order.created_time}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">{order.pembeli}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
                          {order.creator_handle !== '-' ? order.creator_handle : order.payment_method}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-800 line-clamp-1 max-w-[250px]">
                          {order.produk}
                        </div>
                        {order.variation !== '-' && (
                          <div className="inline-block mt-1 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-lg font-semibold">
                            {order.variation}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status.includes('Perlu Dikirim') 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {order.status.replace('TERBAYAR ', '')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl text-sm transition-all"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* INFO PENGGUNAAN */}
        <div className="bg-black text-white rounded-3xl p-6">
          <h2 className="text-xl font-bold mb-4">Informasi Sistem</h2>
          <ul className="space-y-3 text-sm text-gray-300">
            <li>• Data ditarik langsung dari Supabase tabel <code className="bg-gray-800 px-1 py-0.5 rounded">data_orderan_semua_toko_tiktok</code></li>
            <li>• Halaman otomatis merefresh data baru setiap 60 detik</li>
            <li>• Klik tombol <b>Detail</b> untuk melihat alamat lengkap, pesan pembeli, dan catatan penjual</li>
          </ul>
        </div>
        
      </div>

      {/* POPUP DETAIL (Sama seperti gaya popup konfirmasi stock) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Detail Pesanan
              </h2>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Info Produk */}
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-sm text-gray-500 mb-1">Produk Dipesan</p>
                <h3 className="font-bold text-lg text-gray-900 leading-tight">
                  {selectedOrder.produk}
                </h3>
                {selectedOrder.variation !== '-' && (
                  <span className="inline-block mt-2 bg-gray-300 text-gray-800 px-3 py-1 rounded-xl text-sm font-bold">
                    Variasi: {selectedOrder.variation}
                  </span>
                )}
              </div>

              {/* Grid 2 Kolom */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-100 rounded-2xl p-4">
                  <p className="text-sm text-gray-500">Order ID</p>
                  <h3 className="font-bold text-gray-900">{selectedOrder.order_id}</h3>
                </div>
                <div className="bg-gray-100 rounded-2xl p-4">
                  <p className="text-sm text-gray-500">Total Pendapatan</p>
                  <h3 className="font-bold text-green-600">{selectedOrder.total_pendapatan}</h3>
                </div>
              </div>

              {/* Grid Pembeli & Metode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-100 rounded-2xl p-4">
                  <p className="text-sm text-gray-500">Nama Pembeli</p>
                  <h3 className="font-bold text-gray-900">{selectedOrder.pembeli}</h3>
                </div>
                <div className="bg-gray-100 rounded-2xl p-4">
                  <p className="text-sm text-gray-500">Metode Bayar</p>
                  <h3 className="font-bold text-gray-900">{selectedOrder.payment_method}</h3>
                </div>
              </div>

              {/* ALAMAT (Kotak Hitam agar Stand Out) */}
              <div className="bg-black text-white rounded-2xl p-5">
                <p className="text-sm text-gray-400 mb-2">Alamat Pengiriman</p>
                <p className="font-medium text-lg leading-relaxed">
                  {selectedOrder.lokasi}
                </p>
              </div>

              {/* CATATAN & PESAN */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Pesan Pembeli:</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {selectedOrder.pesan !== '-' ? selectedOrder.pesan : 'Tidak ada pesan'}
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-500 font-medium">Catatan Penjual:</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {selectedOrder.catatan !== '-' ? selectedOrder.catatan : 'Tidak ada catatan'}
                  </p>
                </div>
              </div>

              {/* BUTTON TUTUP */}
              <div className="pt-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full bg-black hover:bg-gray-800 text-white rounded-2xl py-4 font-bold text-lg transition-all"
                >
                  Tutup Detail
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </main>
  )
}