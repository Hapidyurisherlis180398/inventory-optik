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
    if (products.length === 0)
      return

    setLoading(true)

    const children: Paragraph[] = []

    for (const item of products) {
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

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={printPage}
            className="bg-black text-white px-6 py-3 rounded-2xl hover:opacity-90"
          >
            Print Barcode
          </button>

          <button
            onClick={downloadWord}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:opacity-90"
          >
            Download Word
          </button>
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
        {products.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center bg-white"
          >
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
        ))}
      </div>
    </main>
  )
}