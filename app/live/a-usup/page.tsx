'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import * as XLSX from 'xlsx'

export default function AUsupPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function getData() {
    setLoading(true)

    const { data } = await supabase
      .from('live_reports_a_usup')
      .select('*')
      .order('id', { ascending: false })

    if (data) {
      setData(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

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
      await supabase
        .from('live_reports_a_usup')
        .insert([
          {
            nomor:
              item['NO']?.toString() || '',

            order_id:
              item[
                'ID Pesanan/Penyesuaian'
              ]?.toString() || '',

            no_persamaan:
              item['no persamaan']?.toString() ||
              '',

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

    alert('Upload berhasil')

    getData()

    setLoading(false)
  }

  async function hapusSemua() {
    const konfirmasi = confirm(
      'Hapus semua data?'
    )

    if (!konfirmasi) return

    await supabase
      .from('live_reports_a_usup')
      .delete()
      .neq('id', 0)

    getData()
  }

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            HASIL LIVE A USUP
          </h1>

          <p className="text-gray-500 mt-2">
            Monitoring realtime
          </p>
        </div>

        <div className="flex gap-3">
          <label className="bg-black text-white px-5 py-3 rounded cursor-pointer">
            Upload Excel

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={uploadExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={hapusSemua}
            className="bg-red-600 text-white px-5 py-3 rounded"
          >
            Hapus Semua
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-3 border">
                NO
              </th>

              <th className="p-3 border">
                ID Pesanan
              </th>

              <th className="p-3 border">
                No Persamaan
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
                  colSpan={6}
                  className="text-center p-10"
                >
                  Loading...
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td className="border p-3">
                    {item.nomor}
                  </td>

                  <td className="border p-3">
                    {item.order_id}
                  </td>

                  <td className="border p-3">
                    {item.no_persamaan}
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