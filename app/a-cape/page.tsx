'use client'

import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'

export default function LaporanAUsupPage() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    const savedData = localStorage.getItem(
      'laporan-a-usup'
    )

    if (savedData) {
      setData(JSON.parse(savedData))
    }
  }, [])

  async function uploadExcel(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    const buffer = await file.arrayBuffer()

    const workbook = XLSX.read(buffer)

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]]

    const jsonData: any[] =
      XLSX.utils.sheet_to_json(sheet)

    setData(jsonData)

    localStorage.setItem(
      'laporan-a-usup',
      JSON.stringify(jsonData)
    )

    alert('Data berhasil diperbarui')
  }

  return (
    <main className="p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            LAPORAN LIVE A CAPE
          </h1>

          <p className="text-gray-500 mt-2">
            Monitoring data realtime
          </p>
        </div>

        <div>
          <label className="bg-black text-white px-5 py-3 rounded cursor-pointer">
            Upload Excel

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={uploadExcel}
              className="hidden"
            />
          </label>
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
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center p-10"
                >
                  Belum ada data
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-100"
                >
                  <td className="border p-3 text-center">
                    {item['NO']}
                  </td>

                  <td className="border p-3">
                    {
                      item[
                        'ID Pesanan/Penyesuaian'
                      ]
                    }
                  </td>

                  <td className="border p-3 text-center">
                    {item['no persamaan']}
                  </td>

                  <td className="border p-3">
                    {item['TOKO']}
                  </td>

                  <td className="border p-3">
                    {item['Total Pendapatan']}
                  </td>

                  <td className="border p-3">
                    {item['STATUS']}
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