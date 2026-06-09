'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

type Sales = {
  id: string
  name: string
  sku: string
  color: string
  qty: number
  created_at: string
}

type Range = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export default function LaporanPage() {
  const [sales, setSales] = useState<Sales[]>([])
  const [range, setRange] = useState<Range>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // =========================
  // FETCH DATA
  // =========================
  async function fetchSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setSales(data)
  }

  useEffect(() => {
    fetchSales()
  }, [])

  // =========================
  // FILTER DATE
  // =========================
  const filtered = useMemo(() => {
    const now = new Date()

    let start = new Date()

    if (range === 'today') {
      start.setHours(0, 0, 0, 0)
      return sales.filter(s => new Date(s.created_at) >= start)
    }

    if (range === 'yesterday') {
      const startY = new Date()
      startY.setDate(now.getDate() - 1)
      startY.setHours(0, 0, 0, 0)

      const endY = new Date()
      endY.setHours(0, 0, 0, 0)

      return sales.filter(s => {
        const d = new Date(s.created_at)
        return d >= startY && d < endY
      })
    }

    if (range === '7d') {
      start.setDate(now.getDate() - 7)
    }

    if (range === '30d') {
      start.setDate(now.getDate() - 30)
    }

    if (range !== 'custom') {
      return sales.filter(s => new Date(s.created_at) >= start)
    }

    if (!startDate || !endDate) return sales

    const startC = new Date(startDate)
    const endC = new Date(endDate)
    endC.setHours(23, 59, 59, 999)

    return sales.filter(s => {
      const d = new Date(s.created_at)
      return d >= startC && d <= endC
    })
  }, [sales, range, startDate, endDate])

  // =========================
  // GROUP BY SKU + NAME
  // =========================
  const summary = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sku: string; qty: number }
    >()

    filtered.forEach(item => {
      const key = item.sku + item.color

      if (!map.has(key)) {
        map.set(key, {
          name: item.name,
          sku: item.sku,
          qty: item.qty,
        })
      } else {
        map.get(key)!.qty += item.qty
      }
    })

    return Array.from(map.values())
  }, [filtered])

  const totalQty = summary.reduce((a, b) => a + b.qty, 0)

  // =========================
  // EXPORT EXCEL
  // =========================
  function exportExcel() {
    const data = summary.map((item, i) => ({
      No: i + 1,
      'Nama Frame': item.name,
      SKU: item.sku,
      'Qty Terjual': item.qty,
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
    XLSX.writeFile(wb, `laporan-penjualan-${range}.xlsx`)
  }

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b pb-4">
        <h1 className="text-2xl font-bold">
          LAPORAN PENJUALAN (POS SYSTEM)
        </h1>

        <div className="flex flex-wrap gap-2 mt-3">

          {['today', 'yesterday', '7d', '30d', 'custom'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as Range)}
              className={`px-3 py-1 border rounded text-sm transition ${
                range === r ? 'bg-black text-white' : 'hover:bg-gray-100'
              }`}
            >
              {r}
            </button>
          ))}

          <button
            onClick={exportExcel}
            className="ml-auto bg-green-600 text-white px-4 py-1 rounded"
          >
            Export Excel
          </button>
        </div>

        {/* CUSTOM DATE */}
        {range === 'custom' && (
          <div className="flex gap-2 mt-3">
            <input
              type="date"
              className="border p-2"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="border p-2"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <div className="border p-3 rounded">
          Total Item: <b>{summary.length}</b>
        </div>
        <div className="border p-3 rounded">
          Total Terjual: <b>{totalQty}</b>
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded overflow-auto">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2 text-left">Nama Frame</th>
              <th className="border p-2 text-left">SKU</th>
              <th className="border p-2 text-center">Qty Terjual</th>
            </tr>
          </thead>

          <tbody>
            {summary.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition">

                <td className="border p-2 text-center">
                  {i + 1}
                </td>

                <td className="border p-2 font-medium">
                  {item.name}
                </td>

                <td className="border p-2 font-bold">
                  {item.sku}
                </td>

                <td className="border p-2 text-center font-bold text-green-600">
                  {item.qty}
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </main>
  )
}