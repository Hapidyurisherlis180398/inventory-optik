'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase' // Sesuaikan path supabase kamu!

// DAFTAR MENU UTAMA
const menus = [
  {
    title: 'Daftar Orang Live',
    description: 'Monitoring hasil live seluruh tim secara realtime',
    url: '#modal-live', 
    icon: '🔴',
  },
  // Kamu bisa menambahkan menu lain di bawah ini jika diperlukan
]

// Array warna untuk mempercantik ikon (dipilih secara acak / bergantian nanti)
const pilihanWarna = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-orange-500 to-yellow-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-red-400',
  'from-indigo-500 to-blue-400'
]

export default function HomePage() {
  const [showLiveModal, setShowLiveModal] = useState(false)
  const [daftarHostLive, setDaftarHostLive] = useState<any[]>([])
  const [loadingHost, setLoadingHost] = useState(false)

  // MENGAMBIL DATA HOST DARI SUPABASE
  useEffect(() => {
    async function fetchHost() {
      setLoadingHost(true)
      const { data, error } = await supabase
        .from('daftar_host_live_agung')
        .select('*')
        .order('id', { ascending: true })
      
      if (data && !error) {
        setDaftarHostLive(data)
      }
      setLoadingHost(false)
    }
    
    fetchHost()
  }, [])

  return (
    <main className="min-h-screen bg-[#F8FAFC] relative selection:bg-blue-200 selection:text-blue-900">
      
      {/* ========================================== */}
      {/* MODAL POP-UP DAFTAR ORANG LIVE (ENHANCED) */}
      {/* ========================================== */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* BACKDROP BLUR & OVERLAY */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLiveModal(false)}
          ></div>

          {/* KOTAK MODAL */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 w-full max-w-3xl shadow-2xl relative border border-white/50 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex justify-between items-start mb-8 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                  Daftar Orang Live
                </h3>
                <p className="text-gray-500 text-sm mt-2 font-medium">
                  Pilih host untuk melihat laporan hasil livenya.
                </p>
              </div>
              <button
                onClick={() => setShowLiveModal(false)}
                className="bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 font-bold shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* DAFTAR HOST (GRID) DARI SUPABASE */}
            {loadingHost ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-pulse text-gray-400 font-medium">Memuat data host...</div>
              </div>
            ) : daftarHostLive.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-2xl border border-dashed">
                Belum ada host yang didaftarkan.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 max-h-[60vh] overflow-y-auto pb-4 px-2 custom-scrollbar">
                {daftarHostLive.map((host, index) => {
                  // Memilih warna secara bergantian dari array pilihanWarna
                  const warnaCard = pilihanWarna[index % pilihanWarna.length]

                  return (
                    <Link
                      key={host.id}
                      href={`/live/${host.slug}`}
                      className="relative group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Efek gradient melayang di background saat dihover */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${warnaCard}`}></div>
                      
                      <div className="flex flex-col items-center justify-center relative z-10">
                        <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-2xl bg-gray-50 group-hover:bg-white group-hover:scale-110 shadow-inner group-hover:shadow-md transition-all duration-300 text-3xl">
                          {/* Jika di Supabase belum ada kolom Icon, kita pakai default 🎥 */}
                          {host.icon || '🎥'}
                        </div>
                        <span className="font-bold text-gray-700 group-hover:text-gray-900 text-center text-lg">
                          {host.nama}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ========================================== */}

      {/* HEADER / HERO SECTION YANG MODERN */}
      <div className="relative bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[100px] -right-[100px] w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-[100px] -left-[100px] w-96 h-96 bg-purple-50 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
              Inventory <span className="text-blue-600">Optik</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Pusat Navigasi Sistem Inventory & Monitoring Stok
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT / MENU UTAMA */}
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-0">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => {
            if (menu.url === '#modal-live') {
              return (
                <button
                  key={menu.title}
                  onClick={() => setShowLiveModal(true)}
                  className="group relative overflow-hidden bg-white rounded-[2rem] p-8 border border-gray-200 hover:border-transparent shadow-sm hover:shadow-2xl transition-all duration-500 text-left hover:-translate-y-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                  <div className="absolute inset-[2px] bg-white rounded-[calc(2rem-2px)] z-0"></div>
                  
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-4xl mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-500">
                      {menu.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {menu.title}
                    </h2>
                    <p className="text-gray-500 mt-3 font-medium leading-relaxed">
                      {menu.description}
                    </p>
                    <div className="mt-8 flex items-center text-blue-600 font-bold bg-blue-50 w-max px-4 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      Buka Daftar 
                      <span className="ml-2 transform group-hover:translate-x-2 transition-transform duration-300">
                        →
                      </span>
                    </div>
                  </div>
                </button>
              )
            }

            return (
              <Link
                key={menu.title}
                href={menu.url}
                className="group relative overflow-hidden bg-white rounded-[2rem] p-8 border border-gray-200 hover:border-transparent shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                <div className="absolute inset-[2px] bg-white rounded-[calc(2rem-2px)] z-0"></div>

                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-4xl mb-6 group-hover:scale-110 group-hover:bg-gray-100 transition-all duration-500">
                    {menu.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                    {menu.title}
                  </h2>
                  <p className="text-gray-500 mt-3 font-medium leading-relaxed">
                    {menu.description}
                  </p>
                  <div className="mt-8 flex items-center text-gray-600 font-bold bg-gray-50 w-max px-4 py-2 rounded-xl group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                    Buka Halaman
                    <span className="ml-2 transform group-hover:translate-x-2 transition-transform duration-300">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 mt-auto bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm font-medium text-gray-500">
          <p>© {new Date().getFullYear()} Inventory Optik. All rights reserved.</p>
          <div className="mt-2 md:mt-0 flex items-center gap-2">
            Built by <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Teammyhappyd</span>
          </div>
        </div>
      </footer>
    </main>
  )
}