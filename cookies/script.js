const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Mengabaikan peringatan SSL/TLS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ==============================================================================
// KONFIGURASI SUPABASE (Ganti dengan URL dan ANON KEY milikmu)
// ==============================================================================
const SUPABASE_URL = 'https://lymewxughzatlbsixfex.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uoiQT2GADE5URKyquF6r1w_HdyvgLVg'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fungsi untuk memformat array cookies dari Supabase (JSONB) menjadi string header
 */
function formatCookies(cookiesArray) {
    if (!cookiesArray || !Array.isArray(cookiesArray)) return null;
    try {
        return cookiesArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    } catch (error) {
        return null;
    }
}

// ==============================================================================
// FUNGSI MENGAMBIL DETAIL PESANAN
// ==============================================================================
async function ambilDetailPesanan(orderId, headers, sellerId) {
    // URL dinamis menyesuaikan seller_id masing-masing toko
    const urlDetail = `https://seller-id.tokopedia.com/api/fulfillment/order/get?aid=4068&locale=id-ID&oec_seller_id=${sellerId}&seller_id=${sellerId}`;
    const payload = { main_order_id: [String(orderId)] };
    
    try {
        const response = await fetch(urlDetail, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const dataDetail = await response.json();
        
        if (dataDetail.code === 0) {
            const mainOrders = dataDetail.data?.main_order || [];
            if (mainOrders.length === 0) return;
            
            const orderData = mainOrders[0];
            const payMethod = orderData.trade_order_module?.pay_method || "N/A";
            const statusPesanan = ["bayar di tempat", "cod"].includes(payMethod.toLowerCase()) ? "Pembeli memesan (COD)" : "Pesanan sudah dibayar";

            const buyerInfo = orderData.buyer_info_module || {};
            const username = buyerInfo.buyer_nickname || "NN";
            
            let namaPenerima = "";
            let alamatJalan = "";
            const shippingItems = buyerInfo.shipping_address?.items || [];
            for (const item of shippingItems) {
                if (item.key === "name") namaPenerima = item.value;
                else if (item.key === "address") alamatJalan = item.value;
            }
            
            const districts = buyerInfo.shipping_address?.districts || [];
            const wilayah = districts.map(d => d.name).filter(Boolean).join(", ");
            const alamatLengkap = `${alamatJalan}, ${wilayah}`;

            const skuModule = orderData.sku_module || [];
            const produkList = [];
            let afiliator = "Bukan dari Live/Afiliator";
            
            for (const sku of skuModule) {
                const qty = sku.quantity || 1;
                produkList.push(`${sku.product_name} | Variasi: ${sku.sku_name} (x${qty})`);
                
                const creatorItems = sku.creator_info_name?.items || [];
                for (const cItem of creatorItems) {
                    if (cItem.message_content?.includes("Penerima komisi:")) {
                        afiliator = cItem.message_content.replace("Penerima komisi:", "").trim();
                    }
                }
            }

            console.log(`    └─ 🏷️ ID Pesanan : ${orderId}`);
            console.log(`    └─ 💳 Pembayaran : ${payMethod} (${statusPesanan})`);
            console.log(`    └─ 👤 Nama/Akun  : ${namaPenerima} (${username})`);
            console.log(`    └─ 📍 Alamat     : ${alamatLengkap}`);
            console.log(`    └─ 🎥 Afiliator  : ${afiliator}`);
            for (const p of produkList) console.log(`    └─ 📦 Produk     : ${p}`);
            console.log("");
            
        } else {
            console.log(`    └─ ❌ Gagal menarik detail: ${dataDetail.message}`);
        }
    } catch (error) {
        console.log(`    └─ ❌ Error mengambil detail ${orderId}: ${error.message}`);
    }
}

// ==============================================================================
// FUNGSI UTAMA: LOOPING SEMUA TOKO DARI SUPABASE
// ==============================================================================
async function cekSemuaToko() {
    console.log("⏳ Menghubungkan ke Supabase dan mengambil data toko...");
    
    // Ambil data dari tabel 'data_toko'
    const { data: stores, error } = await supabase
        .from('data_toko') // Ganti dengan nama tabelmu yang sebenarnya
        .select('*');

    if (error) {
        console.error("❌ Gagal mengambil data dari Supabase:", error.message);
        return;
    }

    if (!stores || stores.length === 0) {
        console.log("⚠️ Tidak ada data toko yang ditemukan di database.");
        return;
    }

    console.log(`✅ Berhasil memuat ${stores.length} toko dari Supabase.\n`);

    // Loop masing-masing toko secara berurutan
    for (const store of stores) {
        console.log(`================================================================`);
        console.log(`🏪 MEMERIKSA TOKO: ${store.nama_toko} (ID: ${store.seller_id})`);
        console.log(`================================================================`);

        const formattedCookie = formatCookies(store.cookies);
        if (!formattedCookie) {
            console.log(`❌ Cookies untuk toko ${store.nama_toko} tidak valid/kosong. Skip ke toko berikutnya.\n`);
            continue;
        }

        const headers = {
            "cookie": formattedCookie,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
            "content-type": "application/json",
            "origin": "https://seller-id.tokopedia.com",
            "referer": "https://seller-id.tokopedia.com/order?order_status[]=2&selected_sort=11&tab=to_ship"
        };

        // URL dinamis menggunakan seller_id dari database
        const urlList = `https://seller-id.tokopedia.com/api/fulfillment/order/list?aid=4068&locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}`;
        
        const payload = {
            search_condition: {
                condition_list: {
                    order_status: { value: ["2"] }, // Menunggu Pengiriman
                    search_tab: { value: ["101"] }
                }
            },
            offset: 0,
            count: 20,
            sort_info: "11",
            search_cursor: "",
            pagination_type: 0
        };

        try {
            const response = await fetch(urlList, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            if (data.code === 0) {
                const orderList = data.data?.main_orders || [];
                
                console.log(`📦 Menemukan ${orderList.length} pesanan (Menunggu Pengiriman):\n`);
                
                if (orderList.length === 0) {
                    console.log("Tidak ada pesanan baru.\n");
                    continue; // Lanjut ke toko berikutnya
                }

                for (const order of orderList) {
                    const orderId = order.main_order_id || "N/A";
                    const pembeli = order.buyer_info_module?.buyer_nickname || "NN";
                    const noteModule = order.note_module || {};
                    const catatan = noteModule.has_buyer_note ? (noteModule.buyer_note || "-") : "-";
                    const grandTotal = order.price_module?.grand_total?.format_price || "Rp0";
                    
                    console.log(`🆔 ${orderId} | 👤 ${pembeli} | 💰 ${grandTotal} | 📝 ${catatan}`);
                    
                    if (orderId !== "N/A") {
                        // Pass seller_id ke fungsi detail agar URL request detail juga dinamis
                        await ambilDetailPesanan(orderId, headers, store.seller_id);
                    }
                    console.log("-".repeat(60));
                }
            } else {
                console.log(`❌ Error API Tokopedia (Kode: ${data.code}): ${data.message} (Mungkin cookies expired)`);
            }
        } catch (error) {
            console.log(`❌ Koneksi gagal untuk toko ${store.nama_toko}: ${error.message}`);
        }
        
        console.log("\n"); // Spasi antar toko
    }
    
    console.log("🎉 Pengecekan seluruh toko selesai!");
}

// Jalankan skrip
cekSemuaToko();