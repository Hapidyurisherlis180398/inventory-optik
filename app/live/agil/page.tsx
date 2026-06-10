'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import * as XLSX from 'xlsx'

export default function AUsupPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] =
    useState(false)

  const [
    laporanWaktu,
    setLaporanWaktu,
  ] = useState<any[]>([])

  async function getData() {
    setLoading(true)

    const { data, error } =
      await supabase
        .from('live_reports_a_agil')
        .select('*')
        .order('id', {
          ascending: true,
        })

    if (!error && data) {
      setData(data)

      // REKAP BERDASARKAN WAKTU
      const group: any = {}

      data.forEach((item) => {
        if (
          item.status &&
          item.status.includes(
            'TERBAYAR'
          )
        ) {
          const waktu = item.status

          const angka = Number(
            item.total_pendapatan
              ?.toString()
              .replace(/[^\d]/g, '')
          )

          if (!group[waktu]) {
            group[waktu] = {
              total: 0,
              jumlahPesanan: 0,
            }
          }

          group[waktu].total +=
            angka || 0

          group[waktu]
            .jumlahPesanan += 1
        }
      })

      const hasilGroup =
        Object.entries(group).map(
          ([waktu, value]: any) => ({
            waktu,
            total: value.total,
            jumlahPesanan:
              value.jumlahPesanan,
          })
        )

      setLaporanWaktu(
        hasilGroup.reverse()
      )
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
    const file =
      event.target.files?.[0]

    if (!file) return

    setLoading(true)

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

    for (const item of jsonData) {
      const orderId =
        item[
          'ID Pesanan/Penyesuaian'
        ]?.toString()

      if (!orderId) continue

      // CEK DUPLICATE
      const {
        data: existing,
      } = await supabase
        .from(
          'live_reports_a_agil'
        )
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle()

      if (existing) {
        continue
      }

      // INSERT DATA
      await supabase
        .from(
          'live_reports_a_agil'
        )
        .insert([
          {
            nomor:
              item['NO']?.toString() ||
              '',

            order_id: orderId,

            toko:
              item[
                'TOKO'
              ]?.toString() || '',

            total_pendapatan:
              item[
                'Total Pendapatan'
              ]?.toString() || '',

            status:
              item[
                'STATUS'
              ]?.toString() || '',
          },
        ])
    }

    alert(
      'Upload selesai tanpa duplicate'
    )

    getData()

    setLoading(false)
  }

  // LUNASI BATCH
  async function lunasiBatch(
    waktu: string
  ) {
    const password = prompt(
      'Masukkan Password'
    )

    if (password !== '123') {
      alert('Password salah')
      return
    }

    const { data: rows } =
      await supabase
        .from(
          'live_reports_a_agil'
        )
        .select('*')
        .eq('status', waktu)

    if (
      !rows ||
      rows.length === 0
    ) {
      alert('Data tidak ditemukan')
      return
    }

    await supabase
      .from(
        'live_reports_a_agil'
      )
      .delete()
      .eq('status', waktu)

    alert(
      'Batch berhasil dilunasi'
    )

    getData()
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-green-600 mb-2">
                LIVE REPORT DASHBOARD
              </p>

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                HASIL LIVE A AGIL
              </h1>

              <p className="text-gray-500 mt-3 text-sm md:text-base">
                Monitoring realtime
                hasil live dan
                pembayaran pesanan
              </p>
            </div>

            {/* BUTTON UPLOAD */}
            <label className="bg-black hover:bg-gray-800 transition-all text-white px-6 py-4 rounded-2xl cursor-pointer text-center font-semibold shadow-sm">
              Upload Excel

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={
                  uploadExcel
                }
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* CARD SUMMARY */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {/* TOTAL LIVE */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-3">
              Total Hasil Live
            </p>

            <h2 className="text-4xl font-bold text-gray-900">
              {data.length}
            </h2>

            <p className="text-sm text-gray-400 mt-2">
              Total seluruh
              pesanan live
            </p>
          </div>

          {/* SUDAH DIBAYAR */}
          <div className="bg-green-50 border border-green-100 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-green-700 mb-3">
              Sudah Dibayar
            </p>

            <h2 className="text-4xl font-bold text-green-700">
              {
                data.filter(
                  (item) =>
                    item.status &&
                    item.status.includes(
                      'TERBAYAR'
                    )
                ).length
              }
            </h2>

            <p className="text-sm text-green-600 mt-2">
              Pesanan sudah
              lunas
            </p>
          </div>

          {/* BELUM DIBAYAR */}
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-red-700 mb-3">
              Belum Dibayar
            </p>

            <h2 className="text-4xl font-bold text-red-700">
              {
                data.filter(
                  (item) =>
                    !item.status ||
                    !item.status.includes(
                      'TERBAYAR'
                    )
                ).length
              }
            </h2>

            <p className="text-sm text-red-600 mt-2">
              Menunggu
              pembayaran
            </p>
          </div>
        </div>

        {/* LAPORAN */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              Riwayat Pembayaran
            </h2>
          </div>

          <div className="grid gap-4">
            {laporanWaktu.length ===
            0 ? (
              <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center shadow-sm">
                <p className="text-gray-500">
                  Belum ada
                  laporan
                  pembayaran
                </p>
              </div>
            ) : (
              laporanWaktu.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* KIRI */}
                      <div>
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-3 py-2 rounded-full mb-4">
                          ● TERBAYAR
                        </div>

                        <p className="text-sm text-gray-500 mb-3">
                          {
                            item.waktu
                          }
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900">
                          {formatRupiah(
                            Number(
                              item.total
                            )
                          )}
                        </h2>

                        <p className="mt-3 text-sm font-medium text-gray-600">
                          {
                            item.jumlahPesanan
                          }{' '}
                          Pesanan
                        </p>
                      </div>

                      {/* BUTTON */}
                      <button
                        onClick={() =>
                          lunasiBatch(
                            item.waktu
                          )
                        }
                        className="bg-black hover:bg-gray-800 transition-all text-white px-7 py-4 rounded-2xl font-semibold shadow-sm"
                      >
                        Lunasi
                      </button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">
              Data Pesanan
            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Daftar seluruh
              hasil live
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    No
                  </th>

                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    ID Pesanan
                  </th>

                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    Toko
                  </th>

                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    Total Pendapatan
                  </th>

                  <th className="p-5 text-left text-xs font-bold text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center p-12 text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : data.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center p-12 text-gray-500"
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
                        className="border-t border-gray-100 hover:bg-gray-50 transition-all"
                      >
                        <td className="p-5 text-gray-700 font-medium">
                          {index +
                            1}
                        </td>

                        <td className="p-5 font-semibold text-gray-900">
                          {
                            item.order_id
                          }
                        </td>

                        <td className="p-5 text-gray-700">
                          {
                            item.toko
                          }
                        </td>

                        <td className="p-5 font-semibold text-green-700">
                          {
                            item.total_pendapatan
                          }
                        </td>

                        <td className="p-5">
                          {item.status ? (
                            <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-full text-xs font-semibold">
                              ●{' '}
                              {
                                item.status
                              }
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-full text-xs font-semibold">
                              ● BELUM
                              DIBAYAR
                            </span>
                          )}
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