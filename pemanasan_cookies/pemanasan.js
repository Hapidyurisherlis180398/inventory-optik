const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Mengabaikan peringatan SSL/TLS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ==============================================================================
// KONFIGURASI SUPABASE
// ==============================================================================
const SUPABASE_URL = 'https://lymewxughzatlbsixfex.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uoiQT2GADE5URKyquF6r1w_HdyvgLVg'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function formatCookies(cookiesArray) {
    if (!cookiesArray || !Array.isArray(cookiesArray)) return null;
    try {
        return cookiesArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    } catch (error) {
        return null;
    }
}

// ==============================================================================
// FUNGSI UPDATE STATUS KE SUPABASE (SUDAH DISESUAIKAN KE WIB / ASIA/JAKARTA)
// ==============================================================================
async function updateStatusDatabase(sellerId, status) {
    const now = new Date();
    // Tambahkan 7 jam (WIB adalah UTC+7)
    const offsetWIB = 7 * 60 * 60 * 1000; 
    const waktuWIB = new Date(now.getTime() + offsetWIB);
    
    // Potong formatnya agar menjadi bersih: YYYY-MM-DD HH:mm:ss
    const waktuSekarang = waktuWIB.toISOString().replace('T', ' ').slice(0, 19);
    
    const { error } = await supabase
        .from('data_toko')
        .update({ 
            status_cookie: status, 
            terakhir_update: waktuSekarang 
        })
        .eq('seller_id', sellerId);

    if (error) {
        console.log(`   └─ ⚠️ Gagal update status database: ${error.message}`);
    } else {
        console.log(`   └─ 💾 Database Supabase di-update: ${status}`);
    }
}

// ==============================================================================
// FUNGSI PEMANASAN (KEEP-ALIVE)
// ==============================================================================
async function lakukanPemanasan() {
    const waktuSekarang = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`\n🔥 [${waktuSekarang}] MEMULAI PROSES PEMANASAN (KEEP-ALIVE) TOKO...`);
    
    const { data: stores, error } = await supabase.from('data_toko').select('*');

    if (error || !stores || stores.length === 0) {
        console.error("❌ Gagal mengambil data toko untuk pemanasan.");
        return;
    }

    for (const store of stores) {
        const formattedCookie = formatCookies(store.cookies);
        if (!formattedCookie) {
            console.log(`⚠️ [${store.nama_toko}] Cookies kosong! Menandai sebagai MATI di database.`);
            await updateStatusDatabase(store.seller_id, "MATI");
            continue;
        }

        const headers = {
            "cookie": formattedCookie,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
            "content-type": "application/json",
            "origin": "https://seller-id.tokopedia.com"
        };

        const urlList = `https://seller-id.tokopedia.com/api/fulfillment/order/list?aid=4068&locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}`;
        // Tembak API dengan beban paling ringan (cukup minta 1 pesanan untuk memancing server)
        const payload = {
            count: 1, 
            offset: 0,
            pagination_type: 0,
            sort_info: "11",
            search_condition: { condition_list: { search_tab: { value: ["101"] } } }
        };

        try {
            const response = await fetch(urlList, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.code === 0) {
                    console.log(`✅ [${store.nama_toko}] Pemanasan sukses! Sesi tetap hidup.`);
                    await updateStatusDatabase(store.seller_id, "HIDUP");
                } else if (data.code === 10000 || data.code === 401) {
                    console.log(`❌ [${store.nama_toko}] COOKIE MATI / KADALUARSA! Perlu login ulang.`);
                    await updateStatusDatabase(store.seller_id, "MATI");
                } else {
                    console.log(`⚠️ [${store.nama_toko}] Respons tidak dikenal (Kode: ${data.code})`);
                }
            } else {
                console.log(`❌ [${store.nama_toko}] Akses HTTP ditolak (Status: ${response.status})`);
                await updateStatusDatabase(store.seller_id, "MATI");
            }
        } catch (error) {
            console.log(`❌ [${store.nama_toko}] Gagal terkoneksi: ${error.message}`);
        }
        
        // Jeda 2 detik antar toko agar server Tokopedia tidak merasa di-spam
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n💤 Pemanasan selesai. Script akan tidur dan menunggu 30 menit lagi...\n`);
}

// ==============================================================================
// PENJADWALAN OTOMATIS (CRON JOB) - SETIAP 30 MENIT
// ==============================================================================
lakukanPemanasan(); // Eksekusi langsung saat script pertama kali dijalankan

cron.schedule('*/30 * * * *', () => {
    lakukanPemanasan();
});

console.log("🚀 SCRIPT PEMANASAN AKTIF & TERHUBUNG KE DATABASE! Biarkan terminal ini terbuka...");