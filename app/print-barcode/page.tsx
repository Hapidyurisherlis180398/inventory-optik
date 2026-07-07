'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { saveAs } from 'file-saver'

import { supabase } from '../../lib/supabase'

import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
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

  useEffect(() => {
    getProducts()
  }, [])

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
            item.barcode || '-',
            {
              width: 300,
              margin: 1,
            }
          )
      }

      setQrCodes(tempQr)
    }

    setLoading(false)
  }

  function toggleSelect(
    id: string | number
  ) {
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
      new Set(products.map((i) => String(i.id)))
    )
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  function printPage() {
    window.print()
  }

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

    const bytes = new Uint8Array(
      binaryString.length
    )

    for (
      let i = 0;
      i < binaryString.length;
      i++
    ) {
      bytes[i] =
        binaryString.charCodeAt(i)
    }

    return bytes
  }

  function createProductCell(
    item: any
  ) {
    const qrBase64 =
      qrCodes[item.id]

    if (!qrBase64) {
      return new TableCell({
        children: [
          new Paragraph('No QR'),
        ],
      })
    }

    const imageData =
      base64ToUint8Array(qrBase64)

    return new TableCell({
      width: {
        size: 33,
        type: WidthType.PERCENTAGE,
      },

      margins: {
        top: 120,
        bottom: 120,
        left: 120,
        right: 120,
      },

      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: '000000',
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: '000000',
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: '000000',
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: '000000',
        },
      },

      children: [
        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          children: [
            new ImageRun({
              data: imageData,
              transformation: {
                width: 100,
                height: 100,
              },
              type: 'png',
            }),
          ],
        }),

        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          spacing: {
            after: 80,
          },

          children: [
            new TextRun({
              text:
                item.name || '-',
              bold: true,
              size: 20,
            }),
          ],
        }),

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
        }),

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
        }),

        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          spacing: {
            before: 60,
          },

          children: [
            new TextRun({
              text:
                item.barcode ||
                '-',
              bold: true,
              size: 20,
            }),
          ],
        }),
      ],
    })
  }

  async function downloadWord() {
    if (
      selectedProducts.length === 0
    ) {
      alert(
        'Pilih minimal 1 produk.'
      )
      return
    }

    setLoading(true)

    const rows: TableRow[] = []

    for (
      let i = 0;
      i < selectedProducts.length;
      i += 3
    ) {
      const chunk =
        selectedProducts.slice(
          i,
          i + 3
        )

      while (chunk.length < 3) {
        chunk.push(null)
      }

      rows.push(
        new TableRow({
          children: chunk.map(
            (item) => {
              if (!item) {
                return new TableCell({
                  children: [
                    new Paragraph(
                      ''
                    ),
                  ],
                })
              }

              return createProductCell(
                item
              )
            }
          ),
        })
      )
    }

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },

      rows,
    })

    const doc = new Document({
      sections: [
        {
          children: [table],
        },
      ],
    })

    const blob =
      await Packer.toBlob(doc)

    saveAs(
      blob,
      'BARCODE-PRODUCTS.docx'
    )

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">
            Print Barcode
          </h1>

          <p className="text-gray-500 mt-2">
            Download barcode ke Word
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={selectAll}
            className="border px-4 py-3 rounded-xl"
          >
            Pilih Semua
          </button>

          <button
            onClick={deselectAll}
            className="border px-4 py-3 rounded-xl"
          >
            Batal Semua
          </button>

          <button
            onClick={printPage}
            className="bg-black text-white px-5 py-3 rounded-xl"
          >
            Print
          </button>

          <button
            onClick={downloadWord}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl"
          >
            Download Word
          </button>
        </div>
      </div>

      {loading && (
        <div className="mb-5 bg-blue-50 border border-blue-200 p-4 rounded-xl">
          Processing...
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {products.map((item) => {
          const isSelected =
            selectedIds.has(
              String(item.id)
            )

          return (
            <div
              key={item.id}
              className={`border rounded-2xl p-4 text-center transition ${
                isSelected
                  ? 'border-blue-500'
                  : 'opacity-40'
              }`}
            >
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    isSelected
                  }
                  onChange={() =>
                    toggleSelect(
                      item.id
                    )
                  }
                />

                <span className="text-sm">
                  Pilih
                </span>
              </label>

              {qrCodes[item.id] && (
                <img
                  src={
                    qrCodes[item.id]
                  }
                  alt="QR"
                  className="w-28 h-28 mx-auto"
                />
              )}

              <h2 className="font-bold mt-3 text-sm">
                {item.name}
              </h2>

              <p className="text-xs text-gray-500">
                {item.sku}
              </p>

              <p className="text-xs text-gray-500">
                {item.color}
              </p>

              <div className="mt-2 text-xs font-semibold break-all">
                {item.barcode}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}