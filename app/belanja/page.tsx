'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

type Product = {
  id: string
  name: string
  sku: string
  color: string
  stock: number
}

type Supplier = {
  id: string
  supplier_name: string
  name: string
  sku: string
  phone: string
}

export default function BelanjaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')

  // ======================
  // FETCH DATA
  // ======================
  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*')
    if (data) setProducts(data)
  }

  async function fetchSuppliers() {
    const { data } = await supabase.from('suppliers').select('*')
    if (data) setSuppliers(data)
  }

  useEffect(() => {
    fetchProducts()
    fetchSuppliers()
  }, [])

  // ======================
  // NORMALIZE
  // ======================
  const norm = (v: string) => (v || '').trim().toLowerCase()

  const normalizePhone = (phone: string) => {
    if (!phone) return ''
    let p = phone.replace(/[^0-9]/g, '')
    if (p.startsWith('0')) p = '62' + p.slice(1)
    return p
  }

  // ======================
  // GET SUPPLIER WA
  // ======================
  function getSupplier(item: Product) {
    return suppliers.find(
      s => norm(s.sku) === norm(item.sku)
    )
  }

  // ======================
  // FILTER
  // ======================
  const filtered = useMemo(() => {
    return products.filter(p =>
      norm(p.sku).includes(norm(search))
    )
  }, [products, search])

  // ======================
  // UPLOAD SUPPLIER EXCEL
  // ======================
  async function uploadSupplier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    for (const r of rows) {
      const supplier_name = r['supplier_name']
      const name = r['name']
      const sku = norm(r['sku'])
      const phone = r['phone']

      if (!sku || !phone) continue

      const { data: existing } = await supabase
        .from('suppliers')
        .select('*')
        .eq('sku', sku)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('suppliers')
          .update({ supplier_name, name, phone })
          .eq('id', existing.id)
      } else {
        await supabase.from('suppliers').insert([
          { supplier_name, name, sku, phone }
        ])
      }
    }

    alert('Supplier berhasil diupload')
    fetchSuppliers()
  }

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="sticky top-0 bg-white z-20 border-b pb-4">
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

          {/* UPLOAD SUPPLIER */}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={uploadSupplier}
            className="border p-2 rounded"
          />

        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto border rounded mt-4">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-2 text-center">No</th>
              <th className="border p-2 text-left">Nama Frame</th>
              <th className="border p-2 text-left">SKU</th>
              <th className="border p-2 text-left">Stok</th>
              <th className="border p-2 text-left">Supplier</th>
              <th className="border p-2 text-center">WhatsApp</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, i) => {
              const supplier = getSupplier(item)
              const phone = normalizePhone(supplier?.phone || '')

              const message = `Halo kak, saya mau pesan lagi kacamata ${item.name}, ${item.sku} di toko ${supplier?.supplier_name || '-'}`
              const waLink = phone
                ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
                : ''

              return (
                <tr key={item.id} className="hover:bg-gray-50">

                  <td className="border p-2 text-center">{i + 1}</td>

                  <td className="border p-2">{item.name}</td>

                  <td className="border p-2 font-bold">
                    {item.sku}
                  </td>

                  <td className="border p-2">
                    {item.stock}
                  </td>

                  <td className="border p-2">
                    {supplier?.supplier_name || '-'}
                  </td>

                  <td className="border p-2 text-center">
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                      >
                        WA BELI
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
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