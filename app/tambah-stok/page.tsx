'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function TambahStokPage() {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState('')

  async function tambahManual() {
    if (!name || !sku || !stock) {
      alert('Lengkapi data')
      return
    }

    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .single()

    if (existing) {
      const newStock =
        existing.stock + Number(stock)

      await supabase
        .from('products')
        .update({
          stock: newStock,
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
          },
        ])

      alert('Barang baru berhasil ditambah')
    }

    setName('')
    setSku('')
    setStock('')
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
      const name = item['Nama Frame']
      const stock = Number(item['Stok Total'])

      if (!sku) continue

      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single()

      if (existing) {
        const newStock =
          existing.stock + stock

        await supabase
          .from('products')
          .update({
            stock: newStock,
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
            },
          ])
      }
    }

    alert('Upload Excel berhasil')
  }

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-6">
        TAMBAH STOK
      </h1>

      <div className="border p-5 mb-8">
        <h2 className="text-xl font-bold mb-4">
          Tambah Manual
        </h2>

        <div className="flex flex-col gap-3 max-w-xl">
          <input
            type="text"
            placeholder="Nama Frame"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="border p-3"
          />

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
            placeholder="Jumlah Stok"
            value={stock}
            onChange={(e) =>
              setStock(e.target.value)
            }
            className="border p-3"
          />

          <button
            onClick={tambahManual}
            className="bg-black text-white p-3"
          >
            Simpan
          </button>
        </div>
      </div>

      <div className="border p-5">
        <h2 className="text-xl font-bold mb-4">
          Upload Excel
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