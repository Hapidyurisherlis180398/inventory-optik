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
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-6">
        STOK BARANG SAAT INI
      </h1>

      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">NO</th>
            <th className="border p-2">Nama Frame</th>
            <th className="border p-2">Kode Barang</th>
            <th className="border p-2">Tanggal Update</th>
            <th className="border p-2">Stok Total</th>
          </tr>
        </thead>

        <tbody>
          {products.map((item, index) => (
            <tr key={item.id}>
              <td className="border p-2">
                {index + 1}
              </td>

              <td className="border p-2">
                {item.name}
              </td>

              <td className="border p-2">
                {item.sku}
              </td>

              <td className="border p-2">
                {new Date(item.updated_at).toLocaleString()}
              </td>

              <td className="border p-2">
                {item.stock}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}