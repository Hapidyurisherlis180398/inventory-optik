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

  const [
    totalTerbayar,
    setTotalTerbayar,
  ] = useState(0)

  async function getData() {
    setLoading(true)

    const { data, error } =
      await supabase
        .from('live_reports_a_usup')
        .select('*')
        .order('id', {
          ascending: true,
        })

    if (!error && data) {
      setData(data)

      // TOTAL TERBAYAR
      const totalBayarSemua =
        data.reduce(
          (sum, item) => {
            if (
              item.status &&
              item.status.includes(
                'TERBAYAR'
              )
            ) {
              const angka =
                Number(
                  item.total_pendapatan
                    ?.toString()
                    .replace(
                      /[^\d-]/g,
                      ''
                    )
                )

              return (
                sum +
                (angka || 0)
              )
            }

            return sum
          },
          0
        )

      setTotalTerbayar(
        totalBayarSemua
      )

      // REKAP BERDASARKAN WAKTU
      const group: any = {}

      data.forEach((item) => {
        if (
          item.status &&
          item.status.includes(
            'TERBAYAR'
          )
        ) {
          const waktu =
            item.status

          const angka =
            Number(
              item.total_pendapatan
                ?.toString()
                .replace(
                  /[^\d-]/g,
                  ''
                )
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
          (
            [
              waktu,
              value,
            ]: any
          ) => ({
            waktu,
            total:
              value.total,
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

  // EXPORT BELUM TERBAYAR
  function exportBelumTerbayar() {
    const belumTerbayar =
      data.filter(
        (item) =>
          !item.status ||
          !item.status.includes(
            'TERBAYAR'
          )
      )

    if (
      belumTerbayar.length === 0
    ) {
      alert(
        'Tidak ada data belum terbayar'
      )

      return
    }

    const exportData =
      belumTerbayar.map(
        (item, index) => ({
          NO: index + 1,

          'ID Pesanan':
            item.order_id,

          TOKO: item.toko,

          'Total Pendapatan':
            item.total_pendapatan,

          STATUS:
            item.status ||
            'BELUM DIBAYAR',
        })
      )

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportData
      )

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Belum Dibayar'
    )

    // NAMA FILE DENGAN TANGGAL
    const tanggal =
      new Date()
        .toLocaleDateString(
          'id-ID'
        )
        .replace(/\//g, '-')

    const namaFile = `A-USUP-BELUM-DIBAYAR-${tanggal}.xlsx`

    XLSX.writeFile(
      workbook,
      namaFile
    )
  }

  // UPLOAD EXCEL
  async function uploadExcel(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    // PIN SECURITY
    const pin = prompt(
      'Masukkan PIN Upload'
    )

    if (pin !== '345') {
      alert('PIN salah')

      event.target.value = ''

      return
    }

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
          'live_reports_a_usup'
        )
        .select('id')
        .eq(
          'order_id',
          orderId
        )
        .maybeSingle()

      // SUDAH ADA
      if (existing) {
        continue
      }

      // INSERT DATA
      await supabase
        .from(
          'live_reports_a_usup'
        )
        .insert([
          {
            nomor:
              item[
                'NO'
              ]?.toString() ||
              '',

            order_id:
              orderId,

            toko:
              item[
                'TOKO'
              ]?.toString() ||
              '',

            total_pendapatan:
              item[
                'Total Pendapatan'
              ]?.toString() ||
              '',

            status:
              item[
                'STATUS'
              ]?.toString() ||
              '',
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
          'live_reports_a_usup'
        )
        .select('*')
        .eq('status', waktu)

    if (
      !rows ||
      rows.length === 0
    ) {
      alert(
        'Data tidak ditemukan'
      )

      return
    }

    await supabase
      .from(
        'live_reports_a_usup'
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
                HASIL LIVE A USUP
              </h1>

              <p className="text-gray-500 mt-3 text-sm md:text-base">
                Monitoring realtime hasil live dan pembayaran pesanan
              </p>
            </div>

            {/* BUTTON */}
            <div className="flex flex-wrap gap-3">

              {/* EXPORT */}
              <button
                onClick={
                  exportBelumTerbayar
                }
                className="bg-red-600 hover:bg-red-700 transition-all text-white px-6 py-4 rounded-2xl font-semibold shadow-sm"
              >
                Export Belum Dibayar
              </button>

              {/* UPLOAD */}
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
        </div>

        {/* CARD SUMMARY */}
        <div className="grid md:grid-cols-4 gap-5 mb-8">

          {/* TOTAL LIVE */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-3">
              Total Hasil Live
            </p>

            <h2 className="text-4xl font-bold text-gray-900">
              {data.length}
            </h2>

            <p className="text-sm text-gray-400 mt-2">
              Total seluruh pesanan live
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
              Pesanan sudah lunas
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
              Menunggu pembayaran
            </p>
          </div>

          {/* TOTAL UANG */}
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-blue-700 mb-3">
              Total Uang Terbayar
            </p>

            <h2 className="text-2xl font-bold text-blue-700">
              {formatRupiah(
                totalTerbayar
              )}
            </h2>

            <p className="text-sm text-blue-600 mt-2">
              Akumulasi pembayaran
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}