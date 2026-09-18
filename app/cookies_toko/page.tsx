'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function CookiesTokoPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [totalToko, setTotalToko] = useState(0)
  
  // State untuk form Tambah Toko
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nama_toko: '',
    seller_id: '',
    cookies: '' // Akan menampung teks paste JSON
  })

  // ==========================================
  // 1. MENGAMBIL SEMUA DATA DARI DATABASE
  // ==========================================
  async function getData() {
    setLoading(true)
    
    // PERUBAHAN: Menambahkan status_cookie dan terakhir_update pada query select
    const { data: tokoData, error } = await supabase
      .from('data_toko')
      .select('id, nama_toko, seller_id, created_at, cookies, status_cookie, terakhir_update')
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Gagal mengambil data:", error)
    } else if (tokoData) {
      setData(tokoData)
      setTotalToko(tokoData.length)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

  // ==========================================
  // 2. FUNGSI UTILITAS FORMATTING
  // ==========================================
  function formatTanggal(dateString: any) {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    } catch (e) {
      return String(dateString)
    }
  }

  // PERUBAHAN: Fungsi baru untuk menyalin cookies ke clipboard
  async function handleCopyCookies(cookiesData: any) {
    if (!cookiesData || cookiesData.length === 0) {
      alert("⚠️ Cookies kosong, tidak ada yang disalin.")
      return
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(cookiesData, null, 2))
      alert("✅ Cookies berhasil disalin ke clipboard!")
    } catch (err) {
      alert("❌ Gagal menyalin cookies.")
    }
  }

  // ==========================================
  // 3. FUNGSI TAMBAH & HAPUS TOKO
  // ==========================================
  async function handleSimpanToko(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Validasi Input JSON Cookies
      let parsedCookies;
      try {
        parsedCookies = JSON.parse(formData.cookies)
        if (!Array.isArray(parsedCookies)) {
          throw new Error("Format tidak valid.")
        }
      } catch (err) {
        alert("❌ Gagal: Teks Cookies bukan format JSON Array yang valid. Pastikan Anda mem-paste langsung hasil export dari Cookie-Editor.")
        setLoading(false)
        return
      }

      // 2. Cek Duplikat Seller ID
      const { data: existing } = await supabase
        .from('data_toko')
        .select('id, seller_id')
        .eq('seller_id', formData.seller_id)
        .single()

      if (existing) {
        // PERUBAHAN: Jika toko sudah ada, kita UPDATE cookies-nya, bukan ditolak
        const { error: updateError } = await supabase
          .from('data_toko')
          .update({ 
            nama_toko: formData.nama_toko, 
            cookies: parsedCookies,
            status_cookie: null // Reset status agar dicek ulang oleh script pemanasan
          })
          .eq('seller_id', formData.seller_id)

        if (updateError) throw updateError
        alert(`✅ Berhasil! Cookies untuk toko ${formData.nama_toko} telah diperbarui.`)
      } else {
        // 3. Insert ke Supabase jika toko belum ada
        const { error: insertError } = await supabase
          .from('data_toko')
          .insert([{
            nama_toko: formData.nama_toko,
            seller_id: formData.seller_id,
            cookies: parsedCookies
          }])

        if (insertError) throw insertError
        alert(`✅ Berhasil! Toko ${formData.nama_toko} telah ditambahkan.`)
      }
      
      // Reset Form & Refresh Data
      setShowForm(false)
      setFormData({ nama_toko: '', seller_id: '', cookies: '' })
      getData()

    } catch (err: any) {
      console.error("Error Simpan:", err)
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleHapusToko(id: string, namaToko: string) {
    // PERUBAHAN: Konfirmasi diperjelas bahwa hanya cookies yang dihapus
    if (!window.confirm(`⚠️ Yakin ingin menghapus COOKIES toko "${namaToko}"?\n(Nama Toko dan Seller ID akan tetap aman tersimpan)`)) return

    setLoading(true)
    // PERUBAHAN: Menggunakan update() untuk mengosongkan cookies, BUKAN delete()
    const { error } = await supabase
      .from('data_toko')
      .update({ cookies: [], status_cookie: 'MATI' })
      .eq('id', id)
    
    if (error) {
      alert(`Gagal menghapus cookies: ${error.message}`)
    } else {
      getData()
    }
    setLoading(false)
  }

  // ==========================================
  // 4. RENDER TAMPILAN HALAMAN (UI)
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto relative">
        
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-purple-600 mb-2 tracking-wide">
                MULTI-STORE MANAGEMENT
              </p>
              <h1 className="text-4xl font-bold text-gray-900">DATA COOKIES TOKO</h1>
              <p className="text-gray-500 mt-3">
                Kelola akun dan kredensial cookies untuk mengaktifkan scraper otomatis.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button 
                onClick={() => setShowForm(true)}
                disabled={loading}
                className={`transition-all px-6 py-4 rounded-2xl font-semibold shadow-sm flex items-center gap-2 ${
                  loading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-black hover:bg-gray-800 text-white'
                }`}
              >
                {loading ? 'Memproses...' : '➕ Tambah / Update Toko'}
              </button>
            </div>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading && !showForm && (
          <div className="mb-6 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 font-medium animate-pulse flex items-center gap-3">
            <span className="text-xl">⏳</span> Sedang memproses data ke server, mohon tunggu...
          </div>
        )}

        {/* TOTAL CARDS */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 text-2xl">
              🏪
            </div>
            <p className="text-sm text-gray-500 mb-2">Total Toko Terdaftar</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {totalToko.toLocaleString('id-ID')} <span className="text-lg font-medium text-gray-500">Toko</span>
            </h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4 text-2xl">
              🛡️
            </div>
            <p className="text-sm text-gray-500 mb-2">Status Keamanan</p>
            <h2 className="text-3xl font-bold text-green-700">
              RLS Aktif
            </h2>
          </div>
        </div>

        {/* TABEL DATA TOKO */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daftar Toko Tersimpan</h2>
              <p className="text-gray-500 text-sm mt-2">
                Detail token disembunyikan untuk menjaga keamanan kredensial.
              </p>
            </div>
          </div>

          <div className="overflow-auto max-h-[600px]">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Nama Toko</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Seller ID</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Status Cookies</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Terakhir Update</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Tgl Input</th>
                  <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="text-center p-12 text-gray-500">
                      Belum ada toko yang didaftarkan. Silakan klik "Tambah / Update Toko".
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition-all text-sm">
                      <td className="p-4 font-medium text-gray-700">{index + 1}</td>
                      <td className="p-4 font-bold text-gray-900">{item.nama_toko}</td>
                      <td className="p-4 font-mono text-gray-600 bg-gray-100 rounded px-2">{item.seller_id}</td>
                      
                      {/* PERUBAHAN: Render Status Cookies Dinamis */}
                      <td className="p-4">
                        {item.status_cookie === 'HIDUP' ? (
                          <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                            ✅ HIDUP ({Array.isArray(item.cookies) ? item.cookies.length : 0})
                          </span>
                        ) : item.status_cookie === 'MATI' ? (
                          <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                            ❌ MATI ({Array.isArray(item.cookies) ? item.cookies.length : 0})
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-bold">
                            ❓ Belum Dicek ({Array.isArray(item.cookies) ? item.cookies.length : 0})
                          </span>
                        )}
                      </td>
                      
                      {/* PERUBAHAN: Tambahan Kolom Terakhir Update */}
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        {formatTanggal(item.terakhir_update)}
                      </td>

                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        {formatTanggal(item.created_at)}
                      </td>

                      {/* PERUBAHAN: Tambahan Tombol Copy Cookies */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleCopyCookies(item.cookies)}
                            className="text-blue-600 hover:text-blue-800 font-semibold px-3 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Copy
                          </button>
                          <button 
                            onClick={() => handleHapusToko(item.id, item.nama_toko)}
                            className="text-red-500 hover:text-red-700 font-semibold px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FORM TAMBAH TOKO */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-xl animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tambah / Update Toko</h2>
              <p className="text-gray-500 mb-6 text-sm">Masukkan informasi toko dan paste file `cookies.json` dari Cookie-Editor. Jika Seller ID sudah ada, cookies akan otomatis diperbarui.</p>
              
              <form onSubmit={handleSimpanToko} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Toko (Bebas)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Toko Kacamata Utama"
                    value={formData.nama_toko}
                    onChange={(e) => setFormData({...formData, nama_toko: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Seller ID (Angka Unik)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: 7495876132830743149"
                    value={formData.seller_id}
                    onChange={(e) => setFormData({...formData, seller_id: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Paste Raw JSON Cookies</label>
                  <textarea 
                    required
                    rows={6}
                    placeholder={`Paste di sini hasilnya...\n[ \n  { "name": "...", "value": "..." },\n  ... \n]`}
                    value={formData.cookies}
                    onChange={(e) => setFormData({...formData, cookies: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono text-xs bg-gray-50"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="flex-1 p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 p-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Toko'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}