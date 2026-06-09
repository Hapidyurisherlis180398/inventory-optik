'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import {
  normalizeSku,
  normalizeColor,
} from '../../lib/normalize'

export default function TambahStokPage() {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [color, setColor] = useState('')
  const [stock, setStock] = useState('')
  const [loading, setLoading] = useState(false)

  // =========================
  // NORMALIZER
  // =========================
  const normalize = (val: string) =>
    val.trim().toLowerCase()

  // =========================
  // TAMBAH MANUAL
  // =========================
  async function tambahManual() {

    if (!name || !sku || !color || !stock) {
      alert('Lengkapi data')
      return
    }

    setLoading(true)

    try {

      const cleanSku = normalizeSku(sku)

      const cleanColor =
        normalizeColor(color)

      const qty = Number(stock) || 0

      const { data: existing, error } =
        await supabase
          .from('products')
          .select('*')
          .eq('sku', cleanSku)
          .eq('color', cleanColor)
          .maybeSingle()

      if (error) {
        console.log(error)
        alert('Gagal cek data')
        setLoading(false)
        return
      }

      // =========================
      // UPDATE
      // =========================
      if (existing) {

        const { error: updateError } =
          await supabase
            .from('products')
            .update({
              stock:
                (existing.stock || 0) + qty,
              updated_at: new Date(),
            })
            .eq('id', existing.id)

        if (updateError) {
          console.log(updateError)
          alert('Gagal update stok')
          setLoading(false)
          return
        }

      } else {

        // =========================
        // INSERT
        // =========================
        const { error: insertError } =
          await supabase
            .from('products')
            .insert([
              {
                name: name.trim(),
                sku: cleanSku,
                color: cleanColor,
                stock: qty,
              },
            ])

        if (insertError) {
          console.log(insertError)
          alert('Gagal tambah data')
          setLoading(false)
          return
        }
      }

      setName('')
      setSku('')
      setColor('')
      setStock('')

      alert('Stok berhasil ditambah')

    } catch (err) {
      console.log(err)
      alert('Terjadi error')
    }

    setLoading(false)
  }

  // =========================
  // IMPORT EXCEL
  // =========================
  async function uploadExcel(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]

    if (!file) return

    setLoading(true)

    try {

      const data = await file.arrayBuffer()

      const wb = XLSX.read(data)

      const sheet =
        wb.Sheets[wb.SheetNames[0]]

      // IMPORTANT
      const rows: any[] =
        XLSX.utils.sheet_to_json(sheet, {
          defval: '',
        })

      console.log('TOTAL ROW:', rows.length)
      console.log(rows)

      let success = 0
      let failed = 0

      // =========================
      // LOOP ROW
      // =========================
      for (const item of rows) {

        try {

          const name = String(
            item['Nama Frame'] || ''
          ).trim()

          const sku = normalizeSku(
            String(
              item['Kode Barang'] || ''
            )
          )

          const color = normalizeColor(
            String(
              item['Warna Frame'] || ''
            )
          )

          const stock = Number(
            item['Stok Total'] || 0
          )

          console.log({
            name,
            sku,
            color,
            stock,
          })

          // VALIDASI
          if (!sku || !color) {
            failed++
            continue
          }

          // =========================
          // CEK EXISTING
          // =========================
          const {
            data: existing,
            error,
          } = await supabase
            .from('products')
            .select('*')
            .eq('sku', sku)
            .eq('color', color)
            .maybeSingle()

          if (error) {
            console.log(error)
            failed++
            continue
          }

          // =========================
          // UPDATE
          // =========================
          if (existing) {

            const {
              error: updateError,
            } = await supabase
              .from('products')
              .update({
                stock:
                  (existing.stock || 0) +
                  stock,

                updated_at: new Date(),
              })
              .eq('id', existing.id)

            if (updateError) {
              console.log(updateError)
              failed++
            } else {
              success++
            }

          } else {

            // =========================
            // INSERT
            // =========================
            const {
              error: insertError,
            } = await supabase
              .from('products')
              .insert([
                {
                  name,
                  sku,
                  color,
                  stock,
                },
              ])

            if (insertError) {
              console.log(insertError)
              failed++
            } else {
              success++
            }
          }

        } catch (rowError) {

          console.log(
            'ROW ERROR:',
            rowError
          )

          failed++
        }
      }

      alert(
        `Upload selesai\n\nBerhasil: ${success}\nGagal: ${failed}`
      )

    } catch (err) {

      console.log(err)

      alert('Upload Excel gagal')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white text-black p-10">

      <h1 className="text-3xl font-bold mb-6">
        TAMBAH STOK VARIAN
        (POS SYSTEM - TeamMyHappyd)
      </h1>

      <div className="grid md:grid-cols-2 gap-6">

        {/* MANUAL */}
        <div className="border p-6 rounded-xl">

          <h2 className="font-bold mb-4">
            Manual Input
          </h2>

          <input
            className="border p-2 w-full mb-2"
            placeholder="Nama Frame"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          <input
            className="border p-2 w-full mb-2"
            placeholder="Kode Barang"
            value={sku}
            onChange={(e) =>
              setSku(e.target.value)
            }
          />

          <input
            className="border p-2 w-full mb-2"
            placeholder="Warna Frame"
            value={color}
            onChange={(e) =>
              setColor(e.target.value)
            }
          />

          <input
            className="border p-2 w-full mb-2"
            type="number"
            placeholder="Tambah Stok"
            value={stock}
            onChange={(e) =>
              setStock(e.target.value)
            }
          />

          <button
            onClick={tambahManual}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white p-2 w-full rounded"
          >
            {loading
              ? 'Menyimpan...'
              : 'Simpan Stok'}
          </button>

        </div>

        {/* IMPORT EXCEL */}
        <div className="border p-6 rounded-xl">

          <h2 className="font-bold mb-4">
            Import Excel
          </h2>

          <div className="text-sm text-gray-500 mb-4">

            <p>
              Format wajib:
            </p>

            <p>
              Nama Frame |
              Kode Barang |
              Warna Frame |
              Stok Total
            </p>

          </div>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={uploadExcel}
          />

        </div>

      </div>
    </main>
  )
}