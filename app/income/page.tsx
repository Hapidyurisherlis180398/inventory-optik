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

  // TOTAL UANG TERBAYAR
  const [
    totalUangTerbayar,
    setTotalUangTerbayar,
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
    // TOTAL UANG TERBAYAR
    // DARI SEMUA LIVE REPORT
    // =========================

    let totalTerbayar = 0

    // A USUP
    const { data: usup } =
      await supabase
        .from(
          'live_reports_a_usup'
        )
        .select(
          'total_pendapatan,status'
        )

    // A AGIL
    const { data: agil } =
      await supabase
        .from(
          'live_reports_a_agil'
        )
        .select(
          'total_pendapatan,status'
        )

    // A CAPE
    const { data: cape } =
      await supabase
        .from(
          'live_reports_a_cape'
        )
        .select(
          'total_pendapatan,status'
        )

    // GABUNG SEMUA DATA
    const semuaData = [
      ...(usup || []),
      ...(agil || []),
      ...(cape || []),
    ]

    // HITUNG TOTAL TERBAYAR
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

    setTotalUangTerbayar(
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

    // TANGGAL SEKARANG
    const sekarang = new Date()

    const waktuIndonesia =
      sekarang.toLocaleString(
        'id-ID',
        {
          dateStyle: 'full',
          timeStyle: 'medium',
        }
      )

    // AMBIL DATA INCOME
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
        .eq('order_id', orderId)

      // UPDATE A AGIL
      await supabase
        .from(
          'live_reports_a_agil'
        )
        .update(updateData)
        .eq('order_id', orderId)

      // UPDATE A CAPE
      await supabase
        .from(
          'live_reports_a_cape'
        )
        .update(updateData)
        .eq('order_id', orderId)
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
        <div className="bg-white border rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-green-600 mb-2">
                INCOME DASHBOARD
              </p>

              <h1 className="text-4xl font-bold text-gray-900">
                DATA INCOME
              </h1>

              <p className="text-gray-500 mt-3">
                Monitoring income
                realtime dan laporan
                pembayaran live
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* UPLOAD */}
              <label className="bg-black text-white px-6 py-4 rounded-2xl cursor-pointer hover:bg-gray-800 transition-all font-semibold shadow-sm">
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
                className="bg-green-600 text-white px-6 py-4 rounded-2xl hover:bg-green-700 transition-all font-semibold shadow-sm"
              >
                Sinkronkan Income
              </button>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 font-semibold p-4 rounded-2xl">
            Sedang memproses
            data...
          </div>
        )}

        {/* TOTAL */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {/* TOTAL PEMBAYARAN */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-3">
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
          <div className="bg-white border rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-3">
              Total Pendapatan
            </p>

            <h2 className="text-3xl font-bold text-green-700">
              {formatRupiah(
                totalPendapatan
              )}
            </h2>
          </div>

          {/* TOTAL TERBAYAR */}
          <div className="bg-green-50 border border-green-200 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-green-700 mb-3">
              Total Uang
              Terbayar Dari Semua
              Report
            </p>

            <h2 className="text-3xl font-bold text-green-700">
              {formatRupiah(
                totalUangTerbayar
              )}
            </h2>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Data Income
            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Seluruh data income
              terbaru
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm min-w-[900px]">
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
                    Total Pendapatan
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
                        className="hover:bg-gray-50 transition-all"
                      >
                        <td className="border p-4 text-center font-medium">
                          {index +
                            1}
                        </td>

                        <td className="border p-4 font-semibold text-gray-900">
                          {
                            item.order_id
                          }
                        </td>

                        <td
                          className={`border p-4 font-semibold ${
                            item.jumlah_pembayaran
                              ?.toString()
                              .includes(
                                '-'
                              )
                              ? 'text-red-600'
                              : 'text-green-700'
                          }`}
                        >
                          {
                            item.jumlah_pembayaran
                          }
                        </td>

                        <td
                          className={`border p-4 font-semibold ${
                            item.total_pendapatan
                              ?.toString()
                              .includes(
                                '-'
                              )
                              ? 'text-red-600'
                              : 'text-green-700'
                          }`}
                        >
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