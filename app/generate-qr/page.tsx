'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

export default function GenerateQRPage() {
  const [barcode, setBarcode] =
    useState('')

  const [qr, setQr] = useState('')

  async function generateQR() {
    const url =
      await QRCode.toDataURL(
        barcode
      )

    setQr(url)
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Generate QR Produk
        </h1>

        <input
          type="text"
          placeholder="Contoh: RB001-BLACK"
          value={barcode}
          onChange={(e) =>
            setBarcode(
              e.target.value
            )
          }
          className="w-full border rounded-2xl p-4 mb-4"
        />

        <button
          onClick={generateQR}
          className="bg-black text-white px-6 py-4 rounded-2xl font-bold"
        >
          Generate QR
        </button>

        {qr && (
          <div className="mt-8 bg-white border rounded-3xl p-6">
            <img
              src={qr}
              alt="QR"
              className="w-full"
            />
          </div>
        )}
      </div>
    </main>
  )
}