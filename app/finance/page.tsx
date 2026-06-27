'use client'

import {
  useEffect,
  useState,
} from 'react'

import * as XLSX from 'xlsx'

import jsPDF from 'jspdf'

import autoTable from 'jspdf-autotable'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Plus,
  Download,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'

export default function FinancePage() {
  const [data, setData] =
    useState<any[]>([])

  const [loading, setLoading] =
    useState(false)

  const [type, setType] =
    useState('pengeluaran')

  const [category, setCategory] =
    useState('')

  const [title, setTitle] =
    useState('')

  const [amount, setAmount] =
    useState('')

  const [note, setNote] =
    useState('')

  const [
    totalIncome,
    setTotalIncome,
  ] = useState(0)

  const [
    totalExpense,
    setTotalExpense,
  ] = useState(0)

  const [balance, setBalance] =
    useState(0)

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

      const income = data
        .filter(
          (item) =>
            item.type ===
            'pendapatan'
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        )

      const expense = data
        .filter(
          (item) =>
            item.type ===
            'pengeluaran'
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        )

      setTotalIncome(income)

      setTotalExpense(expense)

      setBalance(income - expense)
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

  async function tambahData() {
    if (!title || !amount) {
      alert(
        'Lengkapi data terlebih dahulu'
      )

      return
    }

    setLoading(true)

    await supabase
      .from('finance_logs')
      .insert([
        {
          type,
          category,
          title,
          amount: Number(amount),
          note,
        },
      ])

    setTitle('')
    setCategory('')
    setAmount('')
    setNote('')

    getData()
  }

  async function hapusData(
    id: string
  ) {
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

  function exportExcel() {
    const worksheet =
      XLSX.utils.json_to_sheet(data)

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Finance'
    )

    XLSX.writeFile(
      workbook,
      `Finance-${
        new Date().toISOString()
      }.xlsx`
    )
  }

  function exportPDF() {
    const doc = new jsPDF()

    doc.text(
      'Laporan Finance',
      14,
      15
    )

    autoTable(doc, {
      head: [
        [
          'Tanggal',
          'Type',
          'Kategori',
          'Transaksi',
          'Jumlah',
        ],
      ],

      body: data.map((item) => [
        new Date(
          item.created_at
        ).toLocaleDateString(
          'id-ID'
        ),

        item.type,

        item.category,

        item.title,

        formatRupiah(
          item.amount
        ),
      ]),
    })

    doc.save(
      `Finance-${
        new Date().toISOString()
      }.pdf`
    )
  }

  const chartData = [
    {
      name: 'Pendapatan',
      value: totalIncome,
    },

    {
      name: 'Pengeluaran',
      value: totalExpense,
    },
  ]

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-4xl font-black text-gray-900">
              Finance Dashboard
            </h1>

            <p className="text-gray-500 mt-2">
              Monitoring keuangan pribadi
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">

            <button
              onClick={exportExcel}
              className="bg-green-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2"
            >
              <Download size={18} />

              Export Excel
            </button>

            <button
              onClick={exportPDF}
              className="bg-red-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2"
            >
              <Download size={18} />

              Export PDF
            </button>

          </div>
        </div>

        {/* CARD */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">

          <div className="bg-black text-white rounded-3xl p-6">
            <Wallet size={35} />

            <p className="mt-5 text-gray-300">
              Total Saldo
            </p>

            <h2 className="text-4xl font-black mt-2">
              {formatRupiah(balance)}
            </h2>
          </div>

          <div className="bg-green-50 rounded-3xl p-6 border border-green-100">
            <TrendingUp
              className="text-green-600"
              size={35}
            />

            <p className="mt-5 text-green-700">
              Pendapatan
            </p>

            <h2 className="text-4xl font-black text-green-700 mt-2">
              {formatRupiah(
                totalIncome
              )}
            </h2>
          </div>

          <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
            <TrendingDown
              className="text-red-600"
              size={35}
            />

            <p className="mt-5 text-red-700">
              Pengeluaran
            </p>

            <h2 className="text-4xl font-black text-red-700 mt-2">
              {formatRupiah(
                totalExpense
              )}
            </h2>
          </div>

        </div>

        {/* CHART */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">

          {/* PIE */}
          <div className="bg-white border rounded-3xl p-6">

            <h2 className="text-2xl font-bold mb-6">
              Statistik Keuangan
            </h2>

            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>

                  <Pie
                    data={chartData}
                    dataKey="value"
                    outerRadius={100}
                    label
                  >

                    <Cell fill="#16a34a" />

                    <Cell fill="#dc2626" />

                  </Pie>

                  <Tooltip />

                </PieChart>
              </ResponsiveContainer>

            </div>
          </div>

          {/* BAR */}
          <div className="bg-white border rounded-3xl p-6">

            <h2 className="text-2xl font-bold mb-6">
              Grafik Pendapatan
            </h2>

            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={chartData}
                >

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Bar dataKey="value" />

                </BarChart>

              </ResponsiveContainer>

            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white border rounded-3xl p-6 mb-8">

          <h2 className="text-2xl font-bold mb-6">
            Tambah Data
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

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

              <option value="pendapatan">
                Pendapatan
              </option>
            </select>

            <input
              type="text"
              placeholder="Kategori"
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
              className="border rounded-2xl p-4"
            />

            <input
              type="text"
              placeholder="Nama transaksi"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              className="border rounded-2xl p-4"
            />

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

          <textarea
            placeholder="Catatan"
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value
              )
            }
            className="border rounded-2xl p-4 mt-4 w-full h-28"
          />

          <button
            onClick={tambahData}
            className="mt-5 bg-black text-white px-6 py-4 rounded-2xl font-semibold flex items-center gap-2"
          >
            <Plus size={20} />

            Simpan Data
          </button>

        </div>

        {/* TABLE */}
        <div className="bg-white border rounded-3xl overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">
              Riwayat Transaksi
            </h2>
          </div>

          <div className="overflow-auto">

            <table className="w-full min-w-[900px]">

              <thead className="bg-black text-white">

                <tr>

                  <th className="p-4 text-left">
                    Tanggal
                  </th>

                  <th className="p-4 text-left">
                    Type
                  </th>

                  <th className="p-4 text-left">
                    Kategori
                  </th>

                  <th className="p-4 text-left">
                    Transaksi
                  </th>

                  <th className="p-4 text-left">
                    Jumlah
                  </th>

                  <th className="p-4 text-left">
                    Aksi
                  </th>

                </tr>
              </thead>

              <tbody>

                {data.map((item) => (

                  <tr
                    key={item.id}
                    className="border-t hover:bg-gray-50"
                  >

                    <td className="p-4">
                      {new Date(
                        item.created_at
                      ).toLocaleString(
                        'id-ID'
                      )}
                    </td>

                    <td className="p-4">

                      <span
                        className={`px-3 py-2 rounded-full text-xs font-bold ${
                          item.type ===
                          'pendapatan'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.type}
                      </span>

                    </td>

                    <td className="p-4">
                      {item.category}
                    </td>

                    <td className="p-4 font-semibold">
                      {item.title}
                    </td>

                    <td
                      className={`p-4 font-bold ${
                        item.type ===
                        'pendapatan'
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}
                    >
                      {formatRupiah(
                        item.amount
                      )}
                    </td>

                    <td className="p-4">

                      <button
                        onClick={() =>
                          hapusData(
                            item.id
                          )
                        }
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm"
                      >
                        Hapus
                      </button>

                    </td>

                  </tr>

                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}