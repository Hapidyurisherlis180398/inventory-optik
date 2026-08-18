'use client'

import Link from 'next/link'
import { useState } from 'react'

// DAFTAR ORANG LIVE (Nanti kalau ada orang baru, cukup tambah di sini)
// "slug" harus sama persis dengan akhiran nama tabel di Supabase!
const daftarHostLive = [
  { nama: 'A-Usup', slug: 'a_usup', icon: '🎥' },
  { nama: 'A-Yuska', slug: 'a_yuska', icon: '🎥' },
  { nama: 'Agil', slug: 'agil', icon: '🎥' },
  { nama: 'A-Paruk', slug: 'a_paruk', icon: '🎥' },
  { nama: 'Cabang Agung', slug: 'agung', icon: '🎥' },
  // CONTOH JIKA TAMBAH ORANG BARU:
  // { nama: 'Suparman', slug: 'suparman', icon: '😎' },
]

const menus = [
  {
    title: 'Dashboard Utama',
    description: 'Halaman utama inventory optik',
    url: 'https://inventory-optik-ten.vercel.app/',
    icon: '🏠',
  },
  {
    title: 'Belanja',
    description: 'Daftar kebutuhan pembelian stok',
    url: 'https://inventory-optik-ten.vercel.app/belanja',
    icon: '🛒',
  },
  {
    title: 'Income',
    description: 'Monitoring pemasukan',
    url: 'https://inventory-optik-ten.vercel.app/income',
    icon: '💰',
  },
  {
    title: 'Income-cabang-agung',
    description: 'Monitoring pemasukan',
    url: 'https://inventory-optik-ten.vercel.app/income-cabang-agung',
    icon: '💰',
  },
  {
    title: 'Tambah Stok',
    description: 'Menambah stok barang',
    url: 'https://inventory-optik-ten.vercel.app/tambah-stok',
    icon: '📦',
  },
  {
    title: 'Kurangi Stok',
    description: 'Mengurangi stok barang',
    url: 'https://inventory-optik-ten.vercel.app/kurangi-stok',
    icon: '📉',
  },
  {
    title: 'Laporan',
    description: 'Laporan stok dan transaksi',
    url: 'https://inventory-optik-ten.vercel.app/laporan',
    icon: '📊',
  },
  // --- INI MENU BARU YANG AKAN MEMUNCULKAN POP-UP ---
  {
    title: 'Daftar Orang Live',
    description: 'Monitoring hasil live seluruh tim',
    url: '#modal-live', // Kita pakai penanda URL khusus untuk memicu pop-up
    icon: '🔴',
  },
  // --------------------------------------------------
  {
    title: 'Scanner',
    description: 'Scan Barcode Frame',
    url: 'https://inventory-optik-ten.vercel.app/scan',
    icon: '📷',
  },
  {
    title: 'Print Barcode Frame',
    description: 'Print Barcode Frame',
    url: 'https://inventory-optik-ten.vercel.app/print-barcode',
    icon: '🖨️',
  },
  {
    title: 'Finance Tracker',
    description: 'Monitoring keuangan pribadi realtime',
    url: 'https://inventory-optik-ten.vercel.app/finance',
    icon: '💳',
  },
]

export default function HomePage() {
  // State untuk mengontrol pop-up Daftar Live
  const [showLiveModal, setShowLiveModal] = useState(false)

  return (
    <main className="min-h-screen bg-white relative">
      
      {/* ========================================== */}
      {/* MODAL POP-UP DAFTAR ORANG LIVE */}
      {/* ========================================== */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Daftar Orang Live
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Pilih host untuk melihat hasil livenya.
                </p>
              </div>
              <button
                onClick={() => setShowLiveModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full w-10 h-10 flex items-center justify-center transition-all font-bold"
              >
                ✕
              </button>
            </div>

            {/* DAFTAR HOST (GRID) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-1">
              {daftarHostLive.map((host) => (
                <Link
                  key={host.slug}
                  href={`/live/${host.slug}`} // Mengarah ke Dynamic Route yang kita buat sebelumnya
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group bg-gray-50 hover:bg-white"
                >
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    {host.icon}
                  </span>
                  <span className="font-semibold text-gray-900 text-center">
                    {host.nama}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}

      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Optik</h1>
          <p className="text-gray-500 mt-1">
            Pusat Navigasi Sistem Inventory & Monitoring Stok
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => {
            // JIKA MENU ADALAH "Daftar Orang Live", JADIKAN TOMBOL UNTUK BUKA MODAL
            if (menu.url === '#modal-live') {
              return (
                <button
                  key={menu.title}
                  onClick={() => setShowLiveModal(true)}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300 text-left"
                >
                  <div className="text-5xl mb-4">{menu.icon}</div>
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                    {menu.title}
                  </h2>
                  <p className="text-gray-500 mt-2">{menu.description}</p>
                  <div className="mt-5 flex items-center text-blue-600 font-medium">
                    Buka Daftar <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </button>
              )
            }

            // JIKA MENU BIASA, JADIKAN LINK NORMAL SEPERTI ASLINYA
            return (
              <Link
                key={menu.title}
                href={menu.url}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300"
              >
                <div className="text-5xl mb-4">{menu.icon}</div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  {menu.title}
                </h2>
                <p className="text-gray-500 mt-2">{menu.description}</p>
                <div className="mt-5 flex items-center text-blue-600 font-medium">
                  Buka Halaman
                  <span className="ml-2 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Inventory Optik • Teammyhappyd
        </div>
      </footer>
    </main>
  )
}