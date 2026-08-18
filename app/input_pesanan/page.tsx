'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase' // Sesuaikan dengan lokasi supabase kamu
import * as XLSX from 'xlsx'

// GENERATE OTOMATIS TOKO 1 SAMPAI TOKO 50
const daftarToko = Array.from({ length: 50 }, (_, i) => `TOKO ${i + 1}`)

export default function InputPesananPage() {
  // --- STATE UNTUK MENAMPUNG DAFTAR HOST DARI DATABASE ---
  const [daftarHostLive, setDaftarHostLive] = useState<any[]>([])

  // --- STATE PENGATURAN UTAMA ---
  const [targetHost, setTargetHost] = useState('') 
  const [globalToko, setGlobalToko] = useState('TOKO 1') 
  const [loading, setLoading] = useState(false)

  // --- STATE UNTUK BARIS INPUT ---
  const [rows, setRows] = useState([{ idPesanan: '' }])

  // --- STATE UNTUK MODAL PIN ---
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')

  // 1. MENGAMBIL DAFTAR HOST DARI SUPABASE SAAT HALAMAN DIBUKA
  useEffect(() => {
    async function fetchHostDariDatabase() {
      const { data, error } = await supabase
        .from('daftar_host_live')
        .select('*')
        .order('id', { ascending: true })
      
      if (data && !error) {
        setDaftarHostLive(data)
      }
    }
    fetchHostDariDatabase()
  }, [])

  // 2. FUNGSI KETIKA MENGETIK DI KOLOM ID PESANAN
  const handleInputChange = (index: number, value: string) => {
    const newRows = [...rows]
    newRows[index].idPesanan = value
    setRows(newRows)

    // Fitur Magic: Jika ngetik di baris paling bawah, otomatis bikin baris kosong baru!
    if (index === rows.length - 1 && value.trim() !== '') {
      setRows([...newRows, { idPesanan: '' }])
    }
  }

  // 3. FUNGSI UNTUK MENGHAPUS BARIS JIKA SALAH
  const hapusBaris = (index: number) => {
    if (rows.length === 1) {
      setRows([{ idPesanan: '' }])
      return
    }
    const newRows = rows.filter((_, i) => i !== index)
    setRows(newRows)
  }

  // 4. FUNGSI UNTUK MEMBACA EXCEL LALU DIMASUKKAN KE TABEL LAYAR
  const handleUploadExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

    // Ekstrak ID Pesanan dari Excel
    const dataDariExcel = jsonData
      .map((item) => ({
        // Coba baca kolom 'ID Pesanan/Penyesuaian' atau 'ID Pesanan'
        idPesanan: (item['ID Pesanan/Penyesuaian'] || item['ID Pesanan'] || '')?.toString().trim()
      }))
      .filter((item) => item.idPesanan !== '') // Buang yang kosong

    if (dataDariExcel.length === 0) {
      alert('Tidak ditemukan data pada kolom "ID Pesanan" di file Excel.')
      event.target.value = ''
      return
    }

    // Gabungkan data lama yang sudah diketik dengan data baru dari Excel
    const barisLamaValid = rows.filter((r) => r.idPesanan.trim() !== '')
    
    // Tambahkan 1 baris kosong di bagian paling bawah untuk pancingan ngetik manual selanjutnya
    setRows([...barisLamaValid, ...dataDariExcel, { idPesanan: '' }])
    
    alert(`Berhasil memuat ${dataDariExcel.length} data dari Excel ke dalam tabel.`)
    event.target.value = '' // Reset input file
  }

  // 5. FUNGSI KETIKA TOMBOL "KIRIM DATA" DIKLIK (HANYA MEMUNCULKAN MODAL)
  const klikTombolKirim = () => {
    if (!targetHost) {
      alert('Tolong pilih Host (Tujuan Data) terlebih dahulu!')
      return
    }

    const validRows = rows.filter((row) => row.idPesanan.trim() !== '')
    if (validRows.length === 0) {
      alert('Belum ada ID Pesanan yang dimasukkan!')
      return
    }

    // Jika aman, munculkan modal PIN
    setShowPinModal(true)
  }

  // 6. FUNGSI EKSEKUSI KIRIM KE SUPABASE (SETELAH PIN BENAR)
  const prosesKirimData = async () => {
    // Cek PIN
    if (pinInput !== '!@#$%') {
      alert('PIN salah!')
      setPinInput('')
      return
    }

    // Jika PIN benar, tutup modal
    setShowPinModal(false)
    setPinInput('')
    setLoading(true)

    const tableName = `live_reports_${targetHost}`
    const validRows = rows.filter((row) => row.idPesanan.trim() !== '')
    let successCount = 0
    let duplicateCount = 0

    // Loop data untuk dimasukkan ke database satu per satu
    for (let i = 0; i < validRows.length; i++) {
      const orderId = validRows[i].idPesanan.trim()

      // Cek duplicate
      const { data: existing } = await supabase
        .from(tableName)
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle()

      if (existing) {
        duplicateCount++
        continue
      }

      // Insert ke Database
      await supabase.from(tableName).insert([
        {
          nomor: (i + 1).toString(), // Nomor berurutan
          order_id: orderId,
          toko: globalToko, // Otomatis mengikuti pilihan Toko dari dropdown atas
          total_pendapatan: '', // Dikosongkan untuk diisi nanti
          status: 'BELUM DIBAYAR', // Default Status
        },
      ])
      
      successCount++
    }

    setLoading(false)
    alert(
      `Selesai!\nBerhasil terkirim: ${successCount} pesanan.\nData ganda (dilewati): ${duplicateCount}`
    )
    
    // Reset form ke awal
    setRows([{ idPesanan: '' }])
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 px-4 md:px-8 relative">
      
      {/* ========================================== */}
      {/* MODAL POP-UP PIN (UNTUK KIRIM DATA) */}
      {/* ========================================== */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Masukkan PIN Pengiriman
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Silakan masukkan PIN untuk mengirim data ke tabel {targetHost.replace(/_/g, ' ').toUpperCase()}.
            </p>
            <input
              type="password"
              placeholder="•••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') prosesKirimData()
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPinModal(false)
                  setPinInput('')
                }}
                className="px-5 py-3 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-all"
              >
                Batal
              </button>
              <button
                onClick={prosesKirimData}
                className="bg-blue-600 hover:bg-blue-700 transition-all text-white px-6 py-3 rounded-xl font-semibold shadow-sm"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}


      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & PENGATURAN GLOBAL */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Input Pesanan Baru</h1>
          <p className="text-gray-500 mb-8">Masukkan data pesanan secara manual atau upload via Excel.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* DROPDOWN PILIH HOST (DINAMIS DARI DATABASE) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tujuan Data (Host) <span className="text-red-500">*</span>
              </label>
              <select
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="" disabled>-- Pilih Host Tujuan --</option>
                {daftarHostLive.map((host) => (
                  <option key={host.slug} value={host.slug}>
                    {host.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* DROPDOWN PILIH TOKO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Pilih Toko (Terapkan ke Semua)
              </label>
              <select
                value={globalToko}
                onChange={(e) => setGlobalToko(e.target.value)}
                className="w-full bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
              >
                {daftarToko.map((toko) => (
                  <option key={toko} value={toko}>
                    {toko}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* AREA TABEL INPUT */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Daftar Pesanan</h2>
              <div className="text-sm text-gray-500 font-medium mt-1">
                Total Baris Terisi: <span className="text-blue-600 font-bold">{rows.filter(r => r.idPesanan.trim() !== '').length}</span>
              </div>
            </div>

            {/* TOMBOL UPLOAD EXCEL */}
            <label className="bg-white border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all px-5 py-2.5 rounded-xl cursor-pointer font-semibold shadow-sm inline-flex items-center gap-2">
              <span className="text-lg">📁</span> Ambil dari Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUploadExcel}
                className="hidden"
              />
            </label>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-white">
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-6 text-sm font-bold text-gray-500 uppercase w-20 text-center">No</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-500 uppercase">ID Pesanan / Penyesuaian</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-500 uppercase w-48">Toko</th>
                  <th className="py-4 px-6 text-sm font-bold text-gray-500 uppercase w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const isKosong = row.idPesanan.trim() === ''
                  
                  return (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-6 text-center font-bold text-gray-400">
                        {isKosong ? '-' : index + 1}
                      </td>

                      <td className="py-3 px-6">
                        <input
                          type="text"
                          placeholder="Ketik / Scan ID Pesanan di sini..."
                          value={row.idPesanan}
                          onChange={(e) => handleInputChange(index, e.target.value)}
                          className="w-full bg-transparent border-b-2 border-gray-200 focus:border-blue-500 py-2 outline-none font-medium text-gray-900 transition-colors placeholder:text-gray-300"
                        />
                      </td>

                      <td className="py-3 px-6">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ${isKosong ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700'}`}>
                          {globalToko}
                        </span>
                      </td>

                      <td className="py-3 px-6 text-center">
                        <button
                          onClick={() => hapusBaris(index)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all font-bold"
                          title="Hapus Baris"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* AREA TOMBOL KIRIM DATA */}
          <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
            <button
              onClick={klikTombolKirim}
              disabled={loading}
              className={`px-8 py-4 rounded-xl font-bold text-white transition-all shadow-lg ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-1'
              }`}
            >
              {loading ? 'Memproses...' : '🚀 Kirim Data ke Database'}
            </button>
          </div>
        </div>
        
      </div>
    </main>
  )
}