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
        <h1 className="text-3xl font-bold text-black">
          STOK BARANG SAAT INI
        </h1>
        <p className="text-gray-600 mt-1">
          Data stok terbaru dari sistem inventory
        </p>
      </div>

      {/* TABLE WRAPPER */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        
        <table className="w-full border-collapse">
          
          {/* TABLE HEADER */}
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b border-gray-200 p-3 text-left font-bold text-black">
                NO
              </th>
              <th className="border-b border-gray-200 p-3 text-left font-bold text-black">
                Nama Frame
              </th>
              <th className="border-b border-gray-200 p-3 text-left font-bold text-black">
                Kode Barang
              </th>
              <th className="border-b border-gray-200 p-3 text-left font-bold text-black">
                Tanggal Update
              </th>
              <th className="border-b border-gray-200 p-3 text-left font-bold text-black">
                Stok Total
              </th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody>
            {products.map((item, index) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition"
              >
                <td className="border-b border-gray-100 p-3">
                  {index + 1}
                </td>

                <td className="border-b border-gray-100 p-3 font-medium">
                  {item.name}
                </td>

                <td className="border-b border-gray-100 p-3 text-gray-700">
                  {item.sku}
                </td>

                <td className="border-b border-gray-100 p-3 text-gray-600">
                  {new Date(item.updated_at).toLocaleString()}
                </td>

                <td className="border-b border-gray-100 p-3 font-semibold">
                  {item.stock}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </main>
  )
}