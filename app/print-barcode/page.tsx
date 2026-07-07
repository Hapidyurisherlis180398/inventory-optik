'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { supabase } from '../../lib/supabase'

import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx'

export default function PrintBarcodePage() {
  const [products, setProducts] =
    useState<any[]>([])

  const [loading, setLoading] =
    useState(false)

  const [searchSku, setSearchSku] =
    useState('')

  const [qrCodes, setQrCodes] =
    useState<any>({})

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set())

  const filteredProducts =
    products.filter((item) =>
      item.sku
        ?.toLowerCase()
        .includes(
          searchSku.toLowerCase()
        )
    )

  const selectedProducts =
    filteredProducts.filter((item) =>
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
        filteredProducts.map((item) =>
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

    canvas.width = 500
    canvas.height = 420

    // BACKGROUND
    ctx.fillStyle = '#FFFFFF'

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    // BORDER
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 3

    ctx.strokeRect(
      3,
      3,
      canvas.width - 6,
      canvas.height - 6
    )

    // QR
    const qrDataUrl =
      await QRCode.toDataURL(
        item.barcode || '-',
        {
          width: 220,
          margin: 1,
        }
      )

    const qrImage = new Image()

    qrImage.src = qrDataUrl

    await new Promise((resolve) => {
      qrImage.onload = resolve
    })

    ctx.drawImage(
      qrImage,
      140,
      20,
      220,
      220
    )

    // ======================
    // TEXT STYLE
    // ======================

    ctx.textAlign = 'center'
    ctx.fillStyle = '#000000'

    // PRODUCT NAME
    ctx.font =
      'bold 30px Arial'

    ctx.fillText(
      item.name || '-',
      250,
      285
    )

    // COLOR
    ctx.font =
      '20px Arial'

    ctx.fillStyle = '#444444'

    ctx.fillText(
      `COLOR : ${
        item.color || '-'
      }`,
      250,
      325
    )

    // SKU
    ctx.font =
      'bold 22px Arial'

    ctx.fillStyle = '#000000'

    ctx.fillText(
      `SKU : ${
        item.sku || '-'
      }`,
      250,
      360
    )

    // BARCODE
    ctx.font =
      'bold 20px Arial'

    ctx.fillText(
      item.barcode || '-',
      250,
      395
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
                              width: 300,
                              height: 250,
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
    <main className="min-h-screen bg-gray-100 p-6">
      {/* HEADER */}
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h1 className="text-4xl font-black text-black">
              Print Barcode
            </h1>

            <p className="text-gray-500 mt-2 text-lg">
              Download barcode
              dalam bentuk image ke
              Word
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={selectAll}
              className="bg-black text-white px-5 py-3 rounded-2xl font-bold hover:opacity-90"
            >
              Pilih Semua
            </button>

            <button
              onClick={deselectAll}
              className="bg-gray-200 text-black px-5 py-3 rounded-2xl font-bold hover:bg-gray-300"
            >
              Batal Semua
            </button>

            <button
              onClick={downloadWord}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700"
            >
              Download Word
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mt-6">
          <input
            type="text"
            placeholder="Cari berdasarkan SKU..."
            value={searchSku}
            onChange={(e) =>
              setSearchSku(
                e.target.value
              )
            }
            className="w-full lg:w-[420px] border border-gray-300 rounded-2xl px-5 py-4 text-black font-semibold outline-none focus:ring-4 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="mb-5 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-2xl font-bold">
          Processing...
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map(
          (item) => {
            const isSelected =
              selectedIds.has(
                String(item.id)
              )

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl p-5 transition-all border shadow-sm hover:shadow-xl ${
                  isSelected
                    ? 'border-blue-500 ring-4 ring-blue-100'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                {/* CHECKBOX */}
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
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
                    className="w-5 h-5"
                  />

                  <span className="font-bold text-black">
                    Pilih Produk
                  </span>
                </label>

                {/* QR */}
                <div className="bg-gray-50 rounded-2xl p-4 flex justify-center mb-5">
                  {qrCodes[item.id] && (
                    <img
                      src={
                        qrCodes[
                          item.id
                        ]
                      }
                      alt="QR"
                      className="w-40 h-40 object-contain"
                    />
                  )}
                </div>

                {/* PRODUCT NAME */}
                <h2 className="text-[18px] font-black text-black text-center uppercase leading-tight">
                  {item.name}
                </h2>

                {/* COLOR */}
                <div className="mt-5 text-center">
                  <p className="text-gray-500 text-sm font-semibold">
                    COLOR
                  </p>

                  <p className="text-black text-[15px] font-bold mt-1">
                    {item.color ||
                      '-'}
                  </p>
                </div>

                {/* SKU */}
                <div className="mt-4 text-center">
                  <p className="text-gray-500 text-sm font-semibold">
                    SKU
                  </p>

                  <p className="text-black text-[16px] font-black mt-1">
                    {item.sku ||
                      '-'}
                  </p>
                </div>

                {/* BARCODE */}
                <div className="mt-5 bg-black rounded-2xl px-4 py-3 text-center">
                  <p className="text-white text-[12px] font-black tracking-[2px] break-all">
                    {item.barcode}
                  </p>
                </div>
              </div>
            )
          }
        )}
      </div>
    </main>
  )
}