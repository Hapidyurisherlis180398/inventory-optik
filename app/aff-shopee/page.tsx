"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function InputDataAffShopee() {
  const [tiktokLinks, setTiktokLinks] = useState("");
  const [shopeeLink, setShopeeLink] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    // 1. Memproses input textarea menjadi Array link
    // Memisahkan berdasarkan baris baru, membersihkan spasi, dan membuang baris kosong
    const linksArray = tiktokLinks
      .split("\n")
      .map((link) => link.trim())
      .filter((link) => link !== "");

    if (linksArray.length === 0) {
      setMessage({ type: "error", text: "Minimal masukkan 1 link TikTok." });
      setIsLoading(false);
      return;
    }

    // 2. Mengirim data ke Supabase
    const { data, error } = await supabase
      .from("shopee_affiliate_data")
      .insert([
        {
          tiktok_links: linksArray,
          shopee_link: shopeeLink,
          description: description,
        },
      ]);

    if (error) {
      console.error("Error insert data:", error);
      setMessage({ type: "error", text: `Gagal menyimpan: ${error.message}` });
    } else {
      setMessage({ type: "success", text: "Data berhasil disimpan ke Supabase!" });
      // Reset form setelah berhasil
      setTiktokLinks("");
      setShopeeLink("");
      setDescription("");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
          Input Data Affiliate Shopee
        </h1>

        {message.text && (
          <div
            className={`p-4 mb-6 rounded-md ${
              message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Link TikTok */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Video TikTok (Bisa lebih dari 10)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Masukkan 1 link per baris (tekan Enter untuk memisahkan link).
            </p>
            <textarea
              required
              rows={8}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://vt.tiktok.com/link1/&#10;https://vt.tiktok.com/link2/&#10;https://vt.tiktok.com/link3/"
              value={tiktokLinks}
              onChange={(e) => setTiktokLinks(e.target.value)}
            />
          </div>

          {/* Input Link Shopee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Affiliate Shopee
            </label>
            <input
              type="url"
              required
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://shope.ee/..."
              value={shopeeLink}
              onChange={(e) => setShopeeLink(e.target.value)}
            />
          </div>

          {/* Input Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Produk
            </label>
            <textarea
              required
              rows={4}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tuliskan deskripsi produk, caption, atau hashtag di sini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 transition-colors"
          >
            {isLoading ? "Menyimpan Data..." : "Simpan ke Database"}
          </button>
        </form>
      </div>
    </div>
  );
}