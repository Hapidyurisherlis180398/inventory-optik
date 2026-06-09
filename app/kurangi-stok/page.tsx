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

      <h1 className="text-3xl font-bold mb-10">
        KURANGI STOK
      </h1>

      <div className="grid md:grid-cols-2 gap-8">

        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Manual</h2>

          <input
            className="border p-3 w-full mb-3"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />

          <input
            className="border p-3 w-full mb-3"
            placeholder="Qty"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />

          <button
            onClick={kurangiManual}
            className="bg-red-600 text-white p-3 rounded-lg w-full"
          >
            Kurangi
          </button>
        </div>

        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Excel</h2>
          <input type="file" accept=".xlsx,.xls" onChange={uploadExcel} />
        </div>

      </div>
    </main>
  )
}