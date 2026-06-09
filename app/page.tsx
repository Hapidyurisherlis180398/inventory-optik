'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

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

  // FILTER
  const filtered = sorted.filter((p) =>
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const totalStock = filtered.reduce(
    (sum, item) => sum + (item.stock || 0),
    0
  )

  const warningItems = filtered.filter(
    (p) => (p.stock || 0) <= 2
  )

  // EXPORT EXCEL
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(filtered)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'STOK')
    XLSX.writeFile(wb, 'stok-per-varian.xlsx')
  }

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="sticky top-0 bg-white z-20 border-b pb-4">

        {/* TITLE */}
        <h1 className="text-2xl font-bold">
          STOK PER VARIAN (POS SYSTEM)
        </h1>

        <p className="text-sm text-gray-500 mb-3">
          Monitoring SKU, Warna Frame, dan Stok Real-time
        </p>

        {/* CONTROL BAR */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari SKU..."
            className="border px-3 py-2 rounded w-full md:w-80"
          />

          <button
            onClick={exportExcel}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Export Excel
          </button>

        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5">

        <div className="border p-3 rounded">
          <p className="text-xs text-gray-500">Total Item</p>
          <p className="font-bold">{filtered.length}</p>
        </div>

        <div className="border p-3 rounded">
          <p className="text-xs text-gray-500">Total Stok</p>
          <p className="font-bold">{totalStock}</p>
        </div>

        <div className="border p-3 rounded">
          <p className="text-xs text-gray-500">Stok Kritis</p>
          <p className="font-bold text-red-600">
            {warningItems.length}
          </p>
        </div>

      </div>

      {/* WARNING */}
      {warningItems.length > 0 && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 rounded">
          <p className="font-bold text-red-600">
            ⚠ Stok Harus Restock (≤ 2)
          </p>
          <p className="text-sm text-red-500">
            {warningItems.map((w) => w.sku).join(', ')}
          </p>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-auto border rounded">

        <table className="w-full text-sm">

          {/* HEADER (STICKY) */}
          <thead className="bg-gray-100 sticky top-[160px] z-10">
            <tr>
              {['No', 'Nama', 'SKU', 'Warna', 'Stok', 'Update'].map((h) => (
                <th
                  key={h}
                  className="border p-2 text-left font-semibold"
                >
                  {h}
                </th>
              ))}
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
                    stock <= 2
                      ? 'bg-red-100 text-red-600'
                      : stock <= 5
                      ? 'bg-yellow-100 text-yellow-700'
                      : ''
                  }`}>
                    {stock}
                  </td>

                  <td className="border p-2 text-xs text-gray-500">
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