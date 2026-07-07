'use client'

import {
  useEffect,
  useState,
} from 'react'

import QRCode from 'qrcode'

import { supabase } from '../../lib/supabase'

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
} from 'docx'

export default function PrintBarcodePage() {
  const [products, setProducts] =
    useState<any[]>([])

  const [qrCodes, setQrCodes] =
    useState<any>({})

  const [loading, setLoading] =
    useState(false)

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set())

  const selectedProducts = products.filter(
    (item) => selectedIds.has(String(item.id))
  )

  function toggleSelect(id: string | number) {
    const key = String(id)

    setSelectedIds((prev) => {
      const next = new Set(prev)

      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }

      return next
    })
  }

  function selectAll() {
    setSelectedIds(
      new Set(products.map((item) => String(item.id)))
    )
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  async function getProducts() {
    setLoading(true)

    const { data } =
      await supabase
        .from('products')
        .select('*')
        .order('name', {
          ascending: true,
        })

    if (data) {
      setProducts(data)
      setSelectedIds(
        new Set(data.map((item) => String(item.id)))
      )

      const tempQr: any = {}

      for (const item of data) {
        tempQr[item.id] =
          await QRCode.toDataURL(
            item.barcode
          )
      }

      setQrCodes(tempQr)
    }

    setLoading(false)
  }

  useEffect(() => {
    getProducts()
  }, [])

  function printPage() {
    if (selectedProducts.length === 0) {
      alert('Pilih minimal 1 produk untuk dicetak.')
      return
    }

    window.print()
  }

  // CONVERT BASE64 TO UINT8ARRAY
  function base64ToUint8Array(
    base64: string
  ) {
    const base64Data =
      base64.replace(
        /^data:image\/png;base64,/,
        ''
      )

    const binaryString =
      window.atob(base64Data)

    const len = binaryString.length

    const bytes = new Uint8Array(len)

    for (let i = 0; i < len; i++) {
      bytes[i] =
        binaryString.charCodeAt(i)
    }

    return bytes
  }

  // DOWNLOAD WORD
  async function downloadWord() {
    if (selectedProducts.length === 0) {
      alert('Pilih minimal 1 produk untuk didownload.')
      return
    }

    setLoading(true)

    const children: Paragraph[] = []

    for (const item of selectedProducts) {
      const qrBase64 =
        qrCodes[item.id]

      if (!qrBase64) continue

      const imageData =
        base64ToUint8Array(
          qrBase64
        )

      children.push(
        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          children: [
            new ImageRun({
              type: 'png',

              data: imageData,

              transformation: {
                width: 90,
                height: 90,
              },
            }),
          ],

          spacing: {
            after: 100,
          },
        })
      )

      children.push(
        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          children: [
            new TextRun({
              text:
                item.name || '-',

              bold: true,

              size: 22,
            }),
          ],
        })
      )

      children.push(
        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          children: [
            new TextRun({
              text: `SKU : ${
                item.sku || '-'
              }`,
              size: 18,
            }),
          ],
        })
      )

      children.push(
        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          children: [
            new TextRun({
              text: `COLOR : ${
                item.color || '-'
              }`,
              size: 18,
            }),
          ],
        })
      )

      children.push(
        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          children: [
            new TextRun({
              text:
                item.barcode ||
                '-',

              bold: true,

              size: 20,
            }),
          ],

          spacing: {
            after: 500,
          },
        })
      )
    }

    const doc = new Document({
      sections: [
        {
          properties: {},

          children,
        },
      ],
    })

    const blob =
      await Packer.toBlob(doc)

    const url =
      window.URL.createObjectURL(
        blob
      )

    const a =
      document.createElement('a')

    a.href = url

    a.download =
      'BARCODE-PRODUCTS.docx'

    a.click()

    window.URL.revokeObjectURL(
      url
    )

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Print Barcode
          </h1>

          <p className="text-gray-500 mt-2">
            Cetak dan download
            barcode produk
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3">
          <p className="text-sm text-gray-600">
            {selectedIds.size} dari {products.length} produk dipilih
          </p>

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={selectAll}
              className="border border-gray-300 text-gray-700 px-4 py-3 rounded-2xl hover:bg-gray-50"
            >
              Pilih Semua
            </button>

            <button
              type="button"
              onClick={deselectAll}
              className="border border-gray-300 text-gray-700 px-4 py-3 rounded-2xl hover:bg-gray-50"
            >
              Batal Semua
            </button>

            <button
              onClick={printPage}
              disabled={selectedIds.size === 0}
              className="bg-black text-white px-6 py-3 rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Print Barcode
            </button>

            <button
              onClick={downloadWord}
              disabled={selectedIds.size === 0}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Download Word
            </button>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="mb-5 bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl p-4 font-semibold">
          Processing...
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {products.map((item) => {
          const isSelected = selectedIds.has(String(item.id))

          return (
          <div
            key={item.id}
            className={`border rounded-2xl p-4 flex flex-col items-center text-center bg-white transition-colors ${
              isSelected
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-gray-200 opacity-60 print:hidden'
            }`}
          >
            <label className="w-full flex items-center gap-2 mb-3 cursor-pointer print:hidden">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(item.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-600">
                {isSelected ? 'Dipilih' : 'Tidak dipilih'}
              </span>
            </label>

            {/* QR */}
            {qrCodes[item.id] && (
              <img
                src={
                  qrCodes[item.id]
                }
                alt="QR"
                className="w-32 h-32"
              />
            )}

            {/* PRODUCT */}
            <h2 className="font-bold text-sm mt-3 text-gray-900">
              {item.name}
            </h2>

            {/* SKU */}
            <p className="text-xs text-gray-500 mt-1">
              {item.sku}
            </p>

            {/* COLOR */}
            <p className="text-xs text-gray-500">
              {item.color}
            </p>

            {/* BARCODE */}
            <div className="mt-2 text-xs font-semibold break-all text-gray-900">
              {item.barcode}
            </div>
          </div>
        )})}
      </div>
    </main>
  )
}