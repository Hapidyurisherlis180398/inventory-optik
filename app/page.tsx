'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
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
          STOK PER VARIAN (POS SYSTEM)
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

          {/* HEADER */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>

              <th className="border p-2 text-center">No</th>

              <th
                className="border p-2 cursor-pointer text-left"
                onClick={() => toggleSort('name')}
              >
                Nama ↕
              </th>

              <th
                className="border p-2 cursor-pointer text-left font-bold"
                onClick={() => toggleSort('sku')}
              >
                SKU ↕
              </th>

              <th
                className="border p-2 cursor-pointer text-left"
                onClick={() => toggleSort('color')}
              >
                Warna ↕
              </th>

              <th
                className="border p-2 cursor-pointer text-center"
                onClick={() => toggleSort('stock')}
              >
                Stok ↕
              </th>

              <th
                className="border p-2 cursor-pointer text-center"
                onClick={() => toggleSort('updated_at')}
              >
                Update ↕
              </th>

            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {filtered.map((item, i) => {
              const stock = item.stock || 0

              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-all duration-200"
                >

                  {/* NO CENTER */}
                  <td className="border p-2 text-center">
                    {i + 1}
                  </td>

                  {/* NAME */}
                  <td className="border p-2 font-medium">
                    {item.name}
                  </td>

                  {/* SKU BOLD */}
                  <td className="border p-2 font-bold">
                    {item.sku}
                  </td>

                  {/* COLOR (smooth badge style) */}
                  <td className="border p-2">
                    <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition">
                      {item.color}
                    </span>
                  </td>

                  {/* STOCK BADGE CENTER */}
                  <td className="border p-2 text-center">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold ${
                        stock <= 2
                          ? 'bg-red-100 text-red-600'
                          : stock <= 5
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {stock}
                    </span>
                  </td>

                  {/* UPDATE CENTER */}
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