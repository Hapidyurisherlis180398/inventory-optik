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

    const linksArray = tiktokLinks
      .split("\n")
      .map((link) => link.trim())
      .filter((link) => link !== "");

    if (linksArray.length === 0) {
      setMessage({ type: "error", text: "Minimal masukkan 1 link TikTok." });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from("shopee_affiliate_data").insert([
      {
        tiktok_links: linksArray,
        shopee_link: shopeeLink,
        description: description,
      },
    ]);

    if (error) {
      setMessage({ type: "error", text: `Gagal menyimpan: ${error.message}` });
    } else {
      setMessage({ type: "success", text: "✨ Data berhasil diamankan ke database!" });
      setTiktokLinks("");
      setShopeeLink("");
      setDescription("");
    }

    setIsLoading(false);
  };

  return (
    // Background gradient gelap ala modern web
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#1a1a24] to-black p-6 flex justify-center items-center font-sans">
      
      {/* Container dengan efek Glassmorphism */}
      <div className="bg-white/5 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/10 w-full max-w-3xl">
        
        {/* Header Section */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
            Auto-Affiliate Hub
          </h1>
          <p className="text-gray-400 text-sm">
            Input data TikTok & Shopee untuk sistem automasi Anda
          </p>
        </div>

        {/* Notifikasi Message */}
        {message.text && (
          <div
            className={`p-4 mb-8 rounded-xl border backdrop-blur-md flex items-center gap-3 ${
              message.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <span className="text-xl">{message.type === "error" ? "⚠️" : "✅"}</span>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Link TikTok */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Link Video TikTok <span className="text-cyan-400">*</span>
            </label>
            <p className="text-xs text-gray-500">
              Satu baris untuk satu link (Enter untuk baris baru)
            </p>
            <textarea
              required
              rows={6}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-y custom-scrollbar"
              placeholder="https://vt.tiktok.com/ZSbmwaL9c/&#10;https://vt.tiktok.com/..."
              value={tiktokLinks}
              onChange={(e) => setTiktokLinks(e.target.value)}
            />
          </div>

          {/* Input Link Shopee */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Link Affiliate Shopee <span className="text-cyan-400">*</span>
            </label>
            <input
              type="url"
              required
              className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              placeholder="https://shope.ee/..."
              value={shopeeLink}
              onChange={(e) => setShopeeLink(e.target.value)}
            />
          </div>

          {/* Input Deskripsi */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Deskripsi & Hashtag <span className="text-cyan-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-y"
              placeholder="Tulis caption promosi Anda di sini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(8,112,184,0.3)] hover:shadow-[0_0_25px_rgba(8,112,184,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 transition-all duration-200"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses Data...
              </span>
            ) : (
              "🚀 Simpan Data ke Database"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}