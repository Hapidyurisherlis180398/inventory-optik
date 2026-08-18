'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AturHostPage() {
  const [daftarHost, setDaftarHost] = useState<any[]>([])
  
  // State untuk Fitur Magic Paste
  const [pasteTabel, setPasteTabel] = useState('')
  
  const [namaBaru, setNamaBaru] = useState('')
  const [slugBaru, setSlugBaru] = useState('')
  const [loading, setLoading] = useState(false)

  // Mengambil data daftar host dari Supabase
  async function fetchHost() {
    const { data } = await supabase.from('daftar_host_live').select('*').order('id', { ascending: true })
    if (data) setDaftarHost(data)
  }

  useEffect(() => {
    fetchHost()
  }, [])

  // ==========================================
  // FUNGSI AJAIB: AUTO-FILL DARI PASTE NAMA TABEL
  // ==========================================
  const handlePasteTabel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const teksTabel = e.target.value
    setPasteTabel(teksTabel)

    // Deteksi jika teks yang dipaste mengandung kata 'live_reports_'
    if (teksTabel.includes('live_reports_')) {
      // 1. Ekstrak Slug (Potong kata 'live_reports_') -> misal 'malangbong'
      const extractedSlug = teksTabel.replace('live_reports_', '').trim().toLowerCase()
      
      // 2. Format Nama (Ubah underscore jadi spasi, huruf depan Kapital) -> misal 'a_paruk' jadi 'A Paruk'
      const formattedName = extractedSlug
        .split('_')
        .map(kata => kata.charAt(0).toUpperCase() + kata.slice(1))
        .join(' ')

      // Otomatis isi kolom di bawahnya!
      setSlugBaru(extractedSlug)
      setNamaBaru(formattedName)
    }
  }

  // Fungsi Tambah Host Baru
  async function tambahHost() {
    if (!namaBaru || !slugBaru) {
      alert('Nama dan Slug harus diisi!')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('daftar_host_live').insert([
      { nama: namaBaru, slug: slugBaru.toLowerCase().replace(/ /g, '_') }
    ])

    if (error) {
      alert('Gagal menambah host! Pastikan host ini belum pernah ditambahkan sebelumnya.')
    } else {
      alert('Berhasil! Pastikan kamu juga sudah membuat tabel fisik live_reports_' + slugBaru + ' di Supabase ya.')
      setPasteTabel('') // Kosongkan input magic paste
      setNamaBaru('')
      setSlugBaru('')
      fetchHost()
    }
    setLoading(false)
  }

  // Fungsi Hapus Host
  async function hapusHost(id: string) {
    if (!confirm('Yakin ingin menghapus host ini dari daftar dropdown?')) return

    await supabase.from('daftar_host_live').delete().eq('id', id)
    fetchHost()
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* KOTAK INPUT HOST BARU */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
          <h1 className="text-2xl font-bold mb-2">Atur Daftar Host / Cabang</h1>
          <p className="text-gray-500 mb-6 text-sm">Tambahkan host agar otomatis muncul di menu Input Pesanan.</p>
          
          {/* INPUT MAGIC PASTE */}
          <div className="mb-6 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
            <label className="block text-sm font-bold text-blue-800 mb-2">
              ✨ Cara Cepat: Paste Nama Tabel Supabase di sini
            </label>
            <input 
              type="text" 
              placeholder="Contoh Paste: live_reports_malangbong" 
              value={pasteTabel}
              onChange={handlePasteTabel}
              className="w-full border border-blue-200 bg-white p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 font-medium placeholder:text-blue-300 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nama Tampilan Dropdown</label>
              <input 
                type="text" 
                placeholder="Contoh: Malangbong" 
                value={namaBaru}
                onChange={(e) => setNamaBaru(e.target.value)}
                className="w-full border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Slug (Kata setelah live_reports_)</label>
              <input 
                type="text" 
                placeholder="Contoh: malangbong" 
                value={slugBaru}
                onChange={(e) => setSlugBaru(e.target.value)}
                className="w-full border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <button 
            onClick={tambahHost}
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-md"
          >
            {loading ? 'Menyimpan ke Database...' : '+ Tambahkan Host Ini'}
          </button>
        </div>

        {/* DAFTAR HOST SAAT INI */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Daftar Host Saat Ini</h2>
          
          {daftarHost.length === 0 ? (
            <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Belum ada host yang didaftarkan.
            </div>
          ) : (
            <div className="space-y-3">
              {daftarHost.map((host, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl border border-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{host.nama}</div>
                      <div className="text-sm font-medium text-gray-500 mt-0.5">
                        Tabel: <code className="text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded">live_reports_{host.slug}</code>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => hapusHost(host.id)} 
                    className="text-red-400 hover:text-red-600 hover:bg-red-100 p-3 rounded-xl font-bold transition-all"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}