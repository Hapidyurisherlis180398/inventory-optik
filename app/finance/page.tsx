'use client'

import {
  useEffect,
  useState,
} from 'react'

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
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black">
            Finance Tracker
          </h1>

          <p className="text-gray-500 mt-2">
            Monitoring pemasukan &
            pengeluaran pribadi
          </p>
        </div>

        {/* FORM */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-8">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Jenis
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value
                  )
                }
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4"
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
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4"
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
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4"
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
                className="w-full mt-2 border border-gray-300 rounded-2xl p-4"
              />
            </div>
          </div>

          <button
            onClick={saveData}
            disabled={saving}
            className="mt-6 bg-black hover:bg-gray-800 text-white px-6 py-4 rounded-2xl font-semibold transition-all"
          >
            {saving
              ? 'Menyimpan...'
              : 'Simpan Data'}
          </button>
        </div>

        {/* FILTER */}
        <div className="flex gap-3 flex-wrap mb-8">
          <button
            onClick={() =>
              setFilter('today')
            }
            className={`px-5 py-3 rounded-2xl font-semibold ${
              filter === 'today'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-black'
            }`}
          >
            Hari Ini
          </button>

          <button
            onClick={() =>
              setFilter(
                'yesterday'
              )
            }
            className={`px-5 py-3 rounded-2xl font-semibold ${
              filter ===
              'yesterday'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-black'
            }`}
          >
            Kemarin
          </button>

          <button
            onClick={() =>
              setFilter('7days')
            }
            className={`px-5 py-3 rounded-2xl font-semibold ${
              filter === '7days'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-black'
            }`}
          >
            7 Hari
          </button>

          <button
            onClick={() =>
              setFilter(
                '30days'
              )
            }
            className={`px-5 py-3 rounded-2xl font-semibold ${
              filter ===
              '30days'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-black'
            }`}
          >
            30 Hari
          </button>
        </div>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          <div className="bg-green-50 border border-green-100 rounded-3xl p-6">
            <p className="text-sm text-green-700 mb-3">
              Total Pemasukan
            </p>

            <h2 className="text-3xl font-bold text-green-700">
              {formatRupiah(
                totalIncome
              )}
            </h2>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-3xl p-6">
            <p className="text-sm text-red-700 mb-3">
              Total Pengeluaran
            </p>

            <h2 className="text-3xl font-bold text-red-700">
              {formatRupiah(
                totalExpense
              )}
            </h2>
          </div>

          <div className="bg-black rounded-3xl p-6">
            <p className="text-sm text-gray-300 mb-3">
              Saldo
            </p>

            <h2 className="text-3xl font-bold text-white">
              {formatRupiah(
                balance
              )}
            </h2>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold">
              Riwayat Transaksi
            </h2>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-4 text-left">
                    Jenis
                  </th>

                  <th className="p-4 text-left">
                    Transaksi
                  </th>

                  <th className="p-4 text-left">
                    Jumlah
                  </th>

                  <th className="p-4 text-left">
                    Catatan
                  </th>

                  <th className="p-4 text-left">
                    Tanggal
                  </th>

                  <th className="p-4 text-center">
                    Tindakan
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
                ) : data.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center"
                    >
                      Belum ada data
                    </td>
                  </tr>
                ) : (
                  data.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="p-4">
                          <span
                            className={`px-3 py-2 rounded-full text-xs font-semibold ${
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

                        <td className="p-4 font-bold">
                          {formatRupiah(
                            Number(
                              item.amount
                            )
                          )}
                        </td>

                        <td className="p-4 text-gray-500">
                          {item.note ||
                            '-'}
                        </td>

                        <td className="p-4 text-sm text-gray-500">
                          {new Date(
                            item.created_at
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <button
                            onClick={() =>
                              deleteData(
                                item.id
                              )
                            }
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl"
                          >
                            Hapus
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