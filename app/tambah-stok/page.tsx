'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import { normalizeSku, normalizeColor } from '../../lib/normalize'

export default function TambahStokPage() {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [color, setColor] = useState('')
  const [stock, setStock] = useState('')
  const [loading, setLoading] = useState(false)

  // normalize biar tidak dobel data
  const normalize = (val: string) => val.trim().toLowerCase()

  async function tambahManual() {
    if (!name || !sku || !color || !stock) {
      alert('Lengkapi data')
      return
    }

    setLoading(true)

    const cleanSku = normalize(sku)
    const cleanColor = normalize(color)

    const qty = Number(stock) || 0

    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('sku', cleanSku)
      .eq('color', cleanColor)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('products')
        .update({
          stock: (existing.stock || 0) + qty,
          updated_at: new Date(),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('products').insert([
        {
          name: name.trim(),
          sku: cleanSku,
          color: cleanColor,
          stock: qty,
        },
      ])
    }

    setName('')
    setSku('')
    setColor('')
    setStock('')

    setLoading(false)
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
      const sku = normalize(item['Kode Barang'] || '')
      const name = (item['Nama Frame'] || '').trim()
      const color = normalize(item['Warna Frame'] || '')
      const stock = Number(item['Stok Total']) || 0

      if (!sku || !color) continue

      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('sku', normalizeSku(sku))
        .eq('color', normalizeColor(color))
        .maybeSingle()

      if (existing) {
        await supabase
          .from('products')
          .update({
            stock: (existing.stock || 0) + stock,
            updated_at: new Date(),
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('products').insert([
          { name, sku, color, stock }
        ])
      }
    }

    alert('Upload Excel berhasil')
  }

  return (
    <main className="min-h-screen bg-white text-black p-10">

      <h1 className="text-3xl font-bold mb-6">
        TAMBAH STOK VARIAN (POS)
      </h1>

      <div className="grid md:grid-cols-2 gap-6">

        {/* MANUAL */}
        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Manual Input</h2>

          <input className="border p-2 w-full mb-2" placeholder="Nama Frame" value={name} onChange={e => setName(e.target.value)} />
          <input className="border p-2 w-full mb-2" placeholder="SKU" value={sku} onChange={e => setSku(e.target.value)} />
          <input className="border p-2 w-full mb-2" placeholder="Warna Frame" value={color} onChange={e => setColor(e.target.value)} />
          <input className="border p-2 w-full mb-2" type="number" placeholder="Stok" value={stock} onChange={e => setStock(e.target.value)} />

          <button
            onClick={tambahManual}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white p-2 w-full rounded"
          >
            {loading ? 'Menyimpan...' : 'Simpan Stok'}
          </button>
        </div>

        {/* EXCEL */}
        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Import Excel</h2>

          <p className="text-sm text-gray-500 mb-3">
            Kolom wajib: Kode Barang, Nama Frame, Warna Frame, Stok Total
          </p>

          <input type="file" onChange={uploadExcel} />
        </div>

      </div>
    </main>
  )
}