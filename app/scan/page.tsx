'use client'

import {
  useEffect,
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

  useEffect(() => {
    let scanner: any

    async function startScanner() {
      const {
        Html5QrcodeScanner,
      } = await import(
        'html5-qrcode'
      )

      scanner =
        new Html5QrcodeScanner(
          'reader',
          {
            fps: 10,
            qrbox: 250,
          },
          false
        )

      scanner.render(
        async (
          decodedText: string
        ) => {
          setResult(decodedText)

          await prosesStock(
            decodedText
          )
        },
        () => {}
      )
    }

    startScanner()

    return () => {
      if (
        scanner &&
        scanner.clear
      ) {
        scanner.clear()
      }
    }
  }, [mode])

  async function prosesStock(
    sku: string
  ) {
    try {
      setLoading(true)

      setMessage('')

      // AMBIL DATA PRODUK
      const {
        data: product,
        error,
      } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
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
        newStock -= 1

        if (newStock < 0) {
          newStock = 0
        }
      }

      // MODE TAMBAH
      if (mode === 'tambah') {
        newStock += 1
      }

      // UPDATE STOCK
      const { error: updateError } =
        await supabase
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
        `✅ ${product.name} (${product.color}) → Stock sekarang ${newStock}`
      )

      setLoading(false)
    } catch (err) {
      console.log(err)

      setMessage('❌ Error scanner')

      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            QR Stock Scanner
          </h1>

          <p className="text-gray-500 mt-2">
            Scan QR untuk
            mengurangi atau
            menambah stock
            produk
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
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Mode Barang Keluar
          </button>

          <button
            onClick={() =>
              setMode('tambah')
            }
            className={`rounded-2xl p-5 font-semibold transition-all ${
              mode === 'tambah'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Mode Tambah Stock
          </button>
        </div>

        {/* CARD SCANNER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
          <div
            id="reader"
            className="overflow-hidden rounded-2xl"
          />
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
            <p className="mt-4 text-blue-600 font-semibold">
              Processing...
            </p>
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
          <h2 className="text-xl font-bold mb-3">
            Cara Penggunaan
          </h2>

          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              • Pilih mode
              terlebih dahulu
            </li>

            <li>
              • Barang Keluar →
              stock otomatis
              berkurang
            </li>

            <li>
              • Tambah Stock →
              stock otomatis
              bertambah
            </li>

            <li>
              • Scan QR pada
              frame menggunakan
              kamera HP
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}