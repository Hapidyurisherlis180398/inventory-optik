'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [products, setProducts] = useState<any[]>([])

  async function getProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false })

    if (data) setProducts(data)
  }

  useEffect(() => {
    getProducts()
  }, [])

  return (
    <main className="min-h-screen bg-white text-black p-8">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          STOK PER VARIAN (POS SYSTEM)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitoring stok berdasarkan SKU dan warna frame
        </p>
      </div>

      {/* TABLE WRAPPER */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">

        <table className="w-full text-sm border-collapse">

          {/* HEADER */}
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {['No', 'Nama', 'SKU', 'Warna', 'Stok', 'Update'].map((head) => (
                <th
                  key={head}
                  className="px-4 py-3 text-left font-semibold border-b border-gray-200"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {products.map((item, i) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition border-b border-gray-100"
              >

                <td className="px-4 py-3 text-gray-500">
                  {i + 1}
                </td>

                <td className="px-4 py-3 font-medium">
                  {item.name}
                </td>

                <td className="px-4 py-3 text-gray-700">
                  {item.sku}
                </td>

                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700">
                    {item.color}
                  </span>
                </td>

                <td className="px-4 py-3 font-bold text-black">
                  {item.stock}
                </td>

                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(item.updated_at).toLocaleString('id-ID')}
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>
    </main>
  )
}