'use client'

import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'

export default function ScanMasukPage() {
  const [hasil, setHasil] =
    useState('')

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
        scanner.clear()

        setHasil(decodedText)

        const sku = decodedText

        // CARI PRODUK
        const { data, error } =
          await supabase
            .from('products')
            .select('*')
            .eq('sku', sku)
            .single()

        if (error || !data) {
          alert(
            'Produk tidak ditemukan'
          )

          window.location.reload()

          return
        }

        // UPDATE STOK
        await supabase
          .from('products')
          .update({
            stock:
              data.stock + 1,
          })
          .eq('id', data.id)

        alert(
          `Stok berhasil ditambahkan\n\n${data.name}\nWarna: ${data.color}\nTotal stok: ${
            data.stock + 1
          }`
        )

        window.location.reload()
      },

      () => {}
    )

    return () => {
      scanner.clear()
    }
  }, [])

  return (
    <main className="min-h-screen bg-white p-5 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Scan Barang Masuk
          </h1>

          <p className="text-gray-500 mb-8">
            Scan QR untuk
            menambah stok
          </p>

          <div
            id="reader"
            className="overflow-hidden rounded-2xl"
          />

          {hasil && (
            <div className="mt-6 bg-green-50 border border-green-200 p-5 rounded-2xl">
              <p className="text-sm text-gray-500 mb-2">
                SKU Terdeteksi
              </p>

              <h2 className="text-2xl font-bold text-green-700">
                {hasil}
              </h2>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}