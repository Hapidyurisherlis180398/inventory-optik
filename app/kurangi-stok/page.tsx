'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function KurangiStokPage() {
  const [sku, setSku] = useState('')
  const [color, setColor] = useState('')
  const [qty, setQty] = useState('')

  async function kurangi() {
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .eq('color', color)
      .single()

    if (!existing) {
      alert('Data tidak ditemukan')
      return
    }

    await supabase
      .from('products')
      .update({
        stock: Math.max(existing.stock - Number(qty), 0),
        updated_at: new Date(),
      })
      .eq('id', existing.id)

    setSku('')
    setColor('')
    setQty('')

    alert('Stok berhasil dikurangi')
  }

  async function uploadExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    for (const item of rows) {
      const sku = item['Kode Barang']
      const color = item['Warna Frame']
      const qty = Number(item['Qty'])

      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .eq('color', color)
        .single()

      if (existing) {
        await supabase
          .from('products')
          .update({
            stock: Math.max(existing.stock - qty, 0),
            updated_at: new Date(),
          })
          .eq('id', existing.id)
      }
    }

    alert('Upload berhasil')
  }

  return (
    <main className="p-10 bg-white min-h-screen">

      <h1 className="text-3xl font-bold mb-6">
        KURANGI STOK VARIAN
      </h1>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="border p-6 rounded">
          <input placeholder="SKU" className="border p-2 w-full mb-2" value={sku} onChange={e => setSku(e.target.value)} />
          <input placeholder="Warna" className="border p-2 w-full mb-2" value={color} onChange={e => setColor(e.target.value)} />
          <input placeholder="Qty" type="number" className="border p-2 w-full mb-2" value={qty} onChange={e => setQty(e.target.value)} />

          <button onClick={kurangi} className="bg-red-600 text-white p-2 w-full rounded">
            Kurangi
          </button>
        </div>

        <div className="border p-6 rounded">
          <input type="file" onChange={uploadExcel} />
        </div>

      </div>
    </main>
  )
}