'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

type SortKey = 'name' | 'sku' | 'color' | 'stock' | 'updated_at'
type SortDir = 'asc' | 'desc'

export default function Home() {
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('sku')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function getProducts() {
    const { data } = await supabase.from('products').select('*')
    if (data) setProducts(data)
  }

  async function getSales() {
    const { data } = await supabase.from('sales').select('*')
    if (data) setSales(data)
  }

  useEffect(() => {
    getProducts()
    getSales()
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
        return sortDir === 'asc' ? valA - valB : valB - valA
      }

      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

    return result
  }, [products, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // =======================
  // 📊 SALES FILTER
  // =======================

  const now = new Date()

  const salesToday = sales.filter(s => {
    const d = new Date(s.created_at)
    return d.toDateString() === now.toDateString()
  })

  const sales7Days = sales.filter(s => {
    const d = new Date(s.created_at)
    return now.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000
  })

  const sales30Days = sales.filter(s => {
    const d = new Date(s.created_at)
    return now.getTime() - d.getTime() <= 30 * 24 * 60 * 60 * 1000
  })

  function exportSales(data: any[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'REPORT')
    XLSX.writeFile(wb, filename)
  }

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b pb-3">
        <h1 className="text-2xl font-bold">
          STOK POS SYSTEM
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
              <th className="border p-2">Nama</th>
              <th className="border p-2 font-bold">SKU</th>
              <th className="border p-2">Warna</th>
              <th className="border p-2 text-center">Stok</th>
              <th className="border p-2 text-center">Update</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, i) => {
              const stock = item.stock || 0

              return (
                <tr key={item.id} className="hover:bg-gray-50">

                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2 font-bold">{item.sku}</td>

                  <td className="border p-2">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {item.color}
                    </span>
                  </td>

                  <td className="border p-2 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
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

                  <td className="border p-2 text-center text-xs">
                    {new Date(item.updated_at).toLocaleString('id-ID')}
                  </td>

                </tr>
              )
            })}
          </tbody>

        </table>
      </div>

      {/* =======================
          📊 SALES REPORT
      ======================= */}
      <div className="mt-10 border rounded p-4">

        <h2 className="text-xl font-bold mb-4">
          Laporan Terjual Barang
        </h2>

        <div className="grid md:grid-cols-3 gap-3">

          <div className="border p-3 rounded">
            <p className="font-bold">Hari Ini</p>
            <p>{salesToday.length} transaksi</p>
            <button
              onClick={() => exportSales(salesToday, 'sales_today.xlsx')}
              className="mt-2 text-sm bg-black text-white px-3 py-1 rounded"
            >
              Download
            </button>
          </div>

          <div className="border p-3 rounded">
            <p className="font-bold">7 Hari</p>
            <p>{sales7Days.length} transaksi</p>
            <button
              onClick={() => exportSales(sales7Days, 'sales_7days.xlsx')}
              className="mt-2 text-sm bg-black text-white px-3 py-1 rounded"
            >
              Download
            </button>
          </div>

          <div className="border p-3 rounded">
            <p className="font-bold">30 Hari</p>
            <p>{sales30Days.length} transaksi</p>
            <button
              onClick={() => exportSales(sales30Days, 'sales_30days.xlsx')}
              className="mt-2 text-sm bg-black text-white px-3 py-1 rounded"
            >
              Download
            </button>
          </div>

        </div>

      </div>

    </main>
  )
}