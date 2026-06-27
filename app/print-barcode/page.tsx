'use client'

import {
  useEffect,
  useState,
} from 'react'

import QRCode from 'qrcode'

import { supabase } from '../../lib/supabase'

export default function PrintBarcodePage() {
  const [products, setProducts] =
    useState<any[]>([])

  const [qrCodes, setQrCodes] =
    useState<any>({})

  async function getProducts() {
    const { data } =
      await supabase
        .from('products')
        .select('*')
        .order('name', {
          ascending: true,
        })

    if (data) {
      setProducts(data)

      const tempQr: any = {}

      for (const item of data) {
        tempQr[item.id] =
          await QRCode.toDataURL(
            item.barcode
          )
      }

      setQrCodes(tempQr)
    }
  }

  useEffect(() => {
    getProducts()
  }, [])

  function printPage() {
    window.print()
  }

  return (
    <main className="min-h-screen bg-white p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">
            Print Barcode
          </h1>

          <p className="text-gray-500 mt-2">
            Cetak barcode produk
          </p>
        </div>

        <button
          onClick={printPage}
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          Print Barcode
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {products.map((item) => (
          <div
            key={item.id}
            className="border rounded-2xl p-4 flex flex-col items-center text-center"
          >
            {/* QR */}
            {qrCodes[item.id] && (
              <img
                src={
                  qrCodes[item.id]
                }
                alt="QR"
                className="w-32 h-32"
              />
            )}

            {/* PRODUCT */}
            <h2 className="font-bold text-sm mt-3">
              {item.name}
            </h2>

            {/* SKU */}
            <p className="text-xs text-gray-500 mt-1">
              {item.sku}
            </p>

            {/* COLOR */}
            <p className="text-xs text-gray-500">
              {item.color}
            </p>

            {/* BARCODE */}
            <div className="mt-2 text-xs font-semibold break-all">
              {item.barcode}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}