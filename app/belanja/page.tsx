'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

type SortKey = 'name' | 'sku' | 'color' | 'stock' | 'updated_at'
type SortDir = 'asc' | 'desc'

export default function Home() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('sku')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function getProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')

    if (data) setProducts(data)
  }

  useEffect(() => {
    getProducts()
  }, [])

  const filtered = useMemo(() => {
    let result = [...products]

    if (search) {
      result = result.filter(p =>
        p.sku?.toLowerCase().includes(search.toLowerCase())
      )
    }

    result.sort((a, b) => {
      const valA = a[sortKey] ?? ''
      const valB = b[sortKey] ?? ''

      if (sortKey === 'stock') {
        return sortDir === 'asc'
          ? valA - valB
          : valB - valA
      }

      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

    return result
  }, [products, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const totalStock = filtered.reduce(
    (sum, i) => sum + (i.stock || 0),
    0
  )

  const warningItems = filtered.filter(p => (p.stock || 0) <= 2)

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(filtered)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'STOK')
    XLSX.writeFile(wb, 'stok.xlsx')
  }

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b pb-3">
        <h1 className="text-2xl font-bold">
          STOK PER VARIAN (POS SYSTEM - TeamMyHappyd)
        </h1>

        <div className="flex gap-3 mt-3">
          <input
            className="border px-3 py-2 rounded w-80"
            placeholder="Cari SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            onClick={exportExcel}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Export
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-3 my-4">
        <div className="border p-3 rounded">
          Total: {filtered.length}
        </div>
        <div className="border p-3 rounded">
          Stok: {totalStock}
        </div>
        <div className="border p-3 rounded text-red-600">
          Kritis: {warningItems.length}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto border rounded">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>

              <th className="border p-2 text-center">No</th>

              <th className="border p-2 text-left">Nama Frame</th>

              <th className="border p-2 text-left font-bold">SKU</th>

              <th className="border p-2 text-left">Warna</th>

              <th className="border p-2 text-center">Stok</th>

              {/* 🔥 NEW COLUMN */}
              <th className="border p-2 text-center">Belanja</th>

              <th className="border p-2 text-center">Update</th>

            </tr>
          </thead>

          <tbody>
            {filtered.map((item, i) => {
              const stock = item.stock || 0

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
                    <span className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition">
                      {item.color}
                    </span>
                  </td>

                  <td className="border p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      stock <= 2
                        ? 'bg-red-100 text-red-600'
                        : stock <= 5
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {stock}
                    </span>
                  </td>

                  {/* 🔥 SUPPLIER LINK */}
                  <td className="border p-2 text-center">
                    {item.supplier_link ? (
                      <a
                        href={item.supplier_link}
                        target="_blank"
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        BELI
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        -
                      </span>
                    )}
                  </td>

                  <td className="border p-2 text-center text-xs text-gray-600">
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