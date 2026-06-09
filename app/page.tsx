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

  // SORT + FILTER STABLE
  const filtered = useMemo(() => {
    let result = [...products]

    // SEARCH
    if (search) {
      result = result.filter(p =>
        p.sku?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // SORT
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

          {/* HEADER + SORT */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>

              <th className="border p-2">No</th>

              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('name')}
              >
                Nama ↕
              </th>

              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('sku')}
              >
                SKU ↕
              </th>

              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('color')}
              >
                Warna ↕
              </th>

              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('stock')}
              >
                Stok ↕
              </th>

              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort('updated_at')}
              >
                Update ↕
              </th>

            </tr>
          </thead>

          <tbody>
            {filtered.map((item, i) => {
              const stock = item.stock || 0

              return (
                <tr key={item.id} className="hover:bg-gray-50">

                  <td className="border p-2">{i + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">{item.sku}</td>
                  <td className="border p-2">{item.color}</td>

                  <td className={`border p-2 font-bold ${
                    stock <= 2 ? 'bg-red-100 text-red-600'
                    : stock <= 5 ? 'bg-yellow-100 text-yellow-700'
                    : ''
                  }`}>
                    {stock}
                  </td>

                  <td className="border p-2 text-xs">
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