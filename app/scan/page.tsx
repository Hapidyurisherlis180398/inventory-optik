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

  // POPUP KONFIRMASI
  const [
    confirmData,
    setConfirmData,
  ] = useState<any>(null)

  // QTY MANUAL
  const [manualQty, setManualQty] =
    useState(1)

  const lastScanRef = useRef('')

  const scanLockRef = useRef(false)

  // SOUND BEEP
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

            // SOUND
            playBeep()

            // VIBRATE
            if (
              navigator.vibrate
            ) {
              navigator.vibrate(
                120
              )
            }

            await bukaKonfirmasi(
              decodedText
            )

            setTimeout(() => {
              scanLockRef.current =
                false

              lastScanRef.current =
                ''
            }, 2000)
          }
        )

        setScannerReady(true)
      } catch (err) {
        console.log(err)

        setMessage(
          '❌ Kamera gagal dibuka'
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

  // CEK PRODUK
  async function bukaKonfirmasi(
    barcode: string
  ) {
    try {
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

        return
      }

      setManualQty(1)

      setConfirmData(product)
    } catch (err) {
      console.log(err)

      setMessage(
        '❌ Error membaca barcode'
      )
    }
  }

  // UPDATE STOCK
  async function prosesStock() {
    if (!confirmData) return

    try {
      setLoading(true)

      let newStock =
        Number(
          confirmData.stock
        ) || 0

      // QTY MANUAL
      const qty =
        Number(manualQty) || 1

      // MODE KURANG
      if (mode === 'kurang') {
        newStock -= qty

        if (newStock < 0) {
          newStock = 0
        }
      }

      // MODE TAMBAH
      if (mode === 'tambah') {
        newStock += qty
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
        .eq('id', confirmData.id)

      if (updateError) {
        setMessage(
          '❌ Gagal update stock'
        )

        setLoading(false)

        return
      }

      setMessage(
        `✅ ${confirmData.name} (${confirmData.color}) → Stock sekarang ${newStock}`
      )

      setConfirmData(null)

      setManualQty(1)

      setLoading(false)
    } catch (err) {
      console.log(err)

      setMessage(
        '❌ Error update stock'
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
            TMH-Smart Stock Scanner
          </h1>

          <p className="text-gray-500 mt-2">
            Scan barcode frame menggunakan kamera HP
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

            {/* FRAME */}
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

        {/* HASIL */}
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

        {/* POPUP */}
        {confirmData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">

              <h2 className="text-2xl font-bold text-gray-900 mb-5">
                Konfirmasi Stock
              </h2>

              <div className="space-y-4">

                <div className="bg-gray-100 rounded-2xl p-4">
                  <p className="text-sm text-gray-500">
                    Nama Produk
                  </p>

                  <h3 className="font-bold text-lg text-gray-900">
                    {confirmData.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div className="bg-gray-100 rounded-2xl p-4">
                    <p className="text-sm text-gray-500">
                      SKU
                    </p>

                    <h3 className="font-bold text-gray-900">
                      {confirmData.sku}
                    </h3>
                  </div>

                  <div className="bg-gray-100 rounded-2xl p-4">
                    <p className="text-sm text-gray-500">
                      Color
                    </p>

                    <h3 className="font-bold text-gray-900">
                      {confirmData.color}
                    </h3>
                  </div>
                </div>

                {/* STOCK */}
                <div className="bg-black text-white rounded-2xl p-5">

                  <p className="text-sm text-gray-300">
                    Stock Saat Ini
                  </p>

                  <h2 className="text-4xl font-bold mt-2">
                    {confirmData.stock}
                  </h2>
                </div>

                {/* INPUT QTY */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">

                  <p className="text-sm text-gray-500 mb-3">
                    Jumlah Stock
                  </p>

                  <div className="flex items-center gap-3">

                    {/* MINUS */}
                    <button
                      onClick={() =>
                        setManualQty((prev) =>
                          prev > 1
                            ? prev - 1
                            : 1
                        )
                      }
                      className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-2xl font-bold"
                    >
                      -
                    </button>

                    {/* INPUT */}
                    <input
                      type="number"
                      min={1}
                      value={manualQty}
                      onChange={(e) =>
                        setManualQty(
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="flex-1 border border-gray-300 rounded-2xl h-12 text-center font-bold text-lg outline-none"
                    />

                    {/* PLUS */}
                    <button
                      onClick={() =>
                        setManualQty((prev) =>
                          prev + 1
                        )
                      }
                      className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-2xl font-bold"
                    >
                      +
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Opsional • default 1
                  </p>
                </div>

                {/* STATUS */}
                <div
                  className={`rounded-2xl p-4 text-center font-bold ${
                    mode === 'kurang'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {mode === 'kurang'
                    ? 'Stock Akan Dikurangi'
                    : 'Stock Akan Ditambah'}
                </div>

                {/* BUTTON */}
                <div className="grid grid-cols-2 gap-3 pt-2">

                  <button
                    onClick={() =>
                      setConfirmData(
                        null
                      )
                    }
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl py-4 font-semibold transition-all"
                  >
                    Batal
                  </button>

                  <button
                    onClick={
                      prosesStock
                    }
                    className={`rounded-2xl py-4 font-semibold text-white transition-all ${
                      mode === 'kurang'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Konfirmasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              • Scan barcode frame
            </li>

            <li>
              • Akan muncul popup konfirmasi
            </li>

            <li>
              • Bisa input qty manual
            </li>

            <li>
              • Tekan konfirmasi untuk update stock
            </li>

            <li>
              • Scanner otomatis beep saat scan berhasil
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}