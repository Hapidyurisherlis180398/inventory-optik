'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [products, setProducts] = useState<any[]>([])

  async function getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setProducts(data)
    }
  }

  useEffect(() => {
    getProducts()
  }, [])

  return (
    <main className="min-h-screen bg-white text-black p-10">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          STOK BARANG SAAT INI
        </h1>
        <p className="text-gray-600 mt-1">
          Data inventory optik terbaru
        </p>
      </div>

      {/* TABLE WRAPPER */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">

        <table className="w-full border-collapse">

          {/* HEADER */}
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-bold">No</th>
              <th className="p-3 text-left font-bold">Nama Frame</th>
              <th className="p-3 text-left font-bold">Kode Barang</th>
              <th className="p-3 text-left font-bold">Warna Frame</th>
              <th className="p-3 text-left font-bold">Stok</th>
              <th className="p-3 text-left font-bold">Terakhir Update</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {products.map((item, index) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition"
              >

                {/* NO */}
                <td className="p-3 border-t">
                  {index + 1}
                </td>

                {/* NAME */}
                <td className="p-3 border-t font-medium">
                  {item.name}
                </td>

                {/* SKU */}
                <td className="p-3 border-t text-gray-700">
                  {item.sku}
                </td>

                {/* COLOR */}
                <td className="p-3 border-t">
                  {item.color ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-200">
                      {item.color}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      -
                    </span>
                  )}
                </td>

                {/* STOCK */}
                <td className="p-3 border-t font-semibold">
                  {item.stock}
                </td>

                {/* UPDATED */}
                <td className="p-3 border-t text-gray-600 text-sm">
                  {item.updated_at
                    ? new Date(item.updated_at).toLocaleString('id-ID')
                    : '-'}
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </main>
  )
}