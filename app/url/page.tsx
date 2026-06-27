import Link from "next/link";

const menus = [
  {
    title: "Dashboard Utama",
    description: "Halaman utama inventory optik",
    url: "https://inventory-optik-ten.vercel.app/",
    icon: "🏠",
  },
  {
    title: "Belanja",
    description: "Daftar kebutuhan pembelian stok",
    url: "https://inventory-optik-ten.vercel.app/belanja",
    icon: "🛒",
  },
  {
    title: "Income",
    description: "Monitoring pemasukan",
    url: "https://inventory-optik-ten.vercel.app/income",
    icon: "💰",
  },
  {
    title: "Kurangi Stok",
    description: "Mengurangi stok barang",
    url: "https://inventory-optik-ten.vercel.app/kurangi-stok",
    icon: "📉",
  },
  {
    title: "Laporan",
    description: "Laporan stok dan transaksi",
    url: "https://inventory-optik-ten.vercel.app/laporan",
    icon: "📊",
  },
  {
    title: "Tambah Stok",
    description: "Menambah stok barang",
    url: "https://inventory-optik-ten.vercel.app/tambah-stok",
    icon: "📦",
  },
  {
    title: "Live A-Usup",
    description: "Monitoring stok live A-Usup",
    url: "https://inventory-optik-ten.vercel.app/live/a-usup",
    icon: "🎥",
  },
  {
    title: "Live A-Cape",
    description: "Monitoring stok live A-Cape",
    url: "https://inventory-optik-ten.vercel.app/live/a-cape",
    icon: "📺",
  },
  {
    title: "Live Agil",
    description: "Monitoring stok live Agil",
    url: "https://inventory-optik-ten.vercel.app/live/agil",
    icon: "🎬",
  },
  {
    title: "Scanner",
    description: "Scan Barcode Frame",
    url: "https://inventory-optik-ten.vercel.app/scan",
    icon: "📷",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-3xl font-bold text-gray-900">
            Inventory Optik
          </h1>
          <p className="text-gray-500 mt-1">
            Pusat Navigasi Sistem Inventory & Monitoring Stok
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Link
              key={menu.url}
              href={menu.url}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300"
            >
              <div className="text-5xl mb-4">{menu.icon}</div>

              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                {menu.title}
              </h2>

              <p className="text-gray-500 mt-2">
                {menu.description}
              </p>

              <div className="mt-5 flex items-center text-blue-600 font-medium">
                Buka Halaman
                <span className="ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Inventory Optik • Teammyhappyd
        </div>
      </footer>
    </main>
  );
}