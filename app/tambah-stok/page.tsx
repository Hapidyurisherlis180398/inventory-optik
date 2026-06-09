'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function TambahStokPage() {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [color, setColor] = useState('')
  const [stock, setStock] = useState('')

  async function tambahManual() {
    if (!name || !sku || !color || !stock) {
      alert('Lengkapi data')
      return
    }

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
          stock: existing.stock + Number(stock),
          updated_at: new Date(),
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('products')
        .insert([
          { name, sku, color, stock: Number(stock) }
        ])
    }

    setName('')
    setSku('')
    setColor('')
    setStock('')

    alert('Stok berhasil ditambah')
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
      const name = item['Nama Frame']
      const color = item['Warna Frame']
      const stock = Number(item['Stok Total'])

      if (!sku || !color) continue

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
            stock: existing.stock + stock,
            updated_at: new Date(),
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('products')
          .insert([{ name, sku, color, stock }])
      }
    }

    alert('Upload Excel berhasil')
  }

  return (
    <main className="min-h-screen bg-white text-black p-10">

      <h1 className="text-3xl font-bold mb-6">
        TAMBAH STOK VARIAN
      </h1>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Manual</h2>

          <input placeholder="Nama" className="border p-2 w-full mb-2" value={name} onChange={e => setName(e.target.value)} />
          <input placeholder="SKU" className="border p-2 w-full mb-2" value={sku} onChange={e => setSku(e.target.value)} />
          <input placeholder="Warna" className="border p-2 w-full mb-2" value={color} onChange={e => setColor(e.target.value)} />
          <input placeholder="Stok" type="number" className="border p-2 w-full mb-2" value={stock} onChange={e => setStock(e.target.value)} />

          <button onClick={tambahManual} className="bg-green-600 text-white p-2 w-full rounded">
            Simpan
          </button>
        </div>

        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Excel</h2>
          <input type="file" onChange={uploadExcel} />
        </div>

      </div>
    </main>
  )
}