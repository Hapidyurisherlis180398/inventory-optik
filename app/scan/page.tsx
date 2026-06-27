'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { supabase } from '../../lib/supabase'

export default function ScanPage() {
  const [loading, setLoading] =
    useState(false)

  const [result, setResult] =
    useState('')

  const [mode, setMode] = useState<
    'tambah' | 'kurang'
  >('kurang')

  const [message, setMessage] =
    useState('')

  const [scannerReady, setScannerReady] =
    useState(false)

  const lastScanRef = useRef('')

  const scanLockRef = useRef(false)

  // BEEP PROFESIONAL
  function playBeep() {
    try {
      const audioContext =
        new (
          window.AudioContext ||
          (
            window as any
          ).webkitAudioContext
        )()

      const oscillator =
        audioContext.createOscillator()

      const gainNode =
        audioContext.createGain()

      oscillator.connect(gainNode)

      gainNode.connect(
        audioContext.destination
      )

      oscillator.frequency.value = 900

      oscillator.type = 'sine'

      gainNode.gain.value = 0.2

      oscillator.start()

      oscillator.stop(
        audioContext.currentTime + 0.12
      )
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    let scanner: any

    async function startScanner() {
      const {
        Html5Qrcode,
      } = await import(
        'html5-qrcode'
      )

      scanner = new Html5Qrcode(
        'reader'
      )

      try {
        await scanner.start(
          {
            facingMode:
              'environment',
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
            if (
              scanLockRef.current
            )
              return

            // ANTI DOUBLE SCAN
            if (
              lastScanRef.current ===
              decodedText
            ) {
              return
            }

            scanLockRef.current =
              true

            lastScanRef.current =
              decodedText

            setResult(decodedText)

            // BEEP
            playBeep()

            // VIBRATE HP
            if (
              navigator.vibrate
            ) {
              navigator.vibrate(
                120
              )
            }

            await prosesStock(
              decodedText
            )

            setTimeout(() => {
              scanLockRef.current =
                false

              lastScanRef.current =
                ''
            }, 1500)
          }
        )

        setScannerReady(true)
      } catch (err) {
        console.log(err)

        setMessage(
          '❌ Kamera tidak bisa dibuka'
        )
      }
    }

    startScanner()

    return () => {
      if (
        scanner &&
        scanner.stop
      ) {
        scanner.stop()
      }
    }
  }, [mode])

  async function prosesStock(
    barcode: string
  ) {
    try {
      setLoading(true)

      setMessage('')

      // BARCODE = SKU + COLOR
      const splitData =
        barcode.split('-')

      const sku =
        splitData[0]

      const color =
        splitData
          .slice(1)
          .join('-')

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

      // MODE KELUAR
      if (mode === 'kurang') {
        newStock -= 1

        if (newStock < 0) {
          newStock = 0
        }
      }

      // MODE TAMBAH
      if (mode === 'tambah') {
        newStock += 1
      }

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
        '❌ Error scanner'
      )

      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Smart Stock Scanner
          </h1>

          <p className="text-gray-500 mt-2">
            Scan barcode frame
            menggunakan kamera HP
          </p>
        </div>

        {/* MODE */}
        <div className="grid grid-cols-2 gap-4 mb-6">

          <button
            onClick={() =>
              setMode('kurang')
            }
            className={`rounded-2xl p-5 font-semibold transition-all ${
              mode === 'kurang'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Barang Keluar
          </button>

          <button
            onClick={() =>
              setMode('tambah')
            }
            className={`rounded-2xl p-5 font-semibold transition-all ${
              mode === 'tambah'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Tambah Stock
          </button>
        </div>

        {/* SCANNER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">

          <div className="relative overflow-hidden rounded-3xl border border-gray-200">

            <div
              id="reader"
              className="w-full"
            />

            {/* FRAME DETECTION */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">

              <div className="w-[260px] h-[260px] border-4 border-green-500 rounded-3xl shadow-[0_0_25px_rgba(34,197,94,0.7)] animate-pulse" />

            </div>
          </div>

          {/* STATUS */}
          <div className="mt-5 flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Status Scanner
              </p>

              <p className="font-semibold text-gray-900">
                {scannerReady
                  ? '🟢 Active'
                  : '🔴 Loading'}
              </p>
            </div>

            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                mode === 'kurang'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {mode === 'kurang'
                ? 'Barang Keluar'
                : 'Tambah Stock'}
            </div>
          </div>
        </div>

        {/* RESULT */}
        <div className="mt-6 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">

          <p className="text-sm text-gray-500 mb-2">
            Hasil Scan
          </p>

          <h2 className="text-xl font-bold break-all text-gray-900">
            {result || '-'}
          </h2>

          {loading && (
            <div className="mt-4 text-blue-600 font-semibold">
              Processing...
            </div>
          )}

          {message && (
            <div className="mt-4">
              <div className="bg-gray-100 rounded-2xl p-4 text-gray-800 font-medium">
                {message}
              </div>
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="mt-6 bg-black text-white rounded-3xl p-6">

          <h2 className="text-xl font-bold mb-4">
            Cara Penggunaan
          </h2>

          <ul className="space-y-3 text-sm text-gray-300">
            <li>
              • Pilih mode scanner
            </li>

            <li>
              • Tambah Stock →
              stock bertambah otomatis
            </li>

            <li>
              • Barang Keluar →
              stock berkurang otomatis
            </li>

            <li>
              • Arahkan barcode ke kotak scan
            </li>

            <li>
              • Scanner akan bunyi beep saat berhasil scan
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}