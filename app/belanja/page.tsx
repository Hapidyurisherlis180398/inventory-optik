'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

type Product = {
  id: string
  name: string
  sku: string
  color: string
  stock: number
  updated_at: string
}

type Supplier = {
  id: string
  supplier_name: string
  name: string
  sku: string
  phone: string
}

type SortKey =
  | 'name'
  | 'sku'
  | 'color'
  | 'stock'
  | 'updated_at'

type SortDir = 'asc' | 'desc'

export default function BelanjaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')

  const [sortKey, setSortKey] =
    useState<SortKey>('stock')

  const [sortDir, setSortDir] =
    useState<SortDir>('asc')

  // =========================
  // FETCH PRODUCTS
  // =========================
  async function getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')

    if (error) {
      console.log(error)
      return
    }

    if (data) setProducts(data)
  }

  // =========================
  // FETCH SUPPLIERS
  // =========================
  async function getSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')

    if (error) {
      console.log(error)
      return
    }

    if (data) setSuppliers(data)
  }

  useEffect(() => {
    getProducts()
    getSuppliers()
  }, [])

  // =========================
  // NORMALIZER
  // =========================
  const norm = (v: string) =>
    (v || '').trim().toLowerCase()

  // =========================
  // NORMALIZE PHONE
  // =========================
  const normalizePhone = (phone: string) => {
    if (!phone) return ''

    let p = phone.replace(/[^0-9]/g, '')

    if (p.startsWith('0')) {
      p = '62' + p.slice(1)
    }

    return p
  }

  // =========================
  // FIND SUPPLIER
  // =========================
  function getSupplier(item: Product) {
    return suppliers.find(
      (s) => norm(s.sku) === norm(item.sku)
    )
  }

  // =========================
  // FILTER + SORT
  // =========================
  const filtered = useMemo(() => {
    let result = [...products]

    // SEARCH
    if (search) {
      result = result.filter(
        (p) =>
          norm(p.sku).includes(norm(search)) ||
          norm(p.name).includes(norm(search))
      )
    }

    // SORT
    result.sort((a, b) => {
      const valA = a[sortKey] ?? ''
      const valB = b[sortKey] ?? ''

      if (sortKey === 'stock') {
        return sortDir === 'asc'
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA)
      }

      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

    return result
  }, [products, search, sortKey, sortDir])

  // =========================
  // TOGGLE SORT
  // =========================
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(
        sortDir === 'asc' ? 'desc' : 'asc'
      )
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // =========================
  // SUMMARY
  // =========================
  const totalStock = filtered.reduce(
    (sum, item) => sum + (item.stock || 0),
    0
  )

  const warningItems = filtered.filter(
    (item) => (item.stock || 0) <= 2
  )

  // =========================
  // EXPORT EXCEL
  // =========================
  function exportExcel() {
    const dataExport = filtered.map((item) => {
      const supplier = getSupplier(item)

      return {
        'Nama Frame': item.name,
        SKU: item.sku,
        Warna: item.color,
        Stock: item.stock,
        Supplier:
          supplier?.supplier_name || '-',
        Phone: supplier?.phone || '-',
      }
    })

    const ws =
      XLSX.utils.json_to_sheet(dataExport)

    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'BELANJA'
    )

    XLSX.writeFile(
      wb,
      'belanja_supplier.xlsx'
    )
  }

  // =========================
  // UPLOAD SUPPLIER EXCEL
  // =========================
  async function uploadSupplier(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]

    if (!file) return

    const data = await file.arrayBuffer()

    const wb = XLSX.read(data)

    const sheet =
      wb.Sheets[wb.SheetNames[0]]

    const rows: any[] =
      XLSX.utils.sheet_to_json(sheet)

    for (const r of rows) {
      const supplier_name =
        r['supplier_name']

      const name = r['name']

      const sku = norm(r['sku'])

      const phone = r['phone']

      if (!sku || !phone) continue

      const { data: existing } =
        await supabase
          .from('suppliers')
          .select('*')
          .eq('sku', sku)
          .maybeSingle()

      if (existing) {
        await supabase
          .from('suppliers')
          .update({
            supplier_name,
            name,
            phone,
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('suppliers')
          .insert([
            {
              supplier_name,
              name,
              sku,
              phone,
            },
          ])
      }
    }

    alert('Supplier berhasil diupload')

    getSuppliers()
  }

  return (
    <main className="min-h-screen bg-white text-black p-6">

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b pb-3">

        <h1 className="text-2xl font-bold">
          BELANJA SUPPLIER
          (POS SYSTEM - TeamMyHappyd)
        </h1>

        <div className="flex flex-wrap gap-3 mt-3">

          {/* SEARCH */}
          <input
            className="border px-3 py-2 rounded w-80"
            placeholder="Cari SKU / Nama Frame..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          {/* EXPORT */}
          <button
            onClick={exportExcel}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Export Excel
          </button>

          {/* UPLOAD SUPPLIER */}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={uploadSupplier}
            className="border p-2 rounded"
          />

        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-3 my-4">

        <div className="border p-3 rounded">
          Total: {filtered.length}
        </div>

        <div className="border p-3 rounded">
          Stock: {totalStock}
        </div>

        <div className="border p-3 rounded text-red-600">
          Kritis: {warningItems.length}
        </div>

      </div>

      {/* TABLE */}
      <div className="overflow-auto border rounded">

        <table className="w-full text-sm">

          {/* HEADER */}
          <thead className="bg-gray-100 sticky top-0 z-10">

            <tr>

              <th className="border p-2 text-center">
                No
              </th>

              <th
                className="border p-2 text-left cursor-pointer"
                onClick={() =>
                  toggleSort('name')
                }
              >
                Nama Frame ↕
              </th>

              <th
                className="border p-2 text-left font-bold cursor-pointer"
                onClick={() =>
                  toggleSort('sku')
                }
              >
                SKU ↕
              </th>

              <th
                className="border p-2 text-left cursor-pointer"
                onClick={() =>
                  toggleSort('color')
                }
              >
                Warna ↕
              </th>

              <th
                className="border p-2 text-center cursor-pointer"
                onClick={() =>
                  toggleSort('stock')
                }
              >
                Stock ↕
              </th>

              <th className="border p-2 text-left">
                Supplier
              </th>

              <th className="border p-2 text-center">
                WhatsApp
              </th>

            </tr>

          </thead>

          {/* BODY */}
          <tbody>

            {filtered.map((item, i) => {
              const stock =
                item.stock || 0

              const supplier =
                getSupplier(item)

              const phone =
                normalizePhone(
                  supplier?.phone || ''
                )

              const supplierName =
                supplier?.supplier_name ||
                '-'

              const supplierFrameName =
                supplier?.name ||
                item.name

              const message =
                `Halo kak, saya mau pesan lagi kacamata *${supplierFrameName}* dengan kode Frame *${item.sku}* di toko ${supplierName}`

              const waLink = phone
                ? `https://wa.me/${phone}?text=${encodeURIComponent(
                    message
                  )}`
                : ''

              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-all duration-200"
                >

                  {/* NO */}
                  <td className="border p-2 text-center">
                    {i + 1}
                  </td>

                  {/* NAME */}
                  <td className="border p-2 font-medium">
                    {item.name}
                  </td>

                  {/* SKU */}
                  <td className="border p-2 font-bold">
                    {item.sku}
                  </td>

                  {/* COLOR */}
                  <td className="border p-2">

                    <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition">
                      {item.color}
                    </span>

                  </td>

                  {/* STOCK */}
                  <td className="border p-2 text-center">

                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold ${
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

                  {/* SUPPLIER */}
                  <td className="border p-2">
                    {supplierName}
                  </td>

                  {/* WA */}
                  <td className="border p-2 text-center">

                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"
                      >
                        WA BELI
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        -
                      </span>
                    )}

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