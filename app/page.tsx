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
    <main className="min-h-screen bg-white text-black p-10">

      <h1 className="text-3xl font-bold mb-6">
        STOK PER VARIAN (POS SYSTEM)
      </h1>

      <div className="overflow-x-auto border rounded-xl">

        <table className="w-full">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">No</th>
              <th className="p-3">Nama</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Warna</th>
              <th className="p-3">Stok</th>
              <th className="p-3">Update</th>
            </tr>
          </thead>

          <tbody>
            {products.map((item, i) => (
              <tr key={item.id} className="border-t">

                <td className="p-3">{i + 1}</td>
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.sku}</td>

                <td className="p-3">
                  <span className="px-2 py-1 bg-gray-200 rounded text-sm">
                    {item.color}
                  </span>
                </td>

                <td className="p-3 font-bold">{item.stock}</td>

                <td className="p-3 text-sm text-gray-500">
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