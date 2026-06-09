'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Sales = {
  id: string
  name: string
  sku: string
  color: string
  qty: number
  created_at: string
}

export default function LaporanPage() {
  const [sales, setSales] = useState<Sales[]>([])
  const [range, setRange] = useState<'today' | 'yesterday' | '7d' | '30d' | 'custom'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // =========================
  // FETCH SALES
  // =========================
  async function fetchSales() {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setSales(data)
  }

  useEffect(() => {
    fetchSales()
  }, [])

  // =========================
  // DATE FILTER
  // =========================
  const filtered = useMemo(() => {
    const now = new Date()

    let start = new Date()

    if (range === 'today') {
      start.setHours(0, 0, 0, 0)
    }

    if (range === 'yesterday') {
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(0, 0, 0, 0)

      return sales.filter(s => {
        const d = new Date(s.created_at)
        return d >= start && d < end
      })
    }

    if (range === '7d') {
      start.setDate(now.getDate() - 7)
    }

    if (range === '30d') {
      start.setDate(now.getDate() - 30)
    }

    if (range === 'custom') {
      if (!startDate || !endDate) return sales
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      return sales.filter(s => {
        const d = new Date(s.created_at)
        return d >= start && d <= end
      })
    }

    return sales.filter(s => new Date(s.created_at) >= start)
  }, [sales, range, startDate, endDate])

  // =========================
  // GROUP BY SKU (AGREGASI)
  // =========================
  const summary = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number }>()

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

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="border-b pb-4 sticky top-0 bg-white z-10">
        <h1 className="text-2xl font-bold">
          LAPORAN PENJUALAN (POS SYSTEM - TeamMyHappyd)
        </h1>

        {/* FILTER */}
        <div className="flex flex-wrap gap-2 mt-3">

          {['today', 'yesterday', '7d', '30d', 'custom'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as any)}
              className={`px-3 py-1 border rounded text-sm ${
                range === r ? 'bg-black text-white' : ''
              }`}
            >
              {r}
            </button>
          ))}

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
          Total Item: {summary.length}
        </div>
        <div className="border p-3 rounded font-bold">
          Total Terjual: {totalQty}
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded overflow-auto">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-2 text-left">Nama Frame</th>
              <th className="border p-2 text-left">SKU</th>
              <th className="border p-2 text-center">Qty Terjual</th>
            </tr>
          </thead>

          <tbody>
            {summary.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">

                <td className="border p-2 font-medium">
                  {item.name}
                </td>

                <td className="border p-2">
                  {item.sku}
                </td>

                <td className="border p-2 text-center font-bold">
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