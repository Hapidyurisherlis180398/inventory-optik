'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Trash2,
  Wallet,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'

export default function FinancePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] =
    useState(false)

  const [type, setType] = useState(
    'pengeluaran'
  )

  const [title, setTitle] =
    useState('')

  const [amount, setAmount] =
    useState('')

  const [note, setNote] = useState('')

  const [filter, setFilter] =
    useState('today')

  async function getData() {
    setLoading(true)

    const { data, error } =
      await supabase
        .from('finance_logs')
        .select('*')
        .order('created_at', {
          ascending: false,
        })

    if (!error && data) {
      setData(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

  async function addData() {
    if (!title || !amount) {
      alert('Lengkapi data')
      return
    }

    setLoading(true)

    const { error } =
      await supabase
        .from('finance_logs')
        .insert([
          {
            type,
            title,
            amount: Number(amount),
            note,
          },
        ])

    if (error) {
      console.log(error)

      alert(
        'Gagal menyimpan data'
      )

      setLoading(false)

      return
    }

    setTitle('')
    setAmount('')
    setNote('')

    getData()
  }

  async function deleteData(id: string) {
    const confirmDelete =
      confirm(
        'Yakin ingin menghapus data?'
      )

    if (!confirmDelete) return

    await supabase
      .from('finance_logs')
      .delete()
      .eq('id', id)

    getData()
  }

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

  function isToday(date: string) {
    const today = new Date()

    const d = new Date(date)

    return (
      d.getDate() ===
        today.getDate() &&
      d.getMonth() ===
        today.getMonth() &&
      d.getFullYear() ===
        today.getFullYear()
    )
  }

  function isYesterday(date: string) {
    const yesterday = new Date()

    yesterday.setDate(
      yesterday.getDate() - 1
    )

    const d = new Date(date)

    return (
      d.getDate() ===
        yesterday.getDate() &&
      d.getMonth() ===
        yesterday.getMonth() &&
      d.getFullYear() ===
        yesterday.getFullYear()
    )
  }

  const filteredData = useMemo(() => {
    const now = new Date()

    return data.filter((item) => {
      const itemDate = new Date(
        item.created_at
      )

      if (filter === 'today') {
        return isToday(
          item.created_at
        )
      }

      if (filter === 'yesterday') {
        return isYesterday(
          item.created_at
        )
      }

      if (filter === '7days') {
        const last7 =
          new Date()

        last7.setDate(
          now.getDate() - 7
        )

        return itemDate >= last7
      }

      if (filter === '1month') {
        const lastMonth =
          new Date()

        lastMonth.setMonth(
          now.getMonth() - 1
        )

        return (
          itemDate >= lastMonth
        )
      }

      return true
    })
  }, [data, filter])

  const totalPemasukan =
    filteredData
      .filter(
        (item) =>
          item.type ===
          'pemasukan'
      )
      .reduce(
        (
          sum,
          item
        ) => sum + item.amount,
        0
      )

  const totalPengeluaran =
    filteredData
      .filter(
        (item) =>
          item.type ===
          'pengeluaran'
      )
      .reduce(
        (
          sum,
          item
        ) => sum + item.amount,
        0
      )

  const saldo =
    totalPemasukan -
    totalPengeluaran

  // REKAP BULANAN
  const monthlyData =
    useMemo(() => {
      const grouped: any = {}

      data.forEach((item) => {
        const date = new Date(
          item.created_at
        )

        const month =
          date.toLocaleString(
            'id-ID',
            {
              month: 'long',
              year: 'numeric',
            }
          )

        if (!grouped[month]) {
          grouped[month] = {
            pemasukan: 0,
            pengeluaran: 0,
          }
        }

        if (
          item.type ===
          'pemasukan'
        ) {
          grouped[
            month
          ].pemasukan +=
            item.amount
        }

        if (
          item.type ===
          'pengeluaran'
        ) {
          grouped[
            month
          ].pengeluaran +=
            item.amount
        }
      })

      return Object.entries(
        grouped
      ).map(
        ([month, value]: any) => ({
          month,
          pemasukan:
            value.pemasukan,
          pengeluaran:
            value.pengeluaran,
        })
      )
    }, [data])

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-black to-gray-800 rounded-3xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <Wallet
                size={40}
              />

              <div>
                <h1 className="text-4xl font-bold">
                  Finance
                  Tracker
                </h1>

                <p className="text-gray-300 mt-2">
                  Pembukuan
                  pribadi
                  harian
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold mb-6">
            Tambah Data
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value
                )
              }
              className="border rounded-2xl p-4"
            >
              <option value="pengeluaran">
                Pengeluaran
              </option>

              <option value="pemasukan">
                Pemasukan
              </option>
            </select>

            <input
              type="number"
              placeholder="Jumlah uang"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              className="border rounded-2xl p-4"
            />
          </div>

          <input
            type="text"
            placeholder="Contoh: beli makan"
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            className="border rounded-2xl p-4 w-full mb-4"
          />

          <textarea
            placeholder="Catatan tambahan"
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value
              )
            }
            className="border rounded-2xl p-4 w-full mb-4"
            rows={3}
          />

          <button
            onClick={addData}
            className="bg-black hover:bg-gray-800 text-white px-6 py-4 rounded-2xl font-semibold transition-all"
          >
            Simpan Data
          </button>
        </div>

        {/* FILTER */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            {
              label:
                'Hari Ini',
              value: 'today',
            },
            {
              label:
                'Kemarin',
              value:
                'yesterday',
            },
            {
              label:
                '7 Hari',
              value: '7days',
            },
            {
              label:
                '1 Bulan',
              value:
                '1month',
            },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() =>
                setFilter(
                  item.value
                )
              }
              className={`px-5 py-3 rounded-2xl font-semibold transition-all ${
                filter ===
                item.value
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          <div className="bg-green-50 border border-green-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <ArrowUpCircle className="text-green-600" />

              <p className="text-green-700 font-semibold">
                Total
                Pemasukan
              </p>
            </div>

            <h2 className="text-3xl font-bold text-green-700">
              {formatRupiah(
                totalPemasukan
              )}
            </h2>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <ArrowDownCircle className="text-red-600" />

              <p className="text-red-700 font-semibold">
                Total
                Pengeluaran
              </p>
            </div>

            <h2 className="text-3xl font-bold text-red-700">
              {formatRupiah(
                totalPengeluaran
              )}
            </h2>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="text-blue-600" />

              <p className="text-blue-700 font-semibold">
                Saldo
              </p>
            </div>

            <h2 className="text-3xl font-bold text-blue-700">
              {formatRupiah(
                saldo
              )}
            </h2>
          </div>
        </div>

        {/* REKAP BULANAN */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold mb-6">
            Rekap Bulanan
          </h2>

          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-black text-white">
                  <th className="p-4 text-left rounded-l-2xl">
                    Bulan
                  </th>

                  <th className="p-4 text-left">
                    Pemasukan
                  </th>

                  <th className="p-4 text-left rounded-r-2xl">
                    Pengeluaran
                  </th>
                </tr>
              </thead>

              <tbody>
                {monthlyData.map(
                  (
                    item,
                    index
                  ) => (
                    <tr
                      key={index}
                      className="border-b"
                    >
                      <td className="p-4 font-semibold">
                        {
                          item.month
                        }
                      </td>

                      <td className="p-4 text-green-600 font-bold">
                        {formatRupiah(
                          item.pemasukan
                        )}
                      </td>

                      <td className="p-4 text-red-600 font-bold">
                        {formatRupiah(
                          item.pengeluaran
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">
              Riwayat
              Transaksi
            </h2>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-4 text-left">
                    Tanggal
                  </th>

                  <th className="p-4 text-left">
                    Jenis
                  </th>

                  <th className="p-4 text-left">
                    Judul
                  </th>

                  <th className="p-4 text-left">
                    Nominal
                  </th>

                  <th className="p-4 text-left">
                    Catatan
                  </th>

                  <th className="p-4 text-left">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredData.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center"
                    >
                      Belum ada
                      data
                    </td>
                  </tr>
                ) : (
                  filteredData.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />

                            {new Date(
                              item.created_at
                            ).toLocaleString(
                              'id-ID'
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-3 py-2 rounded-full text-xs font-bold ${
                              item.type ===
                              'pemasukan'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {
                              item.type
                            }
                          </span>
                        </td>

                        <td className="p-4 font-semibold">
                          {
                            item.title
                          }
                        </td>

                        <td
                          className={`p-4 font-bold ${
                            item.type ===
                            'pemasukan'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatRupiah(
                            item.amount
                          )}
                        </td>

                        <td className="p-4 text-gray-500">
                          {
                            item.note
                          }
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() =>
                              deleteData(
                                item.id
                              )
                            }
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-3 rounded-xl transition-all"
                          >
                            <Trash2
                              size={
                                18
                              }
                            />
                          </button>
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