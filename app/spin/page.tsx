'use client'

import { useState } from 'react'

export default function SpinJadwalPage() {
  // Daftar host tetap yang akan diacak
  const daftarNama = ['Agil', 'A usup', 'Hapid']
  
  // State untuk menyimpan hasil acakan
  // Default awal kita set kosong, atau bisa langsung diisi daftarNama
  const [jadwal, setJadwal] = useState<string[]>([])
  
  // State untuk efek tombol saat ditekan (animasi muter)
  const [isSpinning, setIsSpinning] = useState(false)

  // Fungsi untuk mengacak array (Algoritma Fisher-Yates Shuffle)
  const acakUrutan = (array: string[]) => {
    const hasil = [...array]
    for (let i = hasil.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hasil[i], hasil[j]] = [hasil[j], hasil[i]]
    }
    return hasil
  }

  // Fungsi ketika tombol spin ditekan
  const handleSpin = () => {
    setIsSpinning(true) // Aktifkan efek loading
    setJadwal([]) // Kosongkan hasil sementara biar kelihatan efeknya
    
    // Bikin delay sejenak (600ms) seolah-olah mesin sedang memutar nama
    setTimeout(() => {
      const jadwalBaru = acakUrutan(daftarNama)
      setJadwal(jadwalBaru)
      setIsSpinning(false) // Matikan efek loading
    }, 600)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 px-4 md:px-8 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full">
        
        <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-4">🎲</div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Spin Jadwal Live</h1>
          <p className="text-gray-500 mb-8">Tekan tombol di bawah untuk menentukan urutan live secara acak.</p>
          
          {/* TOMBOL SPIN */}
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

        {/* HASIL ACAKAN (Akan muncul setelah dispin) */}
        {jadwal.length > 0 && !isSpinning && (
          <div className="mt-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 animate-fade-in-up">
            <h2 className="text-xl font-bold mb-5 text-center text-gray-800">🎉 Hasil Urutan Live 🎉</h2>
            
            <div className="space-y-4">
              {jadwal.map((nama, index) => (
                <div key={index} className="flex items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  {/* Nomor Urut / Jam */}
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-xl shadow-sm flex flex-col items-center justify-center mr-4 shrink-0">
                    <span className="text-xs font-medium opacity-80">Jam Ke</span>
                    <span className="text-2xl font-bold">{index + 1}</span>
                  </div>
                  
                  {/* Nama Host */}
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