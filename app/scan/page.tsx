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

  const [manualQty, setManualQty] =
    useState(1)

  const [scannerReady, setScannerReady] =
    useState(false)

  const scannerRef = useRef<any>(null)

  const processingRef =
    useRef(false)

  useEffect(() => {
    let scanner: any

    async function startScanner() {
      const {
        Html5Qrcode,
      } = await import(
        'html5-qrcode'
      )

      const html5QrCode =
        new Html5Qrcode('reader')

      scannerRef.current =
        html5QrCode

      try {
        await html5QrCode.start(
          {
            facingMode: 'environment',
          },
          {
            fps: 10,
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
              processingRef.current
            )
              return

            processingRef.current =
              true

            playBeep()

            setResult(decodedText)

            const konfirmasi =
              confirm(
                `QR Terdeteksi\n\n${decodedText}\n\nMode: ${
                  mode ===
                  'tambah'
                    ? 'Tambah Stock'
                    : 'Kurangi Stock'
                }\n\nJumlah: ${manualQty}\n\nLanjutkan?`
              )

            if (konfirmasi) {
              await prosesStock(
                decodedText
              )
            }

            setTimeout(() => {
              processingRef.current =
                false
            }, 1500)
          },
          () => {}
        )

        setScannerReady(true)
      } catch (err) {
        console.log(err)
      }
    }

    startScanner()

    return () => {
      if (
        scannerRef.current
      ) {
        scannerRef.current
          .stop()
          .catch(() => {})
      }
    }
  }, [mode, manualQty])

  function playBeep() {
    try {
      const audio =
        new Audio(
          'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'
        )

      audio.volume = 1

      audio.play()
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

      // FORMAT:
      // SKU-WARNA

      const splitData =
        barcode.split('-')

      const sku = splitData[0]

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

      // MODE KURANG
      if (mode === 'kurang') {
        newStock -= manualQty

        if (newStock < 0) {
          newStock = 0
        }
      }

      // MODE TAMBAH
      if (mode === 'tambah') {
        newStock += manualQty
      }

      // UPDATE STOCK
      const {
        error: updateError,
      } = await supabase
        .from('products')
        .update({
          stock: newStock,
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
        `✅ ${product.name}

SKU : ${product.sku}
Warna : ${product.color}

Stock sekarang : ${newStock}`
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
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">
                  INVENTORY SCANNER
                </p>

                <h1 className="text-4xl font-bold text-gray-900">
                  QR Stock Scanner
                </h1>

                <p className="text-gray-500 mt-3">
                  Scan barcode / QR
                  untuk update stock
                  otomatis
                </p>
              </div>

              <div className="bg-gray-100 rounded-2xl px-5 py-4">
                <p className="text-sm text-gray-500">
                  Scanner Status
                </p>

                <h2 className="font-bold text-lg text-gray-900">
                  {scannerReady
                    ? '🟢 ACTIVE'
                    : '🔴 LOADING'}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* MODE */}
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <button
            onClick={() =>
              setMode('kurang')
            }
            className={`rounded-3xl p-6 transition-all border ${
              mode === 'kurang'
                ? 'bg-red-600 text-white border-red-600 shadow-lg'
                : 'bg-white text-gray-800 border-gray-200'
            }`}
          >
            <h2 className="text-2xl font-bold">
              Barang Keluar
            </h2>

            <p
              className={`mt-2 ${
                mode ===
                'kurang'
                  ? 'text-red-100'
                  : 'text-gray-500'
              }`}
            >
              Stock akan
              berkurang otomatis
            </p>
          </button>

          <button
            onClick={() =>
              setMode('tambah')
            }
            className={`rounded-3xl p-6 transition-all border ${
              mode === 'tambah'
                ? 'bg-green-600 text-white border-green-600 shadow-lg'
                : 'bg-white text-gray-800 border-gray-200'
            }`}
          >
            <h2 className="text-2xl font-bold">
              Tambah Stock
            </h2>

            <p
              className={`mt-2 ${
                mode ===
                'tambah'
                  ? 'text-green-100'
                  : 'text-gray-500'
              }`}
            >
              Stock akan
              bertambah otomatis
            </p>
          </button>
        </div>

        {/* MANUAL QTY */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
          <p className="text-sm text-gray-500 mb-3">
            Quantity Manual
          </p>

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
            className="w-full border border-gray-300 rounded-2xl px-5 py-4 text-2xl font-bold outline-none focus:border-black"
          />
        </div>

        {/* SCANNER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
          <div className="relative overflow-hidden rounded-3xl border-4 border-black">
            <div
              id="reader"
              className="w-full overflow-hidden"
            />

            {/* SCAN LINE */}
            <div className="absolute left-0 right-0 top-0 h-1 bg-red-500 animate-pulse" />
          </div>
        </div>

        {/* RESULT */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">
            Hasil Scan
          </p>

          <h2 className="text-xl font-bold break-all text-gray-900">
            {result || '-'}
          </h2>

          {loading && (
            <div className="mt-5">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl px-5 py-4 font-semibold">
                Processing...
              </div>
            </div>
          )}

          {message && (
            <div className="mt-5">
              <div className="bg-gray-100 rounded-2xl p-5 whitespace-pre-line text-gray-800 font-medium">
                {message}
              </div>
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="mt-6 bg-black rounded-3xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-5">
            Cara Penggunaan
          </h2>

          <div className="space-y-3 text-gray-300">
            <p>
              • Pilih mode scan
            </p>

            <p>
              • Input quantity
              manual
            </p>

            <p>
              • Scan barcode /
              QR menggunakan HP
            </p>

            <p>
              • Akan muncul popup
              konfirmasi
            </p>

            <p>
              • Stock otomatis
              update ke Supabase
            </p>

            <p>
              • Format barcode:
              SKU-WARNA
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}