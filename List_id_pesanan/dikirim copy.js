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
// FUNGSI PELACAK OTOMATIS (RECURSIVE)
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

function cariAlamatOtomatis(obj) {
    let alamatDitemukan = null;
    function cari(o) {
        if (!o || typeof o !== 'object') return;
        if (o.districts && Array.isArray(o.districts) && o.districts.length > 0) {
            alamatDitemukan = o.districts;
            return;
        }
        if (o.full_address && typeof o.full_address === 'string' && o.full_address !== "") {
            alamatDitemukan = o.full_address;
            return;
        }
        for (let key in o) {
            if (alamatDitemukan) return; 
            if (Object.prototype.hasOwnProperty.call(o, key)) cari(o[key]);
        }
    }
    cari(obj);
    if (Array.isArray(alamatDitemukan)) {
        const validDistricts = alamatDitemukan.map(d => d.name).filter(name => name && !name.includes('*'));
        if (validDistricts.length > 0) return validDistricts.slice(0, 2).reverse().join(", ") + ", Indonesia";
    } else if (typeof alamatDitemukan === 'string') {
        return alamatDitemukan;
    }
    return "Alamat disensor API";
}

// ==============================================================================
// FUNGSI MEMPROSES DATA PESANAN (MENGEMBALIKAN STRING AGAR TERMINAL RAPI)
// ==============================================================================
async function prosesDataPesanan(orderData, headers, sellerId, urutanKe, namaPembeli) {
    const orderId = orderData.main_order_id;
    let hasilLog = `🆔 [${urutanKe}] ${orderId} | 👤 ${namaPembeli}\n`;
    
    const urlKeuangan = `https://seller-id.tokopedia.com/api/v1/pay/statement/order/list?locale=id-ID&from=0&no_need_sku_record=true&page_type=10&pagination_type=1&size=5&terminal_type=1&reference_id=${orderId}&statement_version=0&settlement_status=1&need_total_amount=true&oec_seller_id=${sellerId}&seller_id=${sellerId}`;

    try {
        let dataKeuangan = null;
        try {
            const responseKeuangan = await fetch(urlKeuangan, { method: 'GET', headers: headers });
            if (responseKeuangan.ok) {
                const jsonKeuangan = await responseKeuangan.json();
                if (jsonKeuangan.code === 0) dataKeuangan = jsonKeuangan.data;
            }
        } catch (errKeuangan) {
            // Abaikan error keuangan
        }

        const tradeModule = orderData.trade_order_module || {};
        const payMethod = tradeModule.pay_method || "N/A";
        const isCOD = ["bayar di tempat", "cod"].includes(payMethod.toLowerCase());
        const statusPesanan = isCOD ? "Pembeli memesan (COD)" : "Pesanan sudah dibayar";

        let labelWaktu = isCOD ? "Tgl Dibuat " : "Tgl Dibayar";
        let waktuTampil = "-";
        let rawTime = isCOD ? (orderData.create_time || tradeModule.create_time) : (orderData.payment_time || tradeModule.payment_time || orderData.update_time || tradeModule.update_time || orderData.create_time);

        if (rawTime) {
            const ms = String(rawTime).length <= 11 ? Number(rawTime) * 1000 : Number(rawTime);
            waktuTampil = new Date(ms).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'medium' });
        }
        
        const alamatLengkap = cariAlamatOtomatis(orderData);
        const skuModule = orderData.sku_module || [];
        const produkList = [];
        let afiliator = "Bukan dari Live/Afiliator";
        
        for (const sku of skuModule) {
            produkList.push({ nama: sku.product_name || "Nama Produk Tidak Diketahui", variasi: sku.sku_name || "-", qty: sku.quantity || 1 });
            const creatorItems = sku.creator_info_name?.items || [];
            for (const cItem of creatorItems) {
                if (cItem.message_content?.includes("Penerima komisi:")) {
                    afiliator = cItem.message_content.replace("Penerima komisi:", "").trim();
                }
            }
        }

        const trackingNo = cariResiOtomatis(orderData) || "Belum dicetak / Belum ada resi";
        const noteModule = orderData.note_module || {};
        const buyerNote = noteModule.has_buyer_note ? (noteModule.buyer_note || "-") : "-";
        const sellerNote = noteModule.seller_note_value?.note_text || noteModule.seller_note || "-";

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

        // Susun string rapi
        hasilLog += `    └─ 🚚 No. Resi   : ${trackingNo}\n`;
        hasilLog += `    └─ 🕒 ${labelWaktu}: ${waktuTampil}\n`;
        hasilLog += `    └─ 💳 Pembayaran : ${payMethod} (${statusPesanan})\n`;
        hasilLog += `    └─ 📍 Alamat     : ${alamatLengkap}\n`;
        hasilLog += `    └─ 🎥 Afiliator  : ${afiliator}\n`;
        hasilLog += `    └─ 📝 Chat. Buyer: ${buyerNote}\n`;
        hasilLog += `    └─ 📝 Chat. Penj.: ${sellerNote}\n`;
        hasilLog += `    └─ 💰 Penghasilan: ${perkiraanPenghasilan}\n`;
        hasilLog += `    └─ 📉 Biaya (Fee): ${perkiraanBiaya}\n`;
        hasilLog += `    └─ 📊 PPN (Fee) %: ${persenPpn}\n`;
        hasilLog += `    └─ 💵 Penyelesaian: ${penyelesaianPembayaran}\n`;
        
        for (let i = 0; i < produkList.length; i++) {
            const p = produkList[i];
            hasilLog += `    └─ 📦 Produk ${i + 1}   : ${p.nama}\n`;
            hasilLog += `       ├─ Variasi    : ${p.variasi}\n`;
            hasilLog += `       └─ Jumlah     : ${p.qty}\n`;
        }
        hasilLog += "-".repeat(60);
        
        return hasilLog;
    } catch (error) {
        return `🆔 [${urutanKe}] ${orderId}\n    └─ ❌ Error memproses data: ${error.message}\n` + "-".repeat(60);
    }
}

// ==============================================================================
// FUNGSI UTAMA: PAGINATION + BATCH CONCURRENCY ULTRA FAST
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
            "referer": "https://seller-id.tokopedia.com/order?order_status[]=3&selected_sort=6&tab=shipping"
        };

        const urlList = `https://seller-id.tokopedia.com/api/fulfillment/order/list?aid=4068&locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}`;
        
        let offsetData = 0;
        const batasPerHalaman = 20; 
        const chunkSize = 20; // Hajar 20 pesanan sekaligus dalam 1 gelombang!
        let lanjutTarikHalaman = true;
        let totalPesananTokoIni = 0;
        let halamanKe = 1;

        while (lanjutTarikHalaman) {
            console.log(`\n🔄 Menarik Halaman ${halamanKe} (Pesanan ke-${offsetData + 1} s/d ${offsetData + batasPerHalaman})...`);
            
            const payload = {
                count: batasPerHalaman, 
                offset: offsetData,     
                pagination_type: 0,
                sort_info: "6",
                search_condition: { condition_list: { search_tab: { value: ["102"] } } },
                search_cursor: ""
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
                        if (halamanKe === 1) console.log("Tidak ada pesanan berstatus Dikirim.\n");
                        lanjutTarikHalaman = false; 
                        break; 
                    }

                    for (let i = 0; i < orderList.length; i += chunkSize) {
                        const chunk = orderList.slice(i, i + chunkSize);
                        
                        // Mengeksekusi seluruh isi halaman secara serentak
                        const promises = chunk.map((order, index) => {
                            const urutanKe = totalPesananTokoIni + i + index + 1;
                            const pembeli = order.buyer_info_module?.buyer_nickname || "NN";
                            return prosesDataPesanan(order, headers, store.seller_id, urutanKe, pembeli);
                        });

                        const hasilBatch = await Promise.all(promises);
                        
                        // Mencetak hasil ke layar secara instan dan berurutan
                        hasilBatch.forEach(hasilPrint => {
                            if (hasilPrint) console.log(hasilPrint);
                        });
                    }

                    totalPesananTokoIni += orderList.length;

                    if (orderList.length < batasPerHalaman) {
                        lanjutTarikHalaman = false;
                    } else {
                        offsetData += batasPerHalaman;
                        halamanKe++;
                        
                        // Jeda ultra-singkat antar halaman (hanya 0.5 detik)
                        await jeda(500); 
                    }

                } else {
                    console.log(`❌ Error API Tokopedia (Kode: ${data.code}): ${data.message}`);
                    lanjutTarikHalaman = false; 
                }
            } catch (error) {
                console.log(`❌ Koneksi gagal saat menarik Halaman ${halamanKe}: ${error.message}`);
                lanjutTarikHalaman = false;
            }
        }
        
        console.log(`✅ Selesai memeriksa ${store.nama_toko}. Total ditarik: ${totalPesananTokoIni} pesanan (Dikirim).\n`); 
    }
    
    console.log("🎉 Pengecekan seluruh toko selesai!");
}

cekSemuaToko();