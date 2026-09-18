const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth); 

const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// KONFIGURASI SUPABASE
const SUPABASE_URL = 'https://lymewxughzatlbsixfex.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uoiQT2GADE5URKyquF6r1w_HdyvgLVg'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const jeda = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const USER_AGENT_SAKTI = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

function acakAngka(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function formatCookiesForHeader(cookiesArray) {
    if (!cookiesArray || !Array.isArray(cookiesArray)) return null;
    try { return cookiesArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; '); } catch (e) { return null; }
}

function formatToCookieEditorStyle(playwrightCookies) {
    if (!playwrightCookies || !Array.isArray(playwrightCookies)) return [];
    return playwrightCookies.map(c => {
        let sameSiteVal = null;
        if (c.sameSite) {
            const ss = c.sameSite.toLowerCase();
            if (ss === 'none') sameSiteVal = 'no_restriction'; else if (ss === 'lax') sameSiteVal = 'lax'; else if (ss === 'strict') sameSiteVal = 'strict';
        }
        const isSession = c.expires === -1;
        const editorCookie = {
            domain: c.domain, expirationDate: isSession ? undefined : c.expires, hostOnly: c.domain ? !c.domain.startsWith('.') : false,
            httpOnly: c.httpOnly || false, name: c.name, path: c.path, sameSite: sameSiteVal, secure: c.secure || false, session: isSession, storeId: null, value: c.value
        };
        if (isSession) delete editorCookie.expirationDate;
        return editorCookie;
    });
}

async function updateDatabase(sellerId, status, rawPlaywrightCookies = null) {
    const now = new Date();
    const waktuSekarang = new Date(now.getTime() + (7 * 60 * 60 * 1000)).toISOString().replace('T', ' ').slice(0, 19);
    let payload = { status_cookie: status, terakhir_update: waktuSekarang };
    if (rawPlaywrightCookies) payload.cookies = formatToCookieEditorStyle(rawPlaywrightCookies);
    await supabase.from('data_toko').update(payload).eq('seller_id', sellerId);
}

// ==============================================================================
// 1. MESIN API
// ==============================================================================
async function pemanasanAPI() {
    console.log(`\n⚡ [${new Date().toLocaleTimeString('id-ID')}] MESIN 1: PEMANASAN API DIMULAI...`);
    const { data: stores } = await supabase.from('data_toko').select('*');
    if (!stores || stores.length === 0) return;

    for (const store of stores) {
        const strCookie = formatCookiesForHeader(store.cookies);
        if (!strCookie) continue;

        const headers = { "cookie": strCookie, "user-agent": USER_AGENT_SAKTI, "content-type": "application/json", "origin": "https://seller-id.tokopedia.com", "referer": "https://seller-id.tokopedia.com/" };
        const urlInfo = `https://seller-id.tokopedia.com/api/v2/insights/seller/shop/info?locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}&aid=4068`;
        
        try {
            const response = await fetch(urlInfo, { method: 'POST', headers, body: JSON.stringify({ request: { stats_types: [1, 2] } }) });
            if (response.ok) {
                const data = await response.json();
                if (data.code === 0) { console.log(`   └─ 🟢 [API] ${store.nama_toko}: HIDUP`); await updateDatabase(store.seller_id, "HIDUP"); } 
                else { console.log(`   └─ 🔴 [API] ${store.nama_toko}: MATI (Kode: ${data.code})`); await updateDatabase(store.seller_id, "MATI"); }
            } else { console.log(`   └─ 🔴 [API] ${store.nama_toko}: MATI (HTTP ${response.status})`); await updateDatabase(store.seller_id, "MATI"); }
        } catch (error) { console.log(`   └─ ❌ [API] ${store.nama_toko}: Gagal Koneksi`); }
        await jeda(2000);
    }
}

// ==============================================================================
// 2. MESIN CHROMIUM (OMNIVORA COOKIES)
// ==============================================================================
async function pemanasanChromium() {
    console.log(`\n👻 [${new Date().toLocaleTimeString('id-ID')}] MESIN 2: PEMANASAN CHROME ASLI DIMULAI...`);
    const { data: stores } = await supabase.from('data_toko').select('*').eq('status_cookie', 'HIDUP');
    if (!stores || stores.length === 0) return;

    const browser = await chromium.launch({ 
        channel: 'chrome', 
        headless: false, 
        args: ['--disable-blink-features=AutomationControlled'] 
    }); 

    for (const store of stores) {
        console.log(`   └─ 🤖 [CHROMIUM] Menganalisis ${store.nama_toko}...`);
        const context = await browser.newContext({ userAgent: USER_AGENT_SAKTI, viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        // 💥 TRIK ROBOTS.TXT
        console.log(`      └─ 🌍 Membuka domain dasar untuk berpijak...`);
        try { await page.goto('https://seller-id.tokopedia.com/robots.txt', { waitUntil: 'domcontentloaded' }); } catch(e) {}

        // 💥 LOGIKA COOKIES OMNIVORA
        if (store.cookies && Array.isArray(store.cookies)) {
            console.log(`      └─ 💉 Menyuntikkan cookies dari database...`);
            try {
                const cleanCookies = store.cookies.map(c => { 
                    const { hostOnly, session, storeId, expirationDate, ...rest } = c; 
                    if (expirationDate) rest.expires = expirationDate;
                    
                    if (rest.sameSite) {
                        const sL = rest.sameSite.toLowerCase();
                        if (sL === 'no_restriction' || sL === 'none') rest.sameSite = 'None';
                        else if (sL === 'lax') rest.sameSite = 'Lax';
                        else if (sL === 'strict') rest.sameSite = 'Strict';
                        else delete rest.sameSite;
                    } else {
                        delete rest.sameSite;
                    }
                    return rest; 
                });
                await context.addCookies(cleanCookies);
            } catch (err) { console.log(`      └─ ⚠️ Gagal memformat cookies: ${err.message}`); }
        }

        try {
            await page.goto('https://seller-id.tokopedia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await jeda(3000);

            const currentUrl = page.url().toLowerCase();
            if (currentUrl.includes('login') || currentUrl.includes('passport')) {
                console.log(`      └─ 🔴 Tiba-tiba disuruh login. Mengubah status jadi MATI.`);
                await updateDatabase(store.seller_id, "MATI");
            } else {
                console.log(`      └─ ✅ Masih Login! Injeksi Cookies Berhasil!`);
                console.log(`      └─ 🔄 Melakukan REFRESH (Reload) 1 kali...`);
                await page.reload({ waitUntil: 'domcontentloaded' }); await jeda(5000);

                console.log(`      └─ ⏳ Menunggu 2 MENIT agar token (_abck, DID) ter-generate sempurna...`);
                process.stdout.write(`      └─ 🏃‍♂️ Melakukan Scroll Otomatis: `);
                
                for (let i = 1; i <= 12; i++) {
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * Math.random()));
                    await jeda(10000); process.stdout.write(`.`); 
                }
                
                console.log(`\n      └─ 🟢 Selesai. Cookies terbaru telah dicadangkan ke database.`);
                await updateDatabase(store.seller_id, "HIDUP", await context.cookies());
            }
        } catch (error) { console.log(`      └─ ❌ Error di browser: ${error.message}`); }
        
        await context.close(); await jeda(3000);
    }
    await browser.close();
}

async function loopJadwalAPI() {
    await pemanasanAPI();
    const jedaDetik = acakAngka(180, 300);
    console.log(`⏳ [INFO] Pemanasan API berikutnya dalam ${(jedaDetik / 60).toFixed(2)} menit...`);
    setTimeout(loopJadwalAPI, jedaDetik * 1000);
}

async function loopJadwalChromium() {
    await pemanasanChromium();
    const jedaMenit = acakAngka(60, 120);
    console.log(`⏳ [INFO] Pemanasan Chrome berikutnya dalam ${jedaMenit} menit...`);
    setTimeout(loopJadwalChromium, jedaMenit * 60 * 1000);
}

console.log("🚀 SCRIPT PEMANASAN GANDA AKTIF DENGAN WAKTU ACAK & STEALTH MODE (CHROME ASLI)!");
loopJadwalAPI();
setTimeout(loopJadwalChromium, 10000);