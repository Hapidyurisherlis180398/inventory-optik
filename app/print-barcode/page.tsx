'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

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
  WidthType,
  BorderStyle,
} from 'docx'

export default function PrintBarcodePage() {
  const [products, setProducts] =
    useState<any[]>([])

  const [loading, setLoading] =
    useState(false)

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set())

  const selectedProducts = products.filter(
    (item) =>
      selectedIds.has(String(item.id))
  )

  useEffect(() => {
    getProducts()
  }, [])

  async function getProducts() {
    try {
      setLoading(true)

      const { data, error } =
        await supabase
          .from('products')
          .select('*')
          .order('name', {
            ascending: true,
          })

      if (error) {
        console.error(error)
        return
      }

      if (data) {
        setProducts(data)

        setSelectedIds(
          new Set(
            data.map((item) =>
              String(item.id)
            )
          )
        )
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
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
      new Set(
        products.map((item) =>
          String(item.id)
        )
      )
    )
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  // =========================
  // CREATE IMAGE LABEL
  // =========================

  async function createBarcodeImage(
    item: any
  ) {
    const canvas =
      document.createElement('canvas')

    const ctx =
      canvas.getContext('2d')

    if (!ctx) return null

    canvas.width = 420
    canvas.height = 300

    // BACKGROUND
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    // BORDER
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2

    ctx.strokeRect(
      2,
      2,
      canvas.width - 4,
      canvas.height - 4
    )

    // QR CODE
    const qrDataUrl =
      await QRCode.toDataURL(
        item.barcode || '-',
        {
          margin: 1,
          width: 180,
        }
      )

    const qrImage = new Image()

    qrImage.src = qrDataUrl

    await new Promise((resolve) => {
      qrImage.onload = resolve
    })

    ctx.drawImage(
      qrImage,
      120,
      15,
      180,
      180
    )

    // TEXT STYLE
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'

    // NAME
    ctx.font =
      'bold 20px Arial'

    ctx.fillText(
      item.name || '-',
      210,
      220
    )

    // SKU
    ctx.font =
      '16px Arial'

    ctx.fillText(
      `SKU : ${item.sku || '-'}`,
      210,
      245
    )

    // COLOR
    ctx.fillText(
      `COLOR : ${
        item.color || '-'
      }`,
      210,
      268
    )

    return canvas.toDataURL(
      'image/png'
    )
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

    const bytes =
      new Uint8Array(
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

  // =========================
  // DOWNLOAD WORD
  // =========================

  async function downloadWord() {
    try {
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
        i += 2
      ) {
        const chunk =
          selectedProducts.slice(
            i,
            i + 2
          )

        while (chunk.length < 2) {
          chunk.push(null)
        }

        const cells =
          await Promise.all(
            chunk.map(
              async (item) => {
                if (!item) {
                  return new TableCell({
                    children: [
                      new Paragraph(
                        ''
                      ),
                    ],
                  })
                }

                const imageBase64 =
                  await createBarcodeImage(
                    item
                  )

                if (!imageBase64) {
                  return new TableCell({
                    children: [
                      new Paragraph(
                        'Error'
                      ),
                    ],
                  })
                }

                const imageData =
                  base64ToUint8Array(
                    imageBase64
                  )

                return new TableCell({
                  width: {
                    size: 50,
                    type:
                      WidthType.PERCENTAGE,
                  },

                  borders: {
                    top: {
                      style:
                        BorderStyle.NONE,
                      size: 0,
                      color:
                        'FFFFFF',
                    },
                    bottom: {
                      style:
                        BorderStyle.NONE,
                      size: 0,
                      color:
                        'FFFFFF',
                    },
                    left: {
                      style:
                        BorderStyle.NONE,
                      size: 0,
                      color:
                        'FFFFFF',
                    },
                    right: {
                      style:
                        BorderStyle.NONE,
                      size: 0,
                      color:
                        'FFFFFF',
                    },
                  },

                  children: [
                    new Paragraph({
                      alignment:
                        AlignmentType.CENTER,

                      children: [
                        new ImageRun({
                          data: imageData,

                          transformation:
                            {
                              width: 260,
                              height: 185,
                            },

                          type: 'png',
                        }),
                      ],
                    }),
                  ],
                })
              }
            )
          )

        rows.push(
          new TableRow({
            children: cells,
          })
        )
      }

      const table = new Table({
        width: {
          size: 100,
          type:
            WidthType.PERCENTAGE,
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

      const url =
        window.URL.createObjectURL(
          blob
        )

      const a =
        document.createElement('a')

      a.href = url

      a.download =
        'BARCODE-PRODUCTS.docx'

      document.body.appendChild(a)

      a.click()

      a.remove()

      window.URL.revokeObjectURL(
        url
      )
    } catch (error) {
      console.error(error)

      alert(
        'Terjadi error saat membuat Word'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Print Barcode
          </h1>

          <p className="text-gray-500 mt-2">
            Barcode akan menjadi
            gambar di Word
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={selectAll}
            className="border border-gray-300 px-4 py-3 rounded-xl"
          >
            Pilih Semua
          </button>

          <button
            onClick={deselectAll}
            className="border border-gray-300 px-4 py-3 rounded-xl"
          >
            Batal Semua
          </button>

          <button
            onClick={downloadWord}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl"
          >
            Download Word
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="mb-5 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl">
          Processing...
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {products.map((item) => {
          const isSelected =
            selectedIds.has(
              String(item.id)
            )

          return (
            <div
              key={item.id}
              className={`border rounded-2xl p-4 text-center transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'opacity-40 border-gray-200'
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

              <h2 className="font-bold text-sm">
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