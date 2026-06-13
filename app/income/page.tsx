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

  const [
    totalTerbayarReport,
    setTotalTerbayarReport,
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
      const totalBayar = data.reduce(
        (sum, item) => {
          const angka = Number(
            item.jumlah_pembayaran
              ?.toString()
              .replace(/[^\d-]/g, '')
          )

          return sum + (angka || 0)
        },
        0
      )

      // TOTAL PENDAPATAN
      const totalIncome =
        data.reduce((sum, item) => {
          const angka = Number(
            item.total_pendapatan
              ?.toString()
              .replace(/[^\d-]/g, '')
          )

          return sum + (angka || 0)
        }, 0)

      setTotalPembayaran(
        totalBayar
      )

      setTotalPendapatan(
        totalIncome
      )
    }

    // =========================
    // TOTAL TERBAYAR REPORT
    // =========================

    let totalReport = 0

    // A USUP
    const { data: aUsup } =
      await supabase
        .from('live_reports_a_usup')
        .select(
          'total_pendapatan,status'
        )

    // A AGIL
    const { data: aAgil } =
      await supabase
        .from('live_reports_a_agil')
        .select(
          'total_pendapatan,status'
        )

    // A CAPE
    const { data: aCape } =
      await supabase
        .from('live_reports_a_cape')
        .select(
          'total_pendapatan,status'
        )

    const semuaReport = [
      ...(aUsup || []),
      ...(aAgil || []),
      ...(aCape || []),
    ]

    semuaReport.forEach((item) => {
      if (
        item.status &&
        item.status.includes(
          'TERBAYAR'
        )
      ) {
        const angka = Number(
          item.total_pendapatan
            ?.toString()
            .replace(/[^\d-]/g, '')
        )

        totalReport += angka || 0
      }
    })

    setTotalTerbayarReport(
      totalReport
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

    // BACA FILE EXCEL
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

    // INSERT DATA
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
              ]?.toString() || '',

            total_pendapatan:
              item[
                'Total Pendapatan'
              ]?.toString() || '',
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

    const sekarang = new Date()

    const waktuIndonesia =
      sekarang.toLocaleString(
        'id-ID',
        {
          dateStyle: 'full',
          timeStyle: 'medium',
        }
      )

    const { data: incomes } =
      await supabase
        .from('income')
        .select('*')

    if (!incomes) {
      alert('Data income kosong')

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
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-green-600 mb-2 tracking-wide">
                INCOME DASHBOARD
              </p>

              <h1 className="text-4xl font-bold text-gray-900">
                DATA INCOME
              </h1>

              <p className="text-gray-500 mt-3">
                Monitoring income dan
                sinkronisasi pembayaran
                realtime
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {/* UPLOAD */}
              <label className="bg-black hover:bg-gray-800 transition-all text-white px-6 py-4 rounded-2xl cursor-pointer font-semibold shadow-sm">
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

              {/* SINKRON */}
              <button
                onClick={
                  sinkronkanIncome
                }
                className="bg-green-600 hover:bg-green-700 transition-all text-white px-6 py-4 rounded-2xl font-semibold shadow-sm"
              >
                Sinkronkan Income
              </button>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 font-medium">
            Sedang memproses
            data...
          </div>
        )}

        {/* TOTAL */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {/* TOTAL PEMBAYARAN */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              💳
            </div>

            <p className="text-sm text-gray-500 mb-2">
              Total Jumlah
              Penyelesaian
              Pembayaran
            </p>

            <h2 className="text-3xl font-bold text-gray-900">
              {formatRupiah(
                totalPembayaran
              )}
            </h2>
          </div>

          {/* TOTAL PENDAPATAN */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
              📈
            </div>

            <p className="text-sm text-gray-500 mb-2">
              Total Pendapatan
            </p>

            <h2 className="text-3xl font-bold text-green-700">
              {formatRupiah(
                totalPendapatan
              )}
            </h2>
          </div>

          {/* TOTAL TERBAYAR */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center mb-4">
              🏆
            </div>

            <p className="text-sm text-gray-500 mb-2">
              Total Uang Sudah
              Terbayar dari Semua
              Report
            </p>

            <h2 className="text-3xl font-bold text-yellow-600">
              {formatRupiah(
                totalTerbayarReport
              )}
            </h2>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          {/* HEADER TABLE */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">
              Data Income
            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Daftar seluruh data
              income terbaru
            </p>
          </div>

          {/* TABLE CONTENT */}
          <div className="overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    No
                  </th>

                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    ID Pesanan /
                    Penyesuaian
                  </th>

                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    Jumlah
                    Penyelesaian
                    Pembayaran
                  </th>

                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    Total Pendapatan
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center p-12 text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : data.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center p-12 text-gray-500"
                    >
                      Belum ada data
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
                        className="border-t border-gray-100 hover:bg-gray-50 transition-all"
                      >
                        <td className="p-5 font-medium text-gray-700">
                          {index +
                            1}
                        </td>

                        <td className="p-5 font-semibold text-gray-900">
                          {
                            item.order_id
                          }
                        </td>

                        <td className="p-5">
                          <span className="font-semibold text-blue-700">
                            {
                              item.jumlah_pembayaran
                            }
                          </span>
                        </td>

                        <td className="p-5">
                          <span className="font-semibold text-green-700">
                            {
                              item.total_pendapatan
                            }
                          </span>
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