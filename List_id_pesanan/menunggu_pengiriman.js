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

function cariKurirOtomatis(obj) {
    let kurir = { nama: "Tidak tersedia", hp: "-" };
    let ketemu = false;
    function cari(o) {
        if (!o || typeof o !== 'object' || ketemu) return;
        if (o.contact_info && (o.contact_info.courier_name || o.contact_info.courier_contact_number)) {
            kurir.nama = o.contact_info.courier_name || "Tidak tersedia";
            kurir.hp = o.contact_info.courier_contact_number || "-";
            ketemu = true;
            return;
        }
        for (let key in o) {
            if (ketemu) return;
            if (Object.prototype.hasOwnProperty.call(o, key)) cari(o[key]);
        }
    }
    cari(obj);
    return kurir;
}

function cariStatusMenunggu(obj) {
    let ketemu = false;
    function cari(o) {
        if (!o || typeof o !== 'object' || ketemu) return;
        for (let key in o) {
            if (ketemu) return;
            if (typeof o[key] === 'string' && o[key].includes("Untuk paket dengan opsi pick-up")) {
                ketemu = true;
                return;
            } else if (typeof o[key] === 'object') {
                cari(o[key]);
            }
        }
    }
    cari(obj);
    return ketemu ? "Menunggu Pengiriman" : "Diproses";
}

// ==============================================================================
// FUNGSI MEMPROSES DATA PESANAN DARI 4 API SEKALIGUS
// ==============================================================================
async function prosesDataPesanan(orderData, headers, sellerId, urutanKe, namaPembeliAwal) {
    const orderId = orderData.main_order_id;
    let hasilLog = "";
    
    // 4 URL TARGET API
    const urlDetail = `https://seller-id.tokopedia.com/api/fulfillment/order/get?aid=4068&locale=id-ID&oec_seller_id=${sellerId}&seller_id=${sellerId}`;
    const payloadDetail = { main_order_id: [String(orderId)] };
    
    const urlKeuangan = `https://seller-id.tokopedia.com/api/v1/pay/statement/order/list?locale=id-ID&from=0&no_need_sku_record=true&page_type=10&pagination_type=1&size=5&terminal_type=1&reference_id=${orderId}&statement_version=0&need_total_amount=true&oec_seller_id=${sellerId}&seller_id=${sellerId}`;
    
    const urlLogistik = `https://seller-id.tokopedia.com/api/v1/fulfillment/logistic_detail/list?locale=id-ID&language=id&oec_seller_id=${sellerId}&seller_id=${sellerId}&aid=4068&main_order_id=${orderId}`;
    
    // API BARU: Untuk menarik Username Asli tanpa sensor bintang
    const urlKontakPembeli = `https://seller-id.tokopedia.com/api/fulfillment/orders/buyer_contact_info/get?locale=id-ID&oec_seller_id=${sellerId}&seller_id=${sellerId}&aid=4068`;
    const payloadKontak = { main_order_id: String(orderId), contact_info_type: 3 };

    try {
        let dataDetail = null;
        let dataKeuangan = null;
        let dataLogistik = null;
        let usernameAsli = null; // Menyimpan username tanpa sensor

        try {
            // EKSEKUSI 4 API SEKALIGUS (PARALEL)
            const [resDetail, resKeuangan, resLogistik, resKontak] = await Promise.all([
                fetch(urlDetail, { method: 'POST', headers: headers, body: JSON.stringify(payloadDetail) }),
                fetch(urlKeuangan, { method: 'GET', headers: headers }),
                fetch(urlLogistik, { method: 'GET', headers: headers }),
                fetch(urlKontakPembeli, { method: 'POST', headers: headers, body: JSON.stringify(payloadKontak) })
            ]);

            if (resDetail.ok) {
                const jsonDetail = await resDetail.json();
                if (jsonDetail.code === 0 && jsonDetail.data?.main_order?.length > 0) {
                    dataDetail = jsonDetail.data.main_order[0]; 
                }
            }
            if (resKeuangan.ok) {
                const jsonKeuangan = await resKeuangan.json();
                if (jsonKeuangan.code === 0) dataKeuangan = jsonKeuangan.data;
            }
            if (resLogistik.ok) {
                const jsonLogistik = await resLogistik.json();
                if (jsonLogistik.code === 0) dataLogistik = jsonLogistik.data;
            }
            if (resKontak.ok) {
                const jsonKontak = await resKontak.json();
                // Mengambil nilai plain_text_nickname
                if (jsonKontak.code === 0 && jsonKontak.data?.plain_text_nickname) {
                    usernameAsli = jsonKontak.data.plain_text_nickname;
                }
            }
        } catch (errFetch) {
            // Abaikan error jaringan parsial
        }

        const sumberData = dataDetail || orderData;

        // PENENTUAN USERNAME (Gunakan yang asli jika dapat, jika tidak pakai bawaan list)
        const finalUsername = usernameAsli || namaPembeliAwal || "NN";
        
        // Memulai Header Log dengan Username Asli
        hasilLog = `🆔 [${urutanKe}] ${orderId} | 👤 ${finalUsername}\n`;

        const tradeModule = sumberData.trade_order_module || {};
        const payMethod = tradeModule.pay_method || "N/A";
        const isCOD = ["bayar di tempat", "cod"].includes(payMethod.toLowerCase());
        const statusPembayaran = isCOD ? "Pembeli memesan (COD)" : "Pesanan sudah dibayar";

        let labelWaktu = isCOD ? "Tgl Dibuat " : "Tgl Dibayar";
        let waktuTampil = "-";
        let rawTime = isCOD ? (sumberData.create_time || tradeModule.create_time) : (sumberData.payment_time || tradeModule.payment_time || sumberData.update_time || tradeModule.update_time || sumberData.create_time);

        if (rawTime) {
            const ms = String(rawTime).length <= 11 ? Number(rawTime) * 1000 : Number(rawTime);
            waktuTampil = new Date(ms).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'medium' });
        }
        
        const alamatLengkap = cariAlamatOtomatis(sumberData);
        const skuModule = sumberData.sku_module || [];
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

        const trackingNo = cariResiOtomatis(sumberData) || "Belum dicetak";
        const noteModule = sumberData.note_module || {};
        const buyerNote = noteModule.has_buyer_note ? (noteModule.buyer_note || "-") : "-";
        const sellerNote = noteModule.seller_note_value?.note_text || noteModule.seller_note || "-";
        
        const infoKurir = cariKurirOtomatis(dataLogistik);
        const statusPesananInfo = cariStatusMenunggu(sumberData);

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
        hasilLog += `    └─ 📌 Status     : ${statusPesananInfo}\n`;
        hasilLog += `    └─ 🚚 No. Resi   : ${trackingNo}\n`;
        hasilLog += `    └─ 🛵 Kurir      : ${infoKurir.nama} (Hub: ${infoKurir.hp})\n`;
        hasilLog += `    └─ 🕒 ${labelWaktu}: ${waktuTampil}\n`;
        hasilLog += `    └─ 💳 Pembayaran : ${payMethod} (${statusPembayaran})\n`;
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
            "referer": "https://seller-id.tokopedia.com/order?order_status[]=1&selected_sort=11&tab=to_ship"
        };

        const urlList = `https://seller-id.tokopedia.com/api/fulfillment/order/list?aid=4068&locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}`;
        
        let offsetData = 0;
        const batasPerHalaman = 20; 
        
        // DITURUNKAN KE 5: Karena tiap pesanan menembak 4 API.
        // 5 pesanan x 4 API = 20 Request Serentak. Ini batas paling aman & optimal.
        const chunkSize = 1; 
        let lanjutTarikHalaman = true;
        let totalPesananTokoIni = 0;
        let halamanKe = 1;

        while (lanjutTarikHalaman) {
            console.log(`\n🔄 Menarik Halaman ${halamanKe} (Pesanan ke-${offsetData + 1} s/d ${offsetData + batasPerHalaman})...`);
            
            const payload = {
                search_condition: {
                    condition_list: {
                        order_status: { value: ["2"] },
                        search_tab: { value: ["101"] }
                    }
                },
                offset: offsetData,
                count: batasPerHalaman,
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
                        if (halamanKe === 1) console.log("Tidak ada pesanan Menunggu Pengiriman.\n");
                        lanjutTarikHalaman = false; 
                        break; 
                    }

                    for (let i = 0; i < orderList.length; i += chunkSize) {
                        const chunk = orderList.slice(i, i + chunkSize);
                        
                        const promises = chunk.map((order, index) => {
                            const urutanKe = totalPesananTokoIni + i + index + 1;
                            const pembeliMasked = order.buyer_info_module?.buyer_nickname || "NN";
                            return prosesDataPesanan(order, headers, store.seller_id, urutanKe, pembeliMasked);
                        });

                        const hasilBatch = await Promise.all(promises);
                        
                        hasilBatch.forEach(hasilPrint => {
                            if (hasilPrint) console.log(hasilPrint);
                        });
                        
                        await jeda(400); // Jeda kecil antar chunk
                    }

                    totalPesananTokoIni += orderList.length;

                    if (orderList.length < batasPerHalaman) {
                        lanjutTarikHalaman = false;
                    } else {
                        offsetData += batasPerHalaman;
                        halamanKe++;
                        await jeda(800); 
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
        
        console.log(`✅ Selesai memeriksa ${store.nama_toko}. Total ditarik: ${totalPesananTokoIni} pesanan (Menunggu Pengiriman).\n`); 
    }
    
    console.log("🎉 Pengecekan seluruh toko selesai!");
}

cekSemuaToko();