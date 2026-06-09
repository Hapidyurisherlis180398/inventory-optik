'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')

  async function getProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')

    if (data) setProducts(data)
  }

  useEffect(() => {
    getProducts()
  }, [])

  // SORT SKU
  const sorted = useMemo(() => {
    return [...products].sort((a, b) =>
      (a.sku || '').localeCompare(b.sku || '')
    )
  }, [products])

  // SEARCH FILTER
  const filtered = sorted.filter((p) =>
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          STOK PER VARIAN (POS SYSTEM)
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Monitoring stok berdasarkan SKU & warna frame
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari SKU..."
          className="mt-4 w-full md:w-80 border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-xl shadow-sm">

        <table className="w-full text-sm border-collapse">

          {/* HEADER */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {['No', 'Nama', 'SKU', 'Warna', 'Stok', 'Update'].map((h) => (
                <th
                  key={h}
                  className="border-b px-4 py-3 text-center font-semibold text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {filtered.map((item, i) => {
              const stock = item.stock || 0

              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition border-b"
                >

                  {/* NO */}
                  <td className="px-4 py-3 text-center text-gray-600">
                    {i + 1}
                  </td>

                  {/* NAME */}
                  <td className="px-4 py-3">
                    {item.name}
                  </td>

                  {/* SKU (BOLD) */}
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {item.sku}
                  </td>

                  {/* COLOR */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700">
                      {item.color}
                    </span>
                  </td>

                  {/* STOCK CENTER */}
                  <td className="px-4 py-3 text-center font-bold">
                    <span
                      className={`px-2 py-1 rounded-md ${
                        stock <= 2
                          ? 'bg-red-100 text-red-600'
                          : stock <= 5
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {stock}
                    </span>
                  </td>

                  {/* UPDATE CENTER */}
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {new Date(item.updated_at).toLocaleString('id-ID')}
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