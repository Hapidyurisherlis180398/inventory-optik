'use client'

import { useState } from 'react'

export default function SpinJadwalPage() {
  const daftarNama = ['Agil', 'A usup', 'Hapid']
  
  // Menghitung maksimal kombinasi unik (Faktorial dari jumlah nama)
  // Untuk 3 nama: 3 * 2 * 1 = 6 kombinasi
  const hitungFaktorial = (n: number): number => n <= 1 ? 1 : n * hitungFaktorial(n - 1)
  const maxKombinasi = hitungFaktorial(daftarNama.length)
  
  const [jadwal, setJadwal] = useState<string[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  
  // State untuk mengingat urutan yang sudah pernah keluar
  const [riwayat, setRiwayat] = useState<string[]>([])
  const [infoReset, setInfoReset] = useState(false)

  const acakUrutan = (array: string[]) => {
    const hasil = [...array]
    for (let i = hasil.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hasil[i], hasil[j]] = [hasil[j], hasil[i]]
    }
    return hasil
  }

  const handleSpin = () => {
    setIsSpinning(true)
    setInfoReset(false)

    setTimeout(() => {
      let riwayatSaatIni = [...riwayat]

      // Jika memori sudah penuh (mencapai 6), reset memori
      if (riwayatSaatIni.length >= maxKombinasi) {
        riwayatSaatIni = []
        setInfoReset(true) // Memunculkan notif bahwa siklus diulang
      }

      let jadwalBaru = acakUrutan(daftarNama)
      let teksUrutan = jadwalBaru.join(', ')

      // LOOPING PENCEGAH DUPLIKAT: 
      // Terus acak ulang JIKA urutan ini sudah ada di dalam riwayat
      while (riwayatSaatIni.includes(teksUrutan)) {
        jadwalBaru = acakUrutan(daftarNama)
        teksUrutan = jadwalBaru.join(', ')
      }

      // Simpan urutan yang baru ke riwayat
      setRiwayat([...riwayatSaatIni, teksUrutan])
      setJadwal(jadwalBaru)
      setIsSpinning(false)
    }, 600)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 px-4 md:px-8 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full">
        
        <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-4">🎲</div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Spin Jadwal Live</h1>
          <p className="text-gray-500 mb-6">Sistem menjamin urutan tidak akan sama dalam {maxKombinasi} kali spin.</p>
          
          {/* Indikator Memori */}
          <div className="mb-8 inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 text-sm font-medium text-blue-700">
            📊 Kombinasi terpakai: {riwayat.length} / {maxKombinasi}
          </div>
          
          <button 
            onClick={handleSpin}
            disabled={isSpinning}
            className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-md flex items-center justify-center gap-2
              ${isSpinning 
                ? 'bg-blue-400 cursor-not-allowed scale-95' 
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
              }`}
          >
            {isSpinning ? (
              <>
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengacak Jadwal...
              </>
            ) : (
              '🎯 Spin Acak Sekarang!'
            )}
          </button>
        </div>

        {/* NOTIFIKASI RESET SIKLUS */}
        {infoReset && !isSpinning && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-center text-orange-700 text-sm font-medium animate-fade-in-up">
            Semua {maxKombinasi} kombinasi unik telah keluar! Memori di-reset untuk siklus baru.
          </div>
        )}

        {jadwal.length > 0 && !isSpinning && (
          <div className="mt-6 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 animate-fade-in-up">
            <h2 className="text-xl font-bold mb-5 text-center text-gray-800">🎉 Hasil Urutan Live 🎉</h2>
            
            <div className="space-y-4">
              {jadwal.map((nama, index) => (
                <div key={index} className="flex items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-xl shadow-sm flex flex-col items-center justify-center mr-4 shrink-0">
                    <span className="text-xs font-medium opacity-80">Jam Ke</span>
                    <span className="text-2xl font-bold">{index + 1}</span>
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold text-blue-600 mb-1">
                      {index === 0 ? 'Urutan Pertama' : index === 1 ? 'Urutan Kedua' : 'Urutan Ketiga'}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{nama}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}