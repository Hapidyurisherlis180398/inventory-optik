const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

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
// FUNGSI UTILITAS FORMATTING EXCEL
// ==============================================================================
const formatColumnName = (key) => {
    return key
        .replace(/[^a-zA-Z0-9]+/g, '_') 
        .replace(/^_+|_+$/g, '')        
        .toLowerCase();                 
};

// ==============================================================================
// FUNGSI UTAMA: EKSPOR, DOWNLOAD, DAN INJECT KE DATABASE
// ==============================================================================
async function prosesDanUploadSemuaToko() {
    console.log("⏳ Mengambil data toko dari database...");
    const { data: stores, error } = await supabase.from('data_toko').select('*');

    if (error || !stores || stores.length === 0) {
        return console.error("❌ Gagal memuat toko:", error ? error.message : "Data kosong");
    }

    console.log(`✅ Berhasil memuat ${stores.length} toko.\n`);

    for (const store of stores) {
        console.log(`================================================================`);
        console.log(`🏪 MEMPROSES TOKO: ${store.nama_toko} (ID: ${store.seller_id})`);
        console.log(`================================================================`);

        const formattedCookie = formatCookies(store.cookies);
        if (!formattedCookie) {
            console.log(`❌ Cookies tidak valid. Skip.\n`);
            continue;
        }

        const headers = {
            "cookie": formattedCookie,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
            "content-type": "application/json",
            "origin": "https://seller-id.tokopedia.com"
        };

        // URL VERSI PENDEK TANPA PARAMETER ANTI-BOT
        const baseURL = `aid=4068&locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}`;
        const urlExport = `https://seller-id.tokopedia.com/api/fulfillment/order/export?${baseURL}`;
        
        const payloadExport = {
            "search_condition": { "condition_list": {} },
            "sort_info": "6",
            "file_name": `Semua_pesanan_${store.nama_toko.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`,
            "file_type": 1
        };
        
        try {
            // ---------------------------------------------------------
            // TAHAP 1: REQUEST EXPORT
            // ---------------------------------------------------------
            console.log("    └─ 1️⃣ Minta server merangkum data (Export)...");
            const responseExport = await fetch(urlExport, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payloadExport)
            });

            const dataExport = await responseExport.json();
            if (dataExport.code !== 0 || !dataExport.data?.file_key) {
                console.log(`    └─ ❌ Gagal Tahap 1 (Kode ${dataExport.code}): ${dataExport.message || 'Respons tidak valid'}`);
                continue;
            }

            const { file_key: fileKey, export_task_id: taskId } = dataExport.data;
            console.log(`    └─ ✅ Tiket Export didapatkan (Task ID: ${taskId})`);
            await jeda(5000); 

            // ---------------------------------------------------------
            // TAHAP 2: POLLING DOWNLOAD URL
            // ---------------------------------------------------------
            let finalUrl = null;
            let percobaanKe = 1;
            const urlDownload = `https://seller-id.tokopedia.com/api/fulfillment/order/download?${baseURL}`;

            while (percobaanKe <= 12 && !finalUrl) {
                console.log(`    └─ 2️⃣ Mengambil link final (Percobaan ${percobaanKe}/12)...`);
                const resDownload = await fetch(urlDownload, {
                    method: 'POST', 
                    headers: headers, 
                    body: JSON.stringify({ file_key: fileKey, export_task_id: taskId })
                });
                
                const dataFinal = await resDownload.json();
                if (dataFinal.code === 0 && dataFinal.data?.download_url) {
                    finalUrl = dataFinal.data.download_url;
                    console.log(`    └─ ✅ Link download didapatkan!`);
                } else {
                    percobaanKe++;
                    await jeda(5000);
                }
            }

            if (!finalUrl) {
                console.log(`    └─ ❌ Timeout: File belum siap setelah dicoba berkali-kali.`);
                continue;
            }

            // ---------------------------------------------------------
            // TAHAP 3: DOWNLOAD BUFFER & PARSING EXCEL KE JSON
            // ---------------------------------------------------------
            console.log("    └─ 3️⃣ Membaca dan memproses file Excel dari cloud...");
            const resFile = await fetch(finalUrl, { 
                method: 'GET', 
                headers: { "user-agent": headers["user-agent"] } 
            });
            
            const buffer = await resFile.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                console.log(`    └─ ⚠️ File kosong, tidak ada pesanan untuk toko ini.`);
                continue;
            }

            // ---------------------------------------------------------
            // TAHAP 4: FORMATTING DATA & FILTERING ANTI-SAMPAH
            // ---------------------------------------------------------
            const uniqueOrders = new Map(); // Menggunakan Map untuk menghapus duplikat internal
            let barisSampah = 0;

            const timeColumns = [
                'created_time', 'paid_time', 'rts_time', 
                'shipped_time', 'delivered_time', 'cancelled_time'
            ];
            
            const numericColumns = [
                'quantity', 'sku_quantity_of_return', 'sku_unit_original_price', 
                'sku_subtotal_before_discount', 'sku_platform_discount', 'sku_seller_discount', 
                'sku_subtotal_after_discount', 'shipping_fee_after_discount', 'original_shipping_fee', 
                'shipping_fee_seller_discount', 'shipping_fee_platform_discount', 'distance_shipping_fee', 
                'distance_fee', 'order_refund_amount', 'payment_platform_discount', 'buyer_service_fee', 
                'handling_fee', 'shipping_insurance', 'item_insurance', 'order_amount', 'weight_kg'
            ];

            for (const row of jsonData) {
                // 1. FILTER GLOBAL: Ubah seluruh baris jadi teks, jika ada kata kunci sampah, buang baris ini
                const barisString = JSON.stringify(row).toLowerCase();
                if (barisString.includes('total distance fee') || barisString.includes('horizon') || barisString.includes('keterangan')) {
                    barisSampah++;
                    continue;
                }

                const newRow = { nama_toko: store.nama_toko };
                let orderIdValue = null;

                Object.keys(row).forEach((key) => {
                    if (key.includes('__EMPTY') || key.toLowerCase().includes('unnamed')) return;
                    const formattedKey = formatColumnName(key);
                    if (!formattedKey || formattedKey.includes('empty')) return;

                    let value = row[key] === '' || row[key] === undefined ? null : row[key];

                    // Ambil nilai order_id untuk validasi
                    if (formattedKey === 'order_id' && value) {
                        orderIdValue = value.toString();
                    }

                    // Format Waktu
                    if (timeColumns.includes(formattedKey) && value) {
                        if (value instanceof Date) {
                            value = value.toISOString();
                        } else if (typeof value === 'string') {
                            const trimmedVal = value.trim();
                            const matchDDMM = trimmedVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(.*))?/);
                            if (matchDDMM) {
                                value = `${matchDDMM[3]}-${matchDDMM[2].padStart(2, '0')}-${matchDDMM[1].padStart(2, '0')} ${matchDDMM[4] || '00:00:00'}`;
                            } else if (trimmedVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                                value = trimmedVal;
                            } else {
                                value = null;
                            }
                        }
                    }

                    // Format Angka
                    if (numericColumns.includes(formattedKey) && value !== null) {
                        const parsedNum = Number(value);
                        value = isNaN(parsedNum) ? null : parsedNum;
                    }

                    newRow[formattedKey] = value;
                });

                // 2. FILTER ORDER ID: Pastikan Order ID ada dan bukan teks "Identifier"
                if (!orderIdValue || orderIdValue.length > 50 || orderIdValue.toLowerCase().includes('identifier')) {
                    barisSampah++;
                    continue;
                }

                // 3. FILTER DUPLIKAT: Map otomatis menimpa data jika ada Order ID yang kembar di file yang sama
                uniqueOrders.set(orderIdValue, newRow);
            }

            // Ubah Map kembali menjadi Array siap upload
            const formattedData = Array.from(uniqueOrders.values());

            // ---------------------------------------------------------
            // TAHAP 5: UPSERT KE SUPABASE DENGAN CHUNKING
            // ---------------------------------------------------------
            console.log(`    └─ 4️⃣ Mengirim ${formattedData.length} baris pesanan valid ke Supabase...`);
            
            const chunkSize = 500;
            let successUpload = 0;

            for (let i = 0; i < formattedData.length; i += chunkSize) {
                const chunk = formattedData.slice(i, i + chunkSize);
                
                const { error: upsertError } = await supabase
                    .from('data_pengiriman')
                    .upsert(chunk, { onConflict: 'order_id' }); 

                if (upsertError) {
                    console.log(`       └─ ❌ Error Upsert: ${upsertError.message}`);
                } else {
                    successUpload += chunk.length;
                }
            }

            console.log(`    └─ ✅ Sukses menyimpan ${successUpload} pesanan dari ${store.nama_toko} (Dibuang ${barisSampah} baris sampah / duplikat)`);
            
        } catch (error) {
            console.log(`    └─ ❌ Kesalahan sistem: ${error.message}`);
        }
        
        await jeda(3000);
    }
    
    console.log("\n🎉 SELURUH PROSES EXPORT & UPLOAD SELESAI!");
}

prosesDanUploadSemuaToko();