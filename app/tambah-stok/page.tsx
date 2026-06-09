'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function TambahStokPage() {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState('')
  const [color, setColor] = useState('') // 👈 TAMBAHAN

  async function tambahManual() {
    if (!name || !sku || !stock || !color) {
      alert('Lengkapi data')
      return
    }

    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .single()

    if (existing) {
      const newStock = existing.stock + Number(stock)

      await supabase
        .from('products')
        .update({
          stock: newStock,
          color, // 👈 UPDATE COLOR
          updated_at: new Date(),
        })
        .eq('id', existing.id)

      alert('Stok berhasil ditambah')
    } else {
      await supabase
        .from('products')
        .insert([
          {
            name,
            sku,
            stock: Number(stock),
            color, // 👈 INSERT COLOR
          },
        ])

      alert('Barang baru berhasil ditambah')
    }

    setName('')
    setSku('')
    setStock('')
    setColor('')
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
      const name = item['Nama Frame']
      const stock = Number(item['Stok Total'])
      const color = item['Warna Frame'] // 👈 TAMBAHAN

      if (!sku) continue

      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single()

      if (existing) {
        const newStock = existing.stock + stock

        await supabase
          .from('products')
          .update({
            stock: newStock,
            color, // 👈 UPDATE COLOR
            updated_at: new Date(),
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('products')
          .insert([
            {
              name,
              sku,
              stock,
              color, // 👈 INSERT COLOR
            },
          ])
      }
    }

    alert('Upload Excel berhasil')
  }

  return (
    <main className="min-h-screen bg-white text-black p-10">

      <div className="mb-10">
        <h1 className="text-3xl font-bold">
          TAMBAH STOK
        </h1>
        <p className="text-gray-600 mt-1">
          Tambah stok + warna frame manual atau Excel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* MANUAL */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">

          <h2 className="text-xl font-bold mb-6">
            Tambah Stok Manual
          </h2>

          <div className="flex flex-col gap-4">

            <input
              type="text"
              placeholder="Nama Frame"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-3 rounded-lg"
            />

            <input
              type="text"
              placeholder="Kode Barang (SKU)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="border p-3 rounded-lg"
            />

            {/* 👇 WARNA FRAME */}
            <input
              type="text"
              placeholder="Warna Frame"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="border p-3 rounded-lg"
            />

            <input
              type="number"
              placeholder="Jumlah Stok"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="border p-3 rounded-lg"
            />

            <button
              onClick={tambahManual}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold p-3 rounded-lg"
            >
              Simpan Stok
            </button>

          </div>
        </div>

        {/* EXCEL */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">

          <h2 className="text-xl font-bold mb-6">
            Import Excel
          </h2>

          <p className="text-gray-600 text-sm mb-4">
            Kolom: Kode Barang, Nama Frame, Stok Total, Warna Frame
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={uploadExcel}
            className="w-full border p-3 rounded-lg"
          />

        </div>

      </div>
    </main>
  )
}