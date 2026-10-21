'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation' 
import { supabase } from '../../../lib/supabase' 
import * as XLSX from 'xlsx'

export default function DynamicLiveReportPage() {
  const params = useParams()
  const host = params.host as string 

  const tableName = `live_reports_${host}`
  const displayName = host ? host.replace(/_/g, ' ').toUpperCase() : ''

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [laporanWaktu, setLaporanWaktu] = useState<any[]>([])
  const [totalTerbayar, setTotalTerbayar] = useState(0)

  // --- STATE UNTUK PENYIMPANAN KETERANGAN LOKAL ---
  const [localKeterangan, setLocalKeterangan] = useState<Record<string, string>>({})

  // --- STATE UNTUK SELEKSI MASSAL (CHECKBOX) ---
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  // --- STATE UNTUK MODAL UPLOAD ---
  const [showModalUpload, setShowModalUpload] = useState(false)
  const [pinUpload, setPinUpload] = useState('')
  const [tempFile, setTempFile] = useState<File | null>(null)

  // --- STATE UNTUK MODAL LUNASI BATCH ---
  const [showModalLunasi, setShowModalLunasi] = useState(false)
  const [pinLunasi, setPinLunasi] = useState('')
  const [tempWaktu, setTempWaktu] = useState<string>('')
  
  // --- STATE UNTUK MODAL KETERANGAN ---
  const [showModalKeterangan, setShowModalKeterangan] = useState(false)
  const [pinKeterangan, setPinKeterangan] = useState('')
  const [keteranganText, setKeteranganText] = useState('')

  // --- STATE UNTUK PENCARIAN ID PESANAN ---
  const [searchQuery, setSearchQuery] = useState('')

  // Ambil Password dari Environment Variable agar tidak hardcode di file ini
  const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN

  useEffect(() => {
    if (host) {
      const savedData = localStorage.getItem(`keterangan_${host}`)
      if (savedData) {
        try {
          setLocalKeterangan(JSON.parse(savedData))
        } catch (error) {
          console.error("Gagal memuat data keterangan lokal", error)
        }
      }
    }
  }, [host])

  async function getData() {
    setLoading(true)
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: true })

    if (!error && data) {
      const orderIds = data.map((item) => item.order_id).filter(Boolean)
      const pengirimanMap = new Map()

      if (orderIds.length > 0) {
        const { data: pengirimanData, error: errPengiriman } = await supabase
          .from('data_pengiriman')
          .select('order_id, created_time, paid_time, variation, payment_method, creator_handle')
          .in('order_id', orderIds)

        if (!errPengiriman && pengirimanData) {
          pengirimanData.forEach((p) => {
            pengirimanMap.set(p.order_id, {
              created_time: p.created_time, 
              paid_time: p.paid_time, 
              variation: p.variation,
              payment_method: p.payment_method,
              creator_handle: p.creator_handle,
            })
          })
        }
      }

      const mergedData = data.map((item) => {
        const infoPengiriman = pengirimanMap.get(item.order_id)
        
        let waktuDibuat = null;
        if (infoPengiriman) {
          const payMethod = infoPengiriman.payment_method || '';
          if (payMethod.toLowerCase().includes('bayar di tempat')) {
            waktuDibuat = infoPengiriman.created_time;
          } else {
            waktuDibuat = infoPengiriman.paid_time;
          }
        }

        return {
          ...item,
          waktu_orderan_dibuat: waktuDibuat,
          variasi_produk: infoPengiriman?.variation || '-',
          payment_method: infoPengiriman?.payment_method || '-',
          creator_handle: infoPengiriman?.creator_handle || '-',
        }
      })

      setData(mergedData) 

      const totalBayarSemua = mergedData.reduce((sum, item) => {
        if (item.status && item.status.includes('TERBAYAR')) {
          const angka = Number(item.total_pendapatan?.toString().replace(/[^\d-]/g, ''))
          return sum + (angka || 0)
        }
        return sum
      }, 0)

      setTotalTerbayar(totalBayarSemua)

      const group: any = {}
      mergedData.forEach((item) => {
        if (item.status && item.status.includes('TERBAYAR')) {
          const waktu = item.status
          const angka = Number(item.total_pendapatan?.toString().replace(/[^\d-]/g, ''))
          if (!group[waktu]) group[waktu] = { total: 0, jumlahPesanan: 0 }
          group[waktu].total += angka || 0
          group[waktu].jumlahPesanan += 1
        }
      })

      const hasilGroup = Object.entries(group).map(([waktu, value]: any) => ({
        waktu, total: value.total, jumlahPesanan: value.jumlahPesanan,
      }))

      setLaporanWaktu(hasilGroup.reverse())
    }
    setLoading(false)
  }

  useEffect(() => {
    if (host) getData()
  }, [host])

  function formatRupiah(angka: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka)
  }

  function formatTanggal(rawString: string) {
    if (!rawString) return '-';
    let validString = rawString.replace(' ', 'T');
    if (!validString.includes('Z') && !validString.includes('+')) validString += 'Z';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', 
    }).format(new Date(validString));
  }

  function exportBelumTerbayar() {
    const belumTerbayar = data.filter((item) => !item.status || !item.status.includes('TERBAYAR'))
    if (belumTerbayar.length === 0) return alert('Tidak ada data belum terbayar')

    const exportData = belumTerbayar.map((item, index) => ({
      NO: index + 1, 'ID Pesanan': item.order_id, TOKO: item.toko,
      'Total Pendapatan': item.total_pendapatan, STATUS: item.status || 'BELUM DIBAYAR',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Belum Dibayar')
    
    const tanggal = new Date().toLocaleDateString('id-ID').replace(/\//g, '-')
    XLSX.writeFile(workbook, `${host.replace(/_/g, '-').toUpperCase()}-BELUM-DIBAYAR-${tanggal}.xlsx`)
  }

  function handleSelectFileExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setTempFile(file)
    setShowModalUpload(true)
    event.target.value = ''
  }

  async function prosesUploadExcel() {
    if (pinUpload !== ADMIN_PIN) {
      alert('PIN salah')
      setPinUpload('')
      return
    }

    setShowModalUpload(false)
    setPinUpload('')
    if (!tempFile) return
    setLoading(true)

    const buffer = await tempFile.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

    for (const item of jsonData) {
      const orderId = item['ID Pesanan/Penyesuaian']?.toString()
      if (!orderId) continue

      const { data: existing } = await supabase.from(tableName).select('id').eq('order_id', orderId).maybeSingle()
      if (existing) continue

      await supabase.from(tableName).insert([{
        nomor: item['NO']?.toString() || '', order_id: orderId, toko: item['TOKO']?.toString() || '',
        total_pendapatan: item['Total Pendapatan']?.toString() || '', status: item['STATUS']?.toString() || '',
      }])
    }

    alert(`Upload data ${displayName} selesai`)
    setTempFile(null)
    getData()
    setLoading(false)
  }

  function handleKlikLunasi(waktu: string) {
    setTempWaktu(waktu)
    setShowModalLunasi(true)
  }

  async function prosesLunasiBatch() {
    // Note: Anda juga bisa menggunakan ADMIN_PIN di sini jika ingin password seragam
    if (pinLunasi !== '123') {
      alert('Password salah')
      setPinLunasi('')
      return
    }

    setShowModalLunasi(false)
    setPinLunasi('')

    const { data: rows } = await supabase.from(tableName).select('*').eq('status', tempWaktu)
    if (!rows || rows.length === 0) return alert('Data tidak ditemukan')

    await supabase.from(tableName).delete().eq('status', tempWaktu)
    alert(`Batch ${displayName} berhasil dilunasi`)
    getData()
  }

  // --- FUNGSI UNTUK SELEKSI MASSAL ---
  const filteredData = data.filter((item) => {
    if (searchQuery === '') return true
    return item.order_id?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedOrders(filteredData.map((item) => item.order_id))
    } else {
      setSelectedOrders([])
    }
  }

  function handleSelectOne(orderId: string) {
    setSelectedOrders((prev) => 
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    )
  }

  // --- FUNGSI UNTUK MENYIMPAN KETERANGAN ---
  function prosesSimpanKeterangan() {
    if (pinKeterangan !== ADMIN_PIN) {
      alert('Password salah')
      setPinKeterangan('')
      return
    }

    if (selectedOrders.length === 0) return

    const updatedData = { ...localKeterangan }
    // Memasukkan keterangan yang sama ke semua ID yang terpilih
    selectedOrders.forEach(id => {
      updatedData[id] = keteranganText
    })
    
    setLocalKeterangan(updatedData)
    localStorage.setItem(`keterangan_${host}`, JSON.stringify(updatedData))

    setShowModalKeterangan(false)
    setPinKeterangan('')
    setKeteranganText('')
    setSelectedOrders([]) // Hapus seleksi setelah selesai disimpan
  }

  if (!host) return <div className="min-h-screen bg-white" />

  return (
    <main className="min-h-screen bg-white p-4 md:p-8 relative">
      
      {/* MODAL UPLOAD EXCEL */}
      {showModalUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Masukkan PIN Upload</h3>
            <input
              type="password"
              placeholder="•••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 bg-white"
              value={pinUpload}
              onChange={(e) => setPinUpload(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') prosesUploadExcel() }}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowModalUpload(false); setPinUpload(''); setTempFile(null) }} className="px-5 py-3 rounded-xl text-gray-600 font-semibold hover:bg-gray-100">Batal</button>
              <button onClick={prosesUploadExcel} className="bg-black text-white px-6 py-3 rounded-xl font-semibold">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LUNASI */}
      {showModalLunasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Masukkan Password</h3>
            <input
              type="password"
              placeholder="•••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 bg-white"
              value={pinLunasi}
              onChange={(e) => setPinLunasi(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') prosesLunasiBatch() }}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowModalLunasi(false); setPinLunasi('') }} className="px-5 py-3 rounded-xl text-gray-600 font-semibold hover:bg-gray-100">Batal</button>
              <button onClick={prosesLunasiBatch} className="bg-black text-white px-6 py-3 rounded-xl font-semibold">Lunasi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KETERANGAN DATA MASSAL */}
      {showModalKeterangan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Input Keterangan
            </h3>
            <p className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block mb-4">
              Terpilih: {selectedOrders.length} Pesanan
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Baru</label>
              <textarea
                placeholder="Tulis keterangan manual..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black min-h-[100px] text-gray-900 bg-white"
                value={keteranganText}
                onChange={(e) => setKeteranganText(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="•••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 bg-white"
                value={pinKeterangan}
                onChange={(e) => setPinKeterangan(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') prosesSimpanKeterangan() }}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModalKeterangan(false)
                  setPinKeterangan('')
                  setKeteranganText('')
                  // Jangan kosongkan selectedOrders di sini agar user bisa membatalkan tanpa kehilangan centangan
                }}
                className="px-5 py-3 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-all"
              >
                Batal
              </button>
              <button
                onClick={prosesSimpanKeterangan}
                className="bg-black hover:bg-gray-800 transition-all text-white px-6 py-3 rounded-xl font-semibold shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-green-600 mb-2">LIVE REPORT DASHBOARD</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">HASIL LIVE {displayName}</h1>
              <p className="text-gray-500 mt-3 text-sm md:text-base">Monitoring realtime hasil live dan pembayaran pesanan</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportBelumTerbayar} className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-semibold shadow-sm">Export Belum Dibayar</button>
              <label className="bg-black hover:bg-gray-800 text-white px-6 py-4 rounded-2xl cursor-pointer text-center font-semibold shadow-sm">
                Upload Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleSelectFileExcel} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* CARD SUMMARY */}
        <div className="grid md:grid-cols-4 gap-5 mb-8">
          {/* Card isi dihilangkan untuk menghemat space di contoh, tapi tetap aman ada di kodemu */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-3">Total Hasil Live</p>
            <h2 className="text-4xl font-bold text-gray-900">{data.length}</h2>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-green-700 mb-3">Sudah Dibayar</p>
            <h2 className="text-4xl font-bold text-green-700">{data.filter(i => i.status?.includes('TERBAYAR')).length}</h2>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-red-700 mb-3">Belum Dibayar</p>
            <h2 className="text-4xl font-bold text-red-700">{data.filter(i => !i.status?.includes('TERBAYAR')).length}</h2>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-blue-700 mb-3">Total Uang Terbayar</p>
            <h2 className="text-2xl font-bold text-blue-700">{formatRupiah(totalTerbayar)}</h2>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Data Pesanan</h2>
              <p className="text-gray-500 text-sm mt-2">Daftar seluruh hasil live</p>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              {/* TOMBOL AKSI MASSAL (MUNCUL JIKA ADA YANG DIPILIH) */}
              {selectedOrders.length > 0 && (
                <button
                  onClick={() => {
                    setKeteranganText(selectedOrders.length === 1 ? (localKeterangan[selectedOrders[0]] || '') : '')
                    setPinKeterangan('')
                    setShowModalKeterangan(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 transition-all text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm text-sm"
                >
                  + Keterangan Massal ({selectedOrders.length})
                </button>
              )}

              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="Search Id Pesanan"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50">
                <tr>
                  {/* TAMBAHAN HEADER CHECKBOX UNTUK SELECT ALL */}
                  <th className="p-5 text-center w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      onChange={handleSelectAll}
                      checked={filteredData.length > 0 && selectedOrders.length === filteredData.length}
                    />
                  </th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">ID Pesanan</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Waktu Orderan Dibuat</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Variasi</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Payment Method</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Creator Handle</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Toko</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Total Pendapatan</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Input Data</th>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">Keterangan Data</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="text-center p-12 text-gray-500">Loading...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={12} className="text-center p-12 text-gray-500">{searchQuery ? 'Data pesanan tidak ditemukan' : 'Belum ada data'}</td></tr>
                ) : (
                  filteredData.map((item, index) => {
                    const keteranganItem = localKeterangan[item.order_id];
                    const isSelected = selectedOrders.includes(item.order_id);
                    
                    return (
                      <tr key={item.id} className={`border-t border-gray-100 transition-all ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                        {/* TAMBAHAN CHECKBOX UNTUK SELECT SATUAN */}
                        <td className="p-5 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleSelectOne(item.order_id)}
                          />
                        </td>
                        <td className="p-5 text-gray-700 font-medium">{index + 1}</td>
                        <td className="p-5 font-semibold text-gray-900">{item.order_id}</td>
                        <td className="p-5 text-gray-700 whitespace-nowrap">
                          {item.waktu_orderan_dibuat ? String(item.waktu_orderan_dibuat).replace('T', ' ').split('+')[0].replace('Z', '') : '-'}
                        </td>
                        <td className="p-5 text-gray-700">{item.variasi_produk}</td>
                        <td className="p-5 text-gray-700">{item.payment_method}</td>
                        <td className="p-5 text-gray-700">{item.creator_handle}</td>
                        <td className="p-5 text-gray-700">{item.toko}</td>
                        <td className="p-5 font-semibold text-green-700">{item.total_pendapatan}</td>
                        <td className="p-5">
                          {item.status && item.status.includes('TERBAYAR') ? (
                            <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-full text-xs font-semibold">● {item.status}</span>
                          ) : (
                            <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-full text-xs font-bold">● BELUM DIBAYAR</span>
                          )}
                        </td>
                        <td className="p-5 font-semibold text-red-700">
                          {item.created_at ? formatTanggal(item.created_at) : '-'}
                        </td>
                        
                        <td className="p-5">
                          <div className="flex flex-col items-start gap-2 max-w-[200px]">
                            <span className="text-sm text-gray-600 line-clamp-3">
                              {keteranganItem ? keteranganItem : <span className="text-gray-400 italic">Kosong</span>}
                            </span>
                            <button
                              onClick={() => {
                                // Memilih hanya item ini dan membuka modal
                                setSelectedOrders([item.order_id])
                                setKeteranganText(keteranganItem || '')
                                setPinKeterangan('')
                                setShowModalKeterangan(true)
                              }}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-xs px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                            >
                              {keteranganItem ? 'Edit Keterangan' : '+ Keterangan'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}