'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

type SortKey = 'name' | 'sku' | 'color' | 'stock' | 'updated_at'
type SortDir = 'asc' | 'desc'

export default function BelanjaPage() {
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function getProducts() {
    const { data } = await supabase.from('products').select('*')
    if (data) setProducts(data)
  }

  async function getSuppliers() {
    const { data } = await supabase.from('suppliers').select('*')
    if (data) setSuppliers(data)
  }

  useEffect(() => {
    getProducts()
    getSuppliers()
  }, [])

  // =========================
  // NORMALIZER
  // =========================
  const norm = (v: string) => (v || '').trim().toLowerCase()

  const normalizePhone = (phone: string) => {
    if (!phone) return ''
    let p = phone.replace(/[^0-9]/g, '')
    if (p.startsWith('0')) p = '62' + p.slice(1)
    return p
  }

  // =========================
  // GET SUPPLIER WA
  // =========================
  function getWA(sku: string) {
    const found = suppliers.find(
      (s) => norm(s.sku) === norm(sku)
    )
    return normalizePhone(found?.phone || '')
  }

  // =========================
  // UPLOAD SUPPLIER EXCEL
  // =========================
  async function uploadSupplier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    for (const r of rows) {
      const sku = norm(r['SKU'])
      const phone = r['No WA']

      if (!sku || !phone) continue

      const { data: existing } = await supabase
        .from('suppliers')
        .select('*')
        .eq('sku', sku)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('suppliers')
          .update({ phone })
          .eq('id', existing.id)
      } else {
        await supabase.from('suppliers').insert([
          { sku, phone }
        ])
      }
    }

    alert('Supplier berhasil diupload')
    getSuppliers()
  }

  // =========================
  // FILTER
  // =========================
  const filtered = useMemo(() => {
    return products.filter(p =>
      norm(p.sku).includes(norm(search))
    )
  }, [products, search])

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="sticky top-0 bg-white z-20 border-b pb-3">
        <h1 className="text-2xl font-bold">
          BELANJA SUPPLIER (POS SYSTEM)
        </h1>

        <div className="flex gap-3 mt-3">
          <input
            className="border px-3 py-2 rounded w-80"
            placeholder="Cari SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="file"
            onChange={uploadSupplier}
            className="border p-2 rounded"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto border rounded mt-4">

        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border p-2 text-center">No</th>
              <th className="border p-2 text-left">Nama</th>
              <th className="border p-2 text-left font-bold">SKU</th>
              <th className="border p-2 text-left">Warna</th>
              <th className="border p-2 text-center">Stok</th>
              <th className="border p-2 text-center">WA</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, i) => {
              const stock = item.stock || 0
              const wa = getWA(item.sku)

              return (
                <tr key={item.id} className="hover:bg-gray-50">

                  <td className="border p-2 text-center">
                    {i + 1}
                  </td>

                  <td className="border p-2">
                    {item.name}
                  </td>

                  <td className="border p-2 font-bold">
                    {item.sku}
                  </td>

                  <td className="border p-2">
                    {item.color}
                  </td>

                  <td className="border p-2 text-center">
                    {stock}
                  </td>

                  <td className="border p-2 text-center">
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs"
                      >
                        WA
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        -
                      </span>
                    )}
                  </td>

                </tr>
              )
            })}
          </tbody>

        </table>
      </div>
    </main>
  )
}