'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

export default function BelanjaPage() {
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [search, setSearch] = useState('')

  // =====================
  // LOAD DATA SUPABASE
  // =====================
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

  // =====================
  // NORMALIZER
  // =====================
  const norm = (v: string) => (v || '').trim().toLowerCase()

  // =====================
  // FIND SUPPLIER
  // MATCH: supplier + nama + sku
  // =====================
  function getSupplier(item: any) {
    return suppliers.find(
      (s) =>
        norm(s.name) === norm(item.name) &&
        norm(s.sku) === norm(item.sku)
    )
  }

  function formatPhone(phone: string) {
    if (!phone) return ''
    let p = phone.replace(/[^0-9]/g, '')
    if (p.startsWith('0')) p = '62' + p.slice(1)
    return p
  }

  // =====================
  // FILTER
  // =====================
  const filtered = useMemo(() => {
    return products.filter((p) =>
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

        <input
          className="border px-3 py-2 rounded w-80 mt-3"
          placeholder="Cari SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="overflow-auto border rounded mt-4">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-2 text-center">No</th>
              <th className="border p-2 text-left">Nama Frame</th>
              <th className="border p-2 text-left">Kode Frame</th>
              <th className="border p-2 text-left">Supplier</th>
              <th className="border p-2 text-center">WA</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, i) => {
              const supplier = getSupplier(item)
              const wa = supplier?.phone
                ? formatPhone(supplier.phone)
                : ''

              const message = encodeURIComponent(
                `Kak, saya mau pesan lagi kacamata ${item.name}, ${item.sku}, di toko ${supplier?.supplier_name || '-'}`
              )

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
                    {supplier?.supplier_name || '-'}
                  </td>

                  <td className="border p-2 text-center">

                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}?text=${message}`}
                        target="_blank"
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                      >
                        WA ORDER
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