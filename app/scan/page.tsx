'use client'

import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'

export default function ScanPage() {
  const [result, setResult] =
    useState('')

  const [qty, setQty] = useState(1)

  const [mode, setMode] = useState<
    'tambah' | 'kurang'
  >('kurang')

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    const scanner =
      new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: 250,
        },
        false
      )

    scanner.render(
      async (decodedText) => {
        setResult(decodedText)

        scanner.clear()

        await prosesStock(decodedText)
      },
      (error) => {}
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [mode, qty])

  async function prosesStock(
    barcode: string
  ) {
    setLoading(true)

    const { data, error } =
      await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single()

    if (error || !data) {
      alert('Produk tidak ditemukan')

      setLoading(false)

      return
    }

    let newStock = data.stock || 0

    // KURANGI STOCK
    if (mode === 'kurang') {
      newStock -= qty
    }

    // TAMBAH STOCK
    if (mode === 'tambah') {
      newStock += qty
    }

    if (newStock < 0) {
      alert('Stock tidak cukup')

      setLoading(false)

      return
    }

    await supabase
      .from('products')
      .update({
        stock: newStock,
      })
      .eq('id', data.id)

    alert(
      `Stock berhasil diupdate

Produk: ${data.name}
Warna: ${data.color}

Stock sekarang: ${newStock}`
    )

    setLoading(false)

    location.reload()
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black">
            QR Stock Scanner
          </h1>

          <p className="text-gray-500 mt-2">
            Scan QR untuk tambah
            atau kurangi stock
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          {/* MODE */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() =>
                setMode('kurang')
              }
              className={`p-4 rounded-2xl font-bold transition-all ${
                mode === 'kurang'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100'
              }`}
            >
              Kurangi Stock
            </button>

            <button
              onClick={() =>
                setMode('tambah')
              }
              className={`p-4 rounded-2xl font-bold transition-all ${
                mode === 'tambah'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100'
              }`}
            >
              Tambah Stock
            </button>
          </div>

          {/* INPUT QTY */}
          <div className="mb-6">
            <label className="block mb-2 font-semibold">
              Jumlah
            </label>

            <input
              type="number"
              value={qty}
              onChange={(e) =>
                setQty(
                  Number(
                    e.target.value
                  )
                )
              }
              className="w-full border rounded-2xl p-4"
            />
          </div>

          {/* SCANNER */}
          <div
            id="reader"
            className="overflow-hidden rounded-3xl border"
          />

          {/* RESULT */}
          {result && (
            <div className="mt-6 p-5 bg-gray-50 rounded-2xl">
              <p className="text-sm text-gray-500 mb-2">
                Barcode
              </p>

              <h2 className="font-bold text-xl">
                {result}
              </h2>
            </div>
          )}

          {loading && (
            <div className="mt-6 text-blue-600 font-semibold">
              Memproses...
            </div>
          )}
        </div>
      </div>
    </main>
  )
}