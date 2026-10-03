const { createClient } = require('@supabase/supabase-js');

// Mengabaikan peringatan SSL/TLS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

async function ujiTanpaBsid() {
    console.log("⏳ Mengambil data toko dari Supabase...");
    const { data: stores, error } = await supabase.from('data_toko').select('*').limit(1);

    if (error || !stores || stores.length === 0) {
        return console.error("❌ Gagal memuat toko.");
    }

    const store = stores[0];
    const formattedCookie = formatCookies(store.cookies);
    const sellerId = store.seller_id;
    
    // Gunakan salah satu Order ID retur yang ingin dicek
    const orderId = "586113921008436800"; 
    const fpAntiBot = "verify_mufq4hxy_fcKBJdlS_oFiQ_4zOI_AYfs_4T5bbXgtGGxs";

    // URL BERSIH TANPA X-Tts-Oec-Bsid
    const urlLogistikTanpaBsid = `https://seller-id.tokopedia.com/api/v1/fulfillment/logistic_detail/list?locale=id-ID&language=id&oec_seller_id=${sellerId}&seller_id=${sellerId}&aid=4068&app_name=i18n_ecom_shop&fp=${fpAntiBot}&device_platform=web&cookie_enabled=true&screen_width=1280&screen_height=1024&browser_language=en-US&browser_platform=Win32&browser_name=Mozilla&browser_version=5.0%20%28Windows%20NT%2010.0%3B%20Win64%3B%20x64%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F153.0.0.0%20Safari%2F537.36&browser_online=true&timezone_name=Asia%2FJakarta&main_order_id=${orderId}`;

    const headers = {
        "cookie": formattedCookie,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
        "accept": "application/json, text/plain, */*",
        "origin": "https://seller-id.tokopedia.com",
        "referer": "https://seller-id.tokopedia.com/order?order_status[]=5&selected_sort=6&tab=return"
    };

    try {
        console.log(`🚀 Menguji URL tanpa X-Tts-Oec-Bsid untuk Order ID: ${orderId}`);
        const response = await fetch(urlLogistikTanpaBsid, {
            method: 'GET',
            headers: headers
        });

        const result = await response.json();
        console.log("\n📦 HASIL RESPON SERVER:");
        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.log(`❌ Gagal koneksi: ${err.message}`);
    }
}

ujiTanpaBsid();