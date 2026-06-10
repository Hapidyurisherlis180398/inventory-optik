'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import * as XLSX from 'xlsx'

export default function HostPage({
  params,
}: {
  params: { host: string }
}) {
    const host = String(params.host).toLowerCase()

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function getData() {
    setLoading(true)

    const { data, error } = await supabase
      .from('live_reports')
      .select('*')
      .eq('host', host)
      .order('id', { ascending: false })

    if (!error && data) {
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
        .from('live_reports')
        .insert([
          {
            host: host.toLowerCase(),

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

    alert('Upload Excel berhasil')

    getData()

    setLoading(false)
  }

  async function hapusSemuaData() {
    const konfirmasi = confirm(
      'Yakin ingin menghapus semua data host ini?'
    )

    if (!konfirmasi) return

    setLoading(true)

    await supabase
      .from('live_reports')
      .delete()
      .eq('host', host)

    setData([])

    setLoading(false)

    alert('Semua data berhasil dihapus')
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold uppercase">
            HASIL LIVE {host}
          </h1>

          <p className="text-gray-500 mt-2">
            Monitoring laporan live realtime
          </p>
        </div>

        <div className="flex gap-3">
          <label className="bg-black text-white px-5 py-3 rounded-lg cursor-pointer hover:opacity-90">
            Upload Excel

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={uploadExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={hapusSemuaData}
            className="bg-red-600 text-white px-5 py-3 rounded-lg hover:opacity-90"
          >
            Hapus Semua
          </button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Total Data: {data.length}
        </p>
      </div>

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
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center p-10"
                >
                  Belum ada data
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-100"
                >
                  <td className="border p-3 text-center">
                    {item.nomor}
                  </td>

                  <td className="border p-3">
                    {item.order_id}
                  </td>

                  <td className="border p-3 text-center">
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