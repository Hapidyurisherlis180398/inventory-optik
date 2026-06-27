'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trash2,
  Plus,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'

export default function FinancePage() {
  const [loading, setLoading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [data, setData] = useState<any[]>([])

  const [type, setType] = useState(
    'pengeluaran'
  )

  const [title, setTitle] =
    useState('')

  const [amount, setAmount] =
    useState('')

  const [note, setNote] =
    useState('')

  const [filter, setFilter] =
    useState('today')

  const [totalIncome, setTotalIncome] =
    useState(0)

  const [
    totalExpense,
    setTotalExpense,
  ] = useState(0)

  const [balance, setBalance] =
    useState(0)

  useEffect(() => {
    getData()
  }, [filter])

  function formatRupiah(
    value: number
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
      }
    ).format(value)
  }

  function formatInputRupiah(
    value: string
  ) {
    const number =
      value.replace(/\D/g, '')

    return new Intl.NumberFormat(
      'id-ID'
    ).format(Number(number))
  }

  function getDateFilter() {
    const now = new Date()

    let startDate = new Date()

    if (filter === 'today') {
      startDate.setHours(
        0,
        0,
        0,
        0
      )
    }

    if (filter === 'yesterday') {
      startDate.setDate(
        now.getDate() - 1
      )

      startDate.setHours(
        0,
        0,
        0,
        0
      )

      now.setDate(now.getDate() - 1)

      now.setHours(
        23,
        59,
        59,
        999
      )

      return {
        start:
          startDate.toISOString(),
        end: now.toISOString(),
      }
    }

    if (filter === '7days') {
      startDate.setDate(
        now.getDate() - 7
      )
    }

    if (filter === '30days') {
      startDate.setDate(
        now.getDate() - 30
      )
    }

    return {
      start:
        startDate.toISOString(),
      end: new Date().toISOString(),
    }
  }

  async function getData() {
    setLoading(true)

    const dateFilter =
      getDateFilter()

    const { data, error } =
      await supabase
        .from('finance_logs')
        .select('*')
        .gte(
          'created_at',
          dateFilter.start
        )
        .lte(
          'created_at',
          dateFilter.end
        )
        .order('created_at', {
          ascending: false,
        })

    if (!error && data) {
      setData(data)

      const income =
        data
          .filter(
            (item) =>
              item.type ===
              'pemasukan'
          )
          .reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.amount || 0
              ),
            0
          )

      const expense =
        data
          .filter(
            (item) =>
              item.type ===
              'pengeluaran'
          )
          .reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.amount || 0
              ),
            0
          )

      setTotalIncome(income)

      setTotalExpense(expense)

      setBalance(
        income - expense
      )
    }

    setLoading(false)
  }

  async function saveData() {
    if (!title || !amount) {
      alert(
        'Lengkapi data terlebih dahulu'
      )

      return
    }

    setSaving(true)

    const cleanAmount =
      Number(
        amount.replace(/\D/g, '')
      )

    const { error } =
      await supabase
        .from('finance_logs')
        .insert([
          {
            type,
            title,
            amount: cleanAmount,
            note,
          },
        ])

    setSaving(false)

    if (error) {
      alert(
        '❌ Gagal menyimpan data'
      )

      return
    }

    alert(
      '✅ Data berhasil disimpan'
    )

    setTitle('')
    setAmount('')
    setNote('')

    getData()
  }

  async function deleteData(
    id: string
  ) {
    const password = prompt(
      'Masukkan password untuk menghapus data'
    )

    if (password !== '123') {
      alert('❌ Password salah')
      return
    }

    const confirmDelete =
      confirm(
        'Yakin ingin menghapus data ini?'
      )

    if (!confirmDelete) return

    const { error } =
      await supabase
        .from('finance_logs')
        .delete()
        .eq('id', id)

    if (error) {
      alert(
        '❌ Gagal menghapus data'
      )

      return
    }

    alert(
      '✅ Data berhasil dihapus'
    )

    getData()
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center">
                <Wallet size={28} />
              </div>

              <div>
                <h1 className="text-4xl font-black text-black">
                  Finance Tracker
                </h1>

                <p className="text-gray-500 mt-1">
                  Monitoring keuangan
                  pribadi realtime
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Transaksi
            </p>

            <h2 className="text-3xl font-black text-black mt-1">
              {data.length}
            </h2>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-black text-white p-3 rounded-2xl">
              <Plus size={22} />
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                Tambah Transaksi
              </h2>

              <p className="text-gray-500 text-sm">
                Catat pemasukan dan
                pengeluaran harian
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Jenis Transaksi
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value
                  )
                }
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="pengeluaran">
                  Pengeluaran
                </option>

                <option value="pemasukan">
                  Pemasukan
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Nama Transaksi
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                placeholder="Contoh : Beli makan"
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Jumlah Uang
              </label>

              <input
                type="text"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    formatInputRupiah(
                      e.target.value
                    )
                  )
                }
                placeholder="Contoh : 50.000"
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Catatan
              </label>

              <input
                type="text"
                value={note}
                onChange={(e) =>
                  setNote(
                    e.target.value
                  )
                }
                placeholder="Opsional"
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          <button
            onClick={saveData}
            disabled={saving}
            className="mt-6 bg-black hover:bg-gray-800 text-white px-7 py-4 rounded-2xl font-bold transition-all shadow-lg"
          >
            {saving
              ? 'Menyimpan...'
              : 'Simpan Data'}
          </button>
        </div>

        {/* FILTER */}
        <div className="flex gap-3 flex-wrap mb-8">
          {[
            {
              label: 'Hari Ini',
              value: 'today',
            },
            {
              label: 'Kemarin',
              value: 'yesterday',
            },
            {
              label: '7 Hari',
              value: '7days',
            },
            {
              label: '30 Hari',
              value: '30days',
            },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() =>
                setFilter(item.value)
              }
              className={`px-5 py-3 rounded-2xl font-semibold transition-all ${
                filter === item.value
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-white border border-gray-200 text-black hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* PEMASUKAN */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-7 text-white shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-green-100 text-sm">
                  Total Pemasukan
                </p>

                <h2 className="text-3xl font-black mt-2">
                  {formatRupiah(
                    totalIncome
                  )}
                </h2>
              </div>

              <div className="bg-white/20 p-4 rounded-2xl">
                <TrendingUp
                  size={30}
                />
              </div>
            </div>
          </div>

          {/* PENGELUARAN */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-7 text-white shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-red-100 text-sm">
                  Total Pengeluaran
                </p>

                <h2 className="text-3xl font-black mt-2">
                  {formatRupiah(
                    totalExpense
                  )}
                </h2>
              </div>

              <div className="bg-white/20 p-4 rounded-2xl">
                <TrendingDown
                  size={30}
                />
              </div>
            </div>
          </div>

          {/* SALDO */}
          <div className="bg-gradient-to-br from-black to-gray-800 rounded-3xl p-7 text-white shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-gray-300 text-sm">
                  Saldo Saat Ini
                </p>

                <h2 className="text-3xl font-black mt-2">
                  {formatRupiah(
                    balance
                  )}
                </h2>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl">
                <Wallet size={30} />
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Riwayat Transaksi
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Semua data keuangan
                tersimpan otomatis
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-2xl">
              <Calendar size={18} />

              <span className="text-sm font-medium">
                {new Date().toLocaleDateString(
                  'id-ID'
                )}
              </span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-5 text-left">
                    Jenis
                  </th>

                  <th className="p-5 text-left">
                    Transaksi
                  </th>

                  <th className="p-5 text-left">
                    Jumlah
                  </th>

                  <th className="p-5 text-left">
                    Catatan
                  </th>

                  <th className="p-5 text-left">
                    Tanggal
                  </th>

                  <th className="p-5 text-center">
                    Aksi
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
                ) : data.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center p-10"
                    >
                      Belum ada data
                    </td>
                  </tr>
                ) : (
                  data.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-t hover:bg-gray-50 transition-all"
                      >
                        <td className="p-5">
                          <span
                            className={`px-4 py-2 rounded-full text-xs font-bold ${
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

                        <td className="p-5 font-bold text-gray-900">
                          {
                            item.title
                          }
                        </td>

                        <td className="p-5 font-black text-lg">
                          {formatRupiah(
                            Number(
                              item.amount
                            )
                          )}
                        </td>

                        <td className="p-5 text-gray-500">
                          {item.note ||
                            '-'}
                        </td>

                        <td className="p-5 text-sm text-gray-500">
                          {new Date(
                            item.created_at
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </td>

                        <td className="p-5 text-center">
                          <button
                            onClick={() =>
                              deleteData(
                                item.id
                              )
                            }
                            className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl transition-all"
                          >
                            <Trash2
                              size={18}
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