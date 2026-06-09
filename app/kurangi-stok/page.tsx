'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import { normalizeSku, normalizeColor } from '../../lib/normalize'

export default function KurangiStokPage() {
  const [sku, setSku] = useState('')
  const [color, setColor] = useState('')
  const [qty, setQty] = useState('')
  const [loading, setLoading] = useState(false)

  const normalize = (val: string) => val.trim().toLowerCase()

  async function kurangiManual() {
    if (!sku || !color || !qty) {
      alert('Lengkapi data')
      return
    }

    setLoading(true)

    const cleanSku = normalize(sku)
    const cleanColor = normalize(color)
    const amount = Number(qty) || 0

    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('sku', normalizeSku(sku))
      .eq('color', normalizeColor(color))
      .maybeSingle()

    if (!existing) {
      alert('Varian tidak ditemukan')
      setLoading(false)
      return
    }

    const newStock = (existing.stock || 0) - amount

    await supabase
      .from('products')
      .update({
        stock: newStock < 0 ? 0 : newStock,
        updated_at: new Date(),
      })
      .eq('id', existing.id)

    setSku('')
    setColor('')
    setQty('')

    setLoading(false)
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
      const sku = normalize(item['Kode Barang'] || '')
      const color = normalize(item['Warna Frame'] || '')
      const qty = Number(item['Qty']) || 0

      if (!sku || !color) continue

      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .eq('color', color)
        .maybeSingle()

      if (existing) {
        const newStock = (existing.stock || 0) - qty

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

      <h1 className="text-3xl font-bold mb-6">
        KURANGI STOK VARIAN (POS SYSTEM - TeamMyHappyd)
      </h1>

      <div className="grid md:grid-cols-2 gap-6">

        {/* MANUAL */}
        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Kurangi Manual</h2>

          <input
            className="border p-2 w-full mb-2"
            placeholder="Kode Barang"
            value={sku}
            onChange={e => setSku(e.target.value)}
          />

          <input
            className="border p-2 w-full mb-2"
            placeholder="Warna Frame"
            value={color}
            onChange={e => setColor(e.target.value)}
          />

          <input
            className="border p-2 w-full mb-2"
            type="number"
            placeholder="Jumlah keluar"
            value={qty}
            onChange={e => setQty(e.target.value)}
          />

          <button
            onClick={kurangiManual}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white p-2 w-full rounded"
          >
            {loading ? 'Proses...' : 'Kurangi Stok'}
          </button>
        </div>

        {/* EXCEL */}
        <div className="border p-6 rounded-xl">
          <h2 className="font-bold mb-4">Import Excel</h2>

          <p className="text-sm text-gray-500 mb-3">
            Kolom wajib: Kode Barang, Warna Frame, Qty
          </p>

          <input type="file" onChange={uploadExcel} />
        </div>

      </div>
    </main>
  )
}