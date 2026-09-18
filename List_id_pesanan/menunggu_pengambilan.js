const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Mengabaikan peringatan SSL/TLS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ==============================================================================
// KONFIGURASI SUPABASE
// ==============================================================================
const SUPABASE_URL = 'https://lymewxughzatlbsixfex.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uoiQT2GADE5URKyquF6r1w_HdyvgLVg'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi Jeda (Delay) untuk menghindari Rate Limit/Banned dari API
const jeda = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function formatCookies(cookiesArray) {
    if (!cookiesArray || !Array.isArray(cookiesArray)) return null;
    try {
        return cookiesArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    } catch (error) {
        return null;
    }
}

// ==============================================================================
// FUNGSI PELACAK RESI OTOMATIS (RECURSIVE)
// ==============================================================================
function cariResiOtomatis(obj) {
    if (!obj || typeof obj !== 'object') return null;

    if (obj.tracking_no && obj.tracking_no !== "") return obj.tracking_no;
    if (obj.last_tracking_no && obj.last_tracking_no !== "") return obj.last_tracking_no;
    if (obj.awb && obj.awb !== "") return obj.awb;
    if (obj.tracking_id && obj.tracking_id !== "") return obj.tracking_id;

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const hasil = cariResiOtomatis(obj[key]);
            if (hasil) return hasil; 
        }
    }
    return null; 
}

// ==============================================================================
// FUNGSI MENGAMBIL DETAIL PESANAN & DATA KEUANGAN
// ==============================================================================
async function ambilDetailPesanan(orderId, headers, sellerId, createTimeMs = null, paymentTimeMs = null, updateTimeMs = null) {
    const urlDetail = `https://seller-id.tokopedia.com/api/fulfillment/order/get?aid=4068&locale=id-ID&oec_seller_id=${sellerId}&seller_id=${sellerId}`;
    const payload = { main_order_id: [String(orderId)] };
    const urlKeuangan = `https://seller-id.tokopedia.com/api/v1/pay/statement/order/list?locale=id-ID&from=0&no_need_sku_record=true&page_type=10&pagination_type=1&size=5&terminal_type=1&reference_id=${orderId}&statement_version=0&settlement_status=1&need_total_amount=true&oec_seller_id=${sellerId}&seller_id=${sellerId}`;

    try {
        const [responseDetail, responseKeuangan] = await Promise.all([
            fetch(urlDetail, { method: 'POST', headers: headers, body: JSON.stringify(payload) }),
            fetch(urlKeuangan, { method: 'GET', headers: headers })
        ]);

        if (!responseDetail.ok) throw new Error(`HTTP error! status: ${responseDetail.status}`);
        
        const dataDetail = await responseDetail.json();
        let dataKeuangan = null;
        
        if (responseKeuangan.ok) {
            const jsonKeuangan = await responseKeuangan.json();
            if (jsonKeuangan.code === 0) dataKeuangan = jsonKeuangan.data;
        }
        
        if (dataDetail.code === 0) {
            const mainOrders = dataDetail.data?.main_order || [];
            if (mainOrders.length === 0) return;
            
            const orderData = mainOrders[0];
            const tradeModule = orderData.trade_order_module || {};
            const payMethod = tradeModule.pay_method || "N/A";
            
            const isCOD = ["bayar di tempat", "cod"].includes(payMethod.toLowerCase());
            const statusPesanan = isCOD ? "Pembeli memesan (COD)" : "Pesanan sudah dibayar";

            // 1. LOGIKA WAKTU
            let labelWaktu = isCOD ? "Tgl Dibuat " : "Tgl Dibayar";
            let waktuTampil = "-";
            let rawTime = null;
            
            if (isCOD) {
                rawTime = orderData.create_time || tradeModule.create_time || createTimeMs;
            } else {
                rawTime = orderData.payment_time || tradeModule.payment_time || paymentTimeMs;
                if (!rawTime) rawTime = orderData.update_time || tradeModule.update_time || updateTimeMs;
                if (!rawTime) {
                    rawTime = orderData.create_time || createTimeMs;
                    labelWaktu = "Tgl Dibuat (Payment Time API Null)";
                }
            }

            if (rawTime) {
                const ms = String(rawTime).length <= 11 ? Number(rawTime) * 1000 : Number(rawTime);
                waktuTampil = new Date(ms).toLocaleString('id-ID', { 
                    timeZone: 'Asia/Jakarta',
                    dateStyle: 'medium',
                    timeStyle: 'medium'
                });
            }

            const buyerInfo = orderData.buyer_info_module || {};
            const username = buyerInfo.buyer_nickname || "NN";
            
            // 2. FORMAT ALAMAT
            const districts = buyerInfo.shipping_address?.districts || [];
            const validDistricts = districts.map(d => d.name).filter(name => name && !name.includes('*')); 
            let kotaProvinsi = validDistricts.slice(0, 2).reverse().join(", ");
            const alamatLengkap = kotaProvinsi ? `${kotaProvinsi}, Indonesia` : "Alamat tidak diketahui";

            // 3. MEMISAHKAN PRODUK
            const skuModule = orderData.sku_module || [];
            const produkList = [];
            let afiliator = "Bukan dari Live/Afiliator";
            
            for (const sku of skuModule) {
                produkList.push({
                    nama: sku.product_name || "Nama Produk Tidak Diketahui",
                    variasi: sku.sku_name || "-",
                    qty: sku.quantity || 1
                });
                
                const creatorItems = sku.creator_info_name?.items || [];
                for (const cItem of creatorItems) {
                    if (cItem.message_content?.includes("Penerima komisi:")) {
                        afiliator = cItem.message_content.replace("Penerima komisi:", "").trim();
                    }
                }
            }

            // 4. MENGAMBIL TRACKING NUMBER 
            const trackingKetemu = cariResiOtomatis(orderData);
            const trackingNo = trackingKetemu || "Belum dicetak / Belum ada resi";

            // 5. MENGAMBIL CATATAN
            const noteModule = orderData.note_module || {};
            const buyerNote = noteModule.has_buyer_note ? (noteModule.buyer_note || "-") : "-";
            const sellerNote = noteModule.seller_note_value?.note_text || noteModule.seller_note || "-";

            // 6. MENGAMBIL RINCIAN KEUANGAN
            const perkiraanPenghasilan = dataKeuangan?.sum_earning_amount?.format_with_symbol || "Belum tersedia";
            const perkiraanBiaya = dataKeuangan?.sum_fees_amount?.format_with_symbol || "Belum tersedia";
            const penyelesaianPembayaran = dataKeuangan?.sum_settlement_amount?.format_with_symbol || "Belum tersedia";

            const rawPenghasilan = Number(dataKeuangan?.sum_earning_amount?.amount || 0);
            const rawBiaya = Number(dataKeuangan?.sum_fees_amount?.amount || 0);

            let persenPpn = "0%";
            if (rawPenghasilan > 0) {
                const hitungPersen = (Math.abs(rawBiaya) / rawPenghasilan) * 100;
                persenPpn = hitungPersen.toFixed(2) + "%"; 
            }

            // CETAK HASIL KE TERMINAL
            console.log(`    └─ 🏷️ ID Pesanan : ${orderId}`);
            console.log(`    └─ 🚚 No. Resi   : ${trackingNo}`);
            console.log(`    └─ 🕒 ${labelWaktu}: ${waktuTampil}`);
            console.log(`    └─ 💳 Pembayaran : ${payMethod} (${statusPesanan})`);
            console.log(`    └─ 👤 Username   : ${username}`);
            console.log(`    └─ 📍 Alamat     : ${alamatLengkap}`);
            console.log(`    └─ 🎥 Afiliator  : ${afiliator}`);
            console.log(`    └─ 📝 Chat. Buyer: ${buyerNote}`);
            console.log(`    └─ 📝 Chat. Penj.: ${sellerNote}`);
            console.log(`    └─ 💰 Penghasilan: ${perkiraanPenghasilan}`);
            console.log(`    └─ 📉 Biaya (Fee): ${perkiraanBiaya}`);
            console.log(`    └─ 📊 PPN (Fee) %: ${persenPpn}`);
            console.log(`    └─ 💵 Penyelesaian: ${penyelesaianPembayaran}`);
            
            for (let i = 0; i < produkList.length; i++) {
                const p = produkList[i];
                console.log(`    └─ 📦 Produk ${i + 1}   : ${p.nama}`);
                console.log(`       ├─ Variasi    : ${p.variasi}`);
                console.log(`       └─ Jumlah     : ${p.qty}`);
            }
            console.log("");
            
        } else {
            console.log(`    └─ ❌ Gagal menarik detail: ${dataDetail.message}`);
        }
    } catch (error) {
        console.log(`    └─ ❌ Error mengambil detail ${orderId}: ${error.message}`);
    }
}

// ==============================================================================
// FUNGSI UTAMA: LOOPING SEMUA TOKO DARI SUPABASE DENGAN PAGINATION
// ==============================================================================
async function cekSemuaToko() {
    console.log("⏳ Menghubungkan ke Supabase dan mengambil data toko...");
    
    const { data: stores, error } = await supabase.from('data_toko').select('*');

    if (error) {
        console.error("❌ Gagal mengambil data dari Supabase:", error.message);
        return;
    }

    if (!stores || stores.length === 0) {
        console.log("⚠️ Tidak ada data toko yang ditemukan di database.");
        return;
    }

    console.log(`✅ Berhasil memuat ${stores.length} toko dari Supabase.\n`);

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

        const urlList = `https://seller-id.tokopedia.com/api/fulfillment/order/list?aid=4068&locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}`;
        
        // VARIABLE PAGINATION (Diubah kembali ke 20 per halaman)
        let offsetData = 0;
        const batasPerHalaman = 20; // <-- Diubah menjadi 20
        let lanjutTarikHalaman = true;
        let totalPesananTokoIni = 0;
        let halamanKe = 1;

        // LOOPING SELAMA MASIH ADA HALAMAN SELANJUTNYA
        while (lanjutTarikHalaman) {
            console.log(`🔄 Menarik Halaman ${halamanKe} (Dimulai dari pesanan ke-${offsetData + 1})...`);
            
            const payload = {
                search_condition: {
                    condition_list: {
                        order_status: { value: ["2"] }, // Menunggu Pengiriman
                        search_tab: { value: ["101"] }
                    }
                },
                offset: offsetData,
                count: batasPerHalaman, // Menyesuaikan dengan nilai 20 di atas
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
                    
                    if (orderList.length === 0) {
                        if (halamanKe === 1) console.log("Tidak ada pesanan baru.\n");
                        lanjutTarikHalaman = false; // Hentikan loop jika array kosong
                        break; 
                    }

                    // Proses setiap pesanan di halaman ini
                    for (const order of orderList) {
                        totalPesananTokoIni++;
                        const orderId = order.main_order_id || "N/A";
                        const pembeli = order.buyer_info_module?.buyer_nickname || "NN";
                        
                        const createTimeMs = order.create_time || null; 
                        const paymentTimeMs = order.payment_time || null;
                        const updateTimeMs = order.update_time || null;
                        
                        console.log(`🆔 [${totalPesananTokoIni}] ${orderId} | 👤 ${pembeli}`);
                        
                        if (orderId !== "N/A") {
                            await ambilDetailPesanan(orderId, headers, store.seller_id, createTimeMs, paymentTimeMs, updateTimeMs);
                            
                            // DELAY 1 DETIK SETELAH SETIAP PESANAN AGAR TIDAK KENA LIMIT API (BANNED)
                            await jeda(1000); 
                        }
                        console.log("-".repeat(60));
                    }

                    // PENENTUAN APAKAH ADA HALAMAN BERIKUTNYA
                    if (orderList.length < batasPerHalaman) {
                        // Jika hasil yang didapat kurang dari 20, berarti ini halaman terakhir
                        lanjutTarikHalaman = false;
                    } else {
                        // Jika pas 20, kemungkinan ada halaman selanjutnya. Tambah offset.
                        offsetData += batasPerHalaman;
                        halamanKe++;
                        
                        // Jeda 2 detik sebelum memanggil list halaman berikutnya
                        await jeda(2000); 
                    }

                } else {
                    console.log(`❌ Error API Tokopedia (Kode: ${data.code}): ${data.message}`);
                    lanjutTarikHalaman = false; // Hentikan loop jika error (misal cookies expired)
                }
            } catch (error) {
                console.log(`❌ Koneksi gagal saat menarik Halaman ${halamanKe}: ${error.message}`);
                lanjutTarikHalaman = false;
            }
        }
        
        console.log(`✅ Selesai memeriksa ${store.nama_toko}. Total ditarik: ${totalPesananTokoIni} pesanan.\n`); 
    }
    
    console.log("🎉 Pengecekan seluruh toko selesai!");
}

cekSemuaToko();