'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function KurangiStokPage() {
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('')

  async function kurangiManual() {
    if (!sku || !qty) {
      alert('Lengkapi data')
      return
    }

    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .single()

    if (!existing) {
      alert('Barang tidak ditemukan')
      return
    }

    const newStock = existing.stock - Number(qty)

    await supabase
      .from('products')
      .update({
        stock: newStock < 0 ? 0 : newStock,
        updated_at: new Date(),
      })
      .eq('id', existing.id)

    alert('Stok berhasil dikurangi')

    setSku('')
    setQty('')
  }

  async function uploadExcel(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

    for (const item of jsonData) {
      const sku = item['Kode Barang']
      const qty = Number(item['Qty'])

      if (!sku) continue

      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single()

      if (existing) {
        const newStock = existing.stock - qty

        await supabase
          .from('products')
          .update({
            stock: newStock < 0 ? 0 : newStock,
            updated_at: new Date(),
          })
          .eq('id', existing.id)
      }
    }

    alert('Upload Excel berhasil')
  }

  return (
    <main className="min-h-screen bg-white text-black p-10">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold">
          KURANGI STOK
        </h1>
        <p className="text-gray-600 mt-1">
          Kurangi stok manual atau upload file Excel order
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* MANUAL CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">

          <h2 className="text-xl font-bold mb-6">
            Kurangi Stok Manual
          </h2>

          <div className="flex flex-col gap-4">

            <input
              type="text"
              placeholder="Kode Barang (SKU)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-300"
            />

            <input
              type="number"
              placeholder="Jumlah Pengurangan"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-300"
            />

            <button
              onClick={kurangiManual}
              className="bg-red-600 hover:bg-red-700 transition text-white font-semibold p-3 rounded-lg"
            >
              Kurangi Stok
            </button>

          </div>
        </div>

        {/* EXCEL CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">

          <h2 className="text-xl font-bold mb-6">
            Upload Excel Order
          </h2>

          <p className="text-gray-600 mb-4 text-sm">
            Upload file .xlsx dengan kolom: <b>Kode Barang</b> dan <b>Qty</b>
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={uploadExcel}
            className="block w-full text-sm border border-gray-300 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-gray-100 file:rounded-lg"
          />

        </div>

      </div>
    </main>
  )
}