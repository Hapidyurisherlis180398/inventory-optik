'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import * as XLSX from 'xlsx'

export default function AUsupPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [
    totalTerbayar,
    setTotalTerbayar,
  ] = useState(0)

  async function getData() {
    setLoading(true)

    const { data, error } = await supabase
      .from('live_reports_a_usup')
      .select('*')
      .order('id', { ascending: true })

    if (!error && data) {
      setData(data)

      // HITUNG TOTAL TERBAYAR
      const total = data.reduce(
        (sum, item) => {
          // hanya status TERBAYAR
          if (
            item.status &&
            item.status.includes(
              'TERBAYAR'
            )
          ) {
            const angka = Number(
              item.total_pendapatan
                ?.toString()
                .replace(/[^\d]/g, '')
            )

            return sum + (angka || 0)
          }

          return sum
        },
        0
      )

      setTotalTerbayar(total)
    }

    setLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

  function formatRupiah(
    angka: number
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
      }
    ).format(angka)
  }

  async function uploadExcel(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    setLoading(true)

    const buffer = await file.arrayBuffer()

    const workbook = XLSX.read(buffer)

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]]

    const jsonData: any[] =
      XLSX.utils.sheet_to_json(sheet)

    for (const item of jsonData) {
      const orderId =
        item[
          'ID Pesanan/Penyesuaian'
        ]?.toString()

      // skip jika kosong
      if (!orderId) continue

      // cek duplicate
      const { data: existing } =
        await supabase
          .from('live_reports_a_usup')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle()

      // jika sudah ada → skip
      if (existing) {
        continue
      }

      // insert data baru
      await supabase
        .from('live_reports_a_usup')
        .insert([
          {
            nomor:
              item['NO']?.toString() || '',

            order_id: orderId,

            toko:
              item['TOKO']?.toString() || '',

            total_pendapatan:
              item[
                'Total Pendapatan'
              ]?.toString() || '',

            status:
              item['STATUS']?.toString() || '',
          },
        ])
    }

    alert(
      'Upload selesai tanpa duplicate'
    )

    getData()

    setLoading(false)
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            HASIL LIVE A USUP
          </h1>

          <p className="text-gray-500 mt-2">
            Monitoring realtime hasil live
          </p>
        </div>

        <label className="bg-black text-white px-5 py-3 rounded-lg cursor-pointer hover:opacity-90 w-fit">
          Upload Excel

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={uploadExcel}
            className="hidden"
          />
        </label>
      </div>

      {/* RINGKASAN */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="border rounded-xl p-5">
          <p className="text-gray-500 text-sm mb-2">
            Total Data
          </p>

          <h2 className="text-2xl font-bold">
            {data.length}
          </h2>
        </div>

        <div className="border rounded-xl p-5 bg-green-50">
          <p className="text-gray-500 text-sm mb-2">
            Total Pendapatan
            Terbayar
          </p>

          <h2 className="text-2xl font-bold text-green-700">
            {formatRupiah(
              totalTerbayar
            )}
          </h2>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-3 border">
                NO
              </th>

              <th className="p-3 border">
                ID Pesanan/Penyesuaian
              </th>

              <th className="p-3 border">
                TOKO
              </th>

              <th className="p-3 border">
                Total Pendapatan
              </th>

              <th className="p-3 border">
                STATUS
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-10"
                >
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-10"
                >
                  Belum ada data
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-100"
                >
                  <td className="border p-3 text-center">
                    {index + 1}
                  </td>

                  <td className="border p-3">
                    {item.order_id}
                  </td>

                  <td className="border p-3">
                    {item.toko}
                  </td>

                  <td className="border p-3">
                    {item.total_pendapatan}
                  </td>

                  <td className="border p-3">
                    {item.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}