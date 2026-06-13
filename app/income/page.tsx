'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export default function IncomePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] =
    useState(false)

  const [
    totalPembayaran,
    setTotalPembayaran,
  ] = useState(0)

  const [
    totalPendapatan,
    setTotalPendapatan,
  ] = useState(0)

  // TOTAL UANG TERBAYAR DARI LIVE REPORT
  const [
    totalSudahTerbayar,
    setTotalSudahTerbayar,
  ] = useState(0)

  async function getData() {
    setLoading(true)

    // =========================
    // DATA INCOME
    // =========================
    const { data, error } =
      await supabase
        .from('income')
        .select('*')
        .order('id', {
          ascending: false,
        })

    if (!error && data) {
      setData(data)

      // TOTAL PEMBAYARAN
      const totalBayar =
        data.reduce(
          (sum, item) => {
            const angka = Number(
              item.jumlah_pembayaran
                ?.toString()
                .replace(
                  /[^\d-]/g,
                  ''
                )
            )

            return (
              sum + (angka || 0)
            )
          },
          0
        )

      // TOTAL PENDAPATAN
      const totalIncome =
        data.reduce(
          (sum, item) => {
            const angka = Number(
              item.total_pendapatan
                ?.toString()
                .replace(
                  /[^\d-]/g,
                  ''
                )
            )

            return (
              sum + (angka || 0)
            )
          },
          0
        )

      setTotalPembayaran(
        totalBayar
      )

      setTotalPendapatan(
        totalIncome
      )
    }

    // =========================
    // TOTAL SUDAH TERBAYAR
    // DARI SEMUA LIVE REPORT
    // =========================

    let totalTerbayar = 0

    // A USUP
    const {
      data: usupData,
    } = await supabase
      .from(
        'live_reports_a_usup'
      )
      .select(
        'total_pendapatan,status'
      )

    // A AGIL
    const {
      data: agilData,
    } = await supabase
      .from(
        'live_reports_a_agil'
      )
      .select(
        'total_pendapatan,status'
      )

    // A CAPE
    const {
      data: capeData,
    } = await supabase
      .from(
        'live_reports_a_cape'
      )
      .select(
        'total_pendapatan,status'
      )

    const semuaData = [
      ...(usupData || []),
      ...(agilData || []),
      ...(capeData || []),
    ]

    semuaData.forEach((item) => {
      if (
        item.status &&
        item.status.includes(
          'TERBAYAR'
        )
      ) {
        const angka = Number(
          item.total_pendapatan
            ?.toString()
            .replace(
              /[^\d-]/g,
              ''
            )
        )

        totalTerbayar +=
          angka || 0
      }
    })

    setTotalSudahTerbayar(
      totalTerbayar
    )

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
    const file =
      event.target.files?.[0]

    if (!file) return

    setLoading(true)

    // HAPUS DATA LAMA
    await supabase
      .from('income')
      .delete()
      .neq('id', 0)

    // BACA EXCEL
    const buffer =
      await file.arrayBuffer()

    const workbook =
      XLSX.read(buffer)

    const sheet =
      workbook.Sheets[
        workbook.SheetNames[0]
      ]

    const jsonData: any[] =
      XLSX.utils.sheet_to_json(
        sheet
      )

    // INSERT DATA BARU
    for (const item of jsonData) {
      const orderId =
        item[
          'ID Pesanan/Penyesuaian'
        ]?.toString()

      if (!orderId) continue

      await supabase
        .from('income')
        .insert([
          {
            order_id: orderId,

            jumlah_pembayaran:
              item[
                'Jumlah penyelesaian pembayaran'
              ]?.toString() ||
              '',

            total_pendapatan:
              item[
                'Total Pendapatan'
              ]?.toString() ||
              '',
          },
        ])
    }

    alert(
      'Income terbaru berhasil diperbarui'
    )

    getData()

    setLoading(false)
  }

  async function sinkronkanIncome() {
    setLoading(true)

    const sekarang =
      new Date()

    const waktuIndonesia =
      sekarang.toLocaleString(
        'id-ID',
        {
          dateStyle: 'full',
          timeStyle: 'medium',
        }
      )

    // AMBIL DATA INCOME
    const {
      data: incomes,
    } = await supabase
      .from('income')
      .select('*')

    if (!incomes) {
      alert(
        'Data income kosong'
      )

      setLoading(false)

      return
    }

    for (const income of incomes) {
      const orderId =
        income.order_id

      const updateData = {
        total_pendapatan:
          income.total_pendapatan,

        status:
          'TERBAYAR • ' +
          waktuIndonesia,
      }

      // UPDATE A USUP
      await supabase
        .from(
          'live_reports_a_usup'
        )
        .update(updateData)
        .eq(
          'order_id',
          orderId
        )

      // UPDATE A AGIL
      await supabase
        .from(
          'live_reports_a_agil'
        )
        .update(updateData)
        .eq(
          'order_id',
          orderId
        )

      // UPDATE A CAPE
      await supabase
        .from(
          'live_reports_a_cape'
        )
        .update(updateData)
        .eq(
          'order_id',
          orderId
        )
    }

    alert(
      'Sinkronisasi income berhasil'
    )

    getData()

    setLoading(false)
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              DATA INCOME
            </h1>

            <p className="text-gray-500 mt-2">
              Monitoring income
              realtime
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <label className="bg-black text-white px-5 py-3 rounded-xl cursor-pointer hover:opacity-90">
              Upload Excel Income

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={
                  uploadExcel
                }
                className="hidden"
              />
            </label>

            <button
              onClick={
                sinkronkanIncome
              }
              className="bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700"
            >
              Sinkronkan
              Income
            </button>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl font-semibold">
            Sedang memproses
            data...
          </div>
        )}

        {/* TOTAL CARD */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {/* TOTAL PEMBAYARAN */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">
              Total Jumlah
              Penyelesaian
              Pembayaran
            </p>

            <h2 className="text-2xl font-bold text-black">
              {formatRupiah(
                totalPembayaran
              )}
            </h2>
          </div>

          {/* TOTAL PENDAPATAN */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">
              Total Pendapatan
            </p>

            <h2 className="text-2xl font-bold text-black">
              {formatRupiah(
                totalPendapatan
              )}
            </h2>
          </div>

          {/* TOTAL SUDAH TERBAYAR */}
          <div className="bg-green-50 rounded-2xl border border-green-200 p-6 shadow-sm">
            <p className="text-sm text-green-700 mb-2">
              Total Sudah
              Terbayar Dari
              Semua Live Report
            </p>

            <h2 className="text-2xl font-bold text-green-700">
              {formatRupiah(
                totalSudahTerbayar
              )}
            </h2>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b">
            <h2 className="text-2xl font-bold">
              Data Income
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Total data:{' '}
              {data.length}
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-4 border">
                    NO
                  </th>

                  <th className="p-4 border">
                    ID
                    Pesanan/Penyesuaian
                  </th>

                  <th className="p-4 border">
                    Jumlah
                    Penyelesaian
                    Pembayaran
                  </th>

                  <th className="p-4 border">
                    Total
                    Pendapatan
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center p-10"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : data.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center p-10"
                    >
                      Belum ada
                      data
                    </td>
                  </tr>
                ) : (
                  data.map(
                    (
                      item,
                      index
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="border p-4 text-center">
                          {index +
                            1}
                        </td>

                        <td className="border p-4 font-medium">
                          {
                            item.order_id
                          }
                        </td>

                        <td className="border p-4">
                          {
                            item.jumlah_pembayaran
                          }
                        </td>

                        <td className="border p-4 font-semibold text-green-700">
                          {
                            item.total_pendapatan
                          }
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}