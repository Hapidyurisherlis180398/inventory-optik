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

    const newStock =
      existing.stock - Number(qty)

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

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]]

    const jsonData: any[] =
      XLSX.utils.sheet_to_json(sheet)

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
        const newStock =
          existing.stock - qty

        await supabase
          .from('products')
          .update({
            stock:
              newStock < 0 ? 0 : newStock,
            updated_at: new Date(),
          })
          .eq('id', existing.id)
      }
    }

    alert('Upload Excel berhasil')
  }

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-6">
        KURANGI STOK
      </h1>

      <div className="border p-5 mb-8">
        <h2 className="text-xl font-bold mb-4">
          Kurangi Manual
        </h2>

        <div className="flex flex-col gap-3 max-w-xl">
          <input
            type="text"
            placeholder="Kode Barang"
            value={sku}
            onChange={(e) =>
              setSku(e.target.value)
            }
            className="border p-3"
          />

          <input
            type="number"
            placeholder="Jumlah Pengurangan"
            value={qty}
            onChange={(e) =>
              setQty(e.target.value)
            }
            className="border p-3"
          />

          <button
            onClick={kurangiManual}
            className="bg-red-600 text-white p-3"
          >
            Kurangi Stok
          </button>
        </div>
      </div>

      <div className="border p-5">
        <h2 className="text-xl font-bold mb-4">
          Upload Excel Order
        </h2>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={uploadExcel}
        />
      </div>
    </main>
  )
}