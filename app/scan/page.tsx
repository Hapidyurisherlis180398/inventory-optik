'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { supabase } from '../../lib/supabase'

export default function ScanPage() {
  const scannerRef = useRef<any>(null)
  const lastScanRef = useRef('')

  const [loading, setLoading] =
    useState(false)

  const [result, setResult] =
    useState('')

  const [mode, setMode] = useState<
    'tambah' | 'kurang'
  >('kurang')

  const [message, setMessage] =
    useState('')

  const [scanSuccess, setScanSuccess] =
    useState(false)

  const [cameraReady, setCameraReady] =
    useState(false)

  useEffect(() => {
    startScanner()

    return () => {
      stopScanner()
    }
  }, [mode])

  async function startScanner() {
    try {
      stopScanner()

      const {
        Html5Qrcode,
      } = await import(
        'html5-qrcode'
      )

      const html5QrCode =
        new Html5Qrcode('reader')

      scannerRef.current =
        html5QrCode

      const cameras =
        await Html5Qrcode.getCameras()

      if (
        !cameras ||
        cameras.length === 0
      ) {
        setMessage(
          '❌ Kamera tidak ditemukan'
        )
        return
      }

      setCameraReady(true)

      await html5QrCode.start(
        {
          facingMode: 'environment',
        },
        {
          fps: 15,
          qrbox: {
            width: 260,
            height: 260,
          },
          aspectRatio: 1,
        },

        async (
          decodedText: string
        ) => {
          // ANTI DOUBLE SCAN
          if (
            lastScanRef.current ===
            decodedText
          ) {
            return
          }

          lastScanRef.current =
            decodedText

          setResult(decodedText)

          // EFFECT SCAN SUCCESS
          setScanSuccess(true)

          setTimeout(() => {
            setScanSuccess(false)
          }, 900)

          // VIBRATION HP
          if (
            navigator.vibrate
          ) {
            navigator.vibrate(150)
          }

          // SOUND BEEP
          const audio =
            new Audio(
              'https://actions.google.com/sounds/v1/cartoon/pop.ogg'
            )

          audio.play()

          await prosesStock(
            decodedText
          )

          // RESET AGAR BISA SCAN LAGI
          setTimeout(() => {
            lastScanRef.current =
              ''
          }, 1800)
        },

        () => {}
      )
    } catch (err) {
      console.log(err)

      setMessage(
        '❌ Gagal membuka kamera'
      )
    }
  }

  async function stopScanner() {
    try {
      if (
        scannerRef.current
      ) {
        await scannerRef.current.stop()

        await scannerRef.current.clear()

        scannerRef.current = null
      }
    } catch (err) {
      console.log(err)
    }
  }

  async function prosesStock(
    barcode: string
  ) {
    try {
      setLoading(true)

      setMessage('')

      // FORMAT BARCODE
      // SKU-COLOR
      const splitBarcode =
        barcode.split('-')

      const sku =
        splitBarcode[0]

      const color =
        splitBarcode
          .slice(1)
          .join('-')

      // AMBIL PRODUK
      const {
        data: product,
        error,
      } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .eq('color', color)
        .single()

      if (error || !product) {
        setMessage(
          '❌ Produk tidak ditemukan'
        )

        setLoading(false)

        return
      }

      let newStock =
        Number(product.stock) || 0

      // MODE BARANG KELUAR
      if (mode === 'kurang') {
        newStock -= 1

        if (newStock < 0) {
          newStock = 0
        }
      }

      // MODE TAMBAH STOCK
      if (mode === 'tambah') {
        newStock += 1
      }

      // UPDATE STOCK
      const {
        error: updateError,
      } = await supabase
        .from('products')
        .update({
          stock: newStock,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', product.id)

      if (updateError) {
        setMessage(
          '❌ Gagal update stock'
        )

        setLoading(false)

        return
      }

      setMessage(
        `✅ ${product.name} (${product.color}) → Stock sekarang ${newStock}`
      )

      setLoading(false)
    } catch (err) {
      console.log(err)

      setMessage(
        '❌ Terjadi kesalahan scanner'
      )

      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-black to-gray-800 rounded-3xl p-8 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <p className="text-sm text-gray-300 mb-2">
                  INVENTORY SYSTEM
                </p>

                <h1 className="text-4xl font-bold">
                  QR STOCK SCANNER
                </h1>

                <p className="text-gray-300 mt-3">
                  Scan barcode
                  produk untuk
                  update stock
                  otomatis realtime
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-5 py-4 border border-white/20">
                <p className="text-sm text-gray-300">
                  Status Kamera
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      cameraReady
                        ? 'bg-green-400 animate-pulse'
                        : 'bg-red-400'
                    }`}
                  />

                  <span className="font-semibold">
                    {cameraReady
                      ? 'ACTIVE'
                      : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODE */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() =>
              setMode('kurang')
            }
            className={`rounded-3xl p-6 transition-all duration-300 border-2 ${
              mode === 'kurang'
                ? 'bg-red-600 border-red-600 text-white shadow-xl scale-[1.02]'
                : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
            }`}
          >
            <div className="text-3xl mb-3">
              📦
            </div>

            <h2 className="font-bold text-xl">
              Barang Keluar
            </h2>

            <p className="text-sm mt-2 opacity-80">
              Stock otomatis
              berkurang
            </p>
          </button>

          <button
            onClick={() =>
              setMode('tambah')
            }
            className={`rounded-3xl p-6 transition-all duration-300 border-2 ${
              mode === 'tambah'
                ? 'bg-green-600 border-green-600 text-white shadow-xl scale-[1.02]'
                : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
            }`}
          >
            <div className="text-3xl mb-3">
              ➕
            </div>

            <h2 className="font-bold text-xl">
              Tambah Stock
            </h2>

            <p className="text-sm mt-2 opacity-80">
              Stock otomatis
              bertambah
            </p>
          </button>
        </div>

        {/* SCANNER */}
        <div className="bg-white border border-gray-200 rounded-[30px] shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Live Scanner
                </h2>

                <p className="text-gray-500 mt-1">
                  Arahkan kamera ke
                  barcode frame
                </p>
              </div>

              <div
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  scanSuccess
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {scanSuccess
                  ? 'SCAN DETECTED'
                  : 'READY'}
              </div>
            </div>
          </div>

          {/* CAMERA */}
          <div className="relative">
            <div
              id="reader"
              className="w-full overflow-hidden"
            />

            {/* OVERLAY */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-[260px] h-[260px] rounded-3xl border-4 transition-all duration-300 ${
                  scanSuccess
                    ? 'border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.8)]'
                    : 'border-white shadow-[0_0_40px_rgba(255,255,255,0.6)]'
                }`}
              />
            </div>

            {/* SCAN LINE */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[250px] h-1 bg-red-500 animate-pulse rounded-full shadow-lg" />
            </div>
          </div>
        </div>

        {/* RESULT */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {/* HASIL */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-lg">
            <p className="text-sm font-semibold text-gray-500 mb-3">
              HASIL SCAN
            </p>

            <div className="bg-gray-50 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-gray-900 break-all">
                {result || '-'}
              </h2>
            </div>

            {loading && (
              <div className="mt-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />

                <p className="text-blue-600 font-semibold">
                  Processing...
                </p>
              </div>
            )}
          </div>

          {/* STATUS */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-lg">
            <p className="text-sm font-semibold text-gray-500 mb-3">
              STATUS
            </p>

            <div
              className={`rounded-2xl p-5 font-semibold ${
                message.includes(
                  '❌'
                )
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-green-50 text-green-700 border border-green-100'
              }`}
            >
              {message ||
                'Menunggu scan barcode...'}
            </div>
          </div>
        </div>

        {/* INFO */}
        <div className="mt-8 bg-black rounded-3xl p-8 text-white shadow-2xl">
          <h2 className="text-2xl font-bold mb-5">
            Cara Penggunaan
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="font-bold mb-3">
                📦 Barang Keluar
              </h3>

              <p className="text-gray-300 text-sm leading-7">
                Scan barcode saat
                frame terjual maka
                stock otomatis
                berkurang 1.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="font-bold mb-3">
                ➕ Tambah Stock
              </h3>

              <p className="text-gray-300 text-sm leading-7">
                Scan barcode saat
                restock maka stock
                otomatis bertambah
                1.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}