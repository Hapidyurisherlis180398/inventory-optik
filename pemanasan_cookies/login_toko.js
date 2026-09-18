const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth); // 💥 MENGAKTIFKAN MODE SILUMAN TINGKAT DEWA

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WARNA_MERAH = '\x1b[31m'; const WARNA_HIJAU = '\x1b[32m'; const WARNA_KUNING = '\x1b[33m'; const RESET_WARNA = '\x1b[0m';
const SUPABASE_URL = 'https://lymewxughzatlbsixfex.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uoiQT2GADE5URKyquF6r1w_HdyvgLVg'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const jeda = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const tanyaUser = (pertanyaan) => new Promise(resolve => rl.question(pertanyaan, resolve));

const USER_AGENT_SAKTI = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

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

async function pengecekanAwalAPI() {
    console.log(`\n⚡ Melakukan Pengecekan API Cepat untuk memastikan status terbaru...`);
    const { data: stores } = await supabase.from('data_toko').select('nama_toko, seller_id, cookies');
    if (!stores || stores.length === 0) return;

    for (const store of stores) {
        const strCookie = formatCookiesForHeader(store.cookies);
        if (!strCookie) { await updateDatabase(store.seller_id, "MATI"); continue; }

        const headers = { "cookie": strCookie, "user-agent": USER_AGENT_SAKTI, "content-type": "application/json", "origin": "https://seller-id.tokopedia.com", "referer": "https://seller-id.tokopedia.com/" };
        const urlInfo = `https://seller-id.tokopedia.com/api/v2/insights/seller/shop/info?locale=id-ID&oec_seller_id=${store.seller_id}&seller_id=${store.seller_id}&aid=4068`;
        try {
            const response = await fetch(urlInfo, { method: 'POST', headers, body: JSON.stringify({ request: { stats_types: [1, 2] } }) });
            if (response.ok) {
                const data = await response.json();
                if (data.code === 0) await updateDatabase(store.seller_id, "HIDUP"); else await updateDatabase(store.seller_id, "MATI");
            } else { await updateDatabase(store.seller_id, "MATI"); }
        } catch (error) {}
    }
}

async function loginManual() {
    console.log(`\n========================================================\n🔑 ALAT BANTU LOGIN TOKO (MANUAL SELECTION)\n========================================================`);
    await pengecekanAwalAPI();

    const { data: stores, error } = await supabase.from('data_toko').select('*').order('nama_toko', { ascending: true });
    if (error || !stores || stores.length === 0) { console.log(`❌ Gagal mengambil data.`); rl.close(); return; }

    console.log(`📋 DAFTAR TOKO TERSEDIA (STATUS REAL-TIME):`);
    stores.forEach((store, index) => {
        let iconStatus = '⚪'; let warnaTeks = RESET_WARNA;
        if (store.status_cookie === 'HIDUP') { iconStatus = '🟢'; warnaTeks = WARNA_HIJAU; } 
        else if (store.status_cookie === 'MATI') { iconStatus = '🔴'; warnaTeks = WARNA_MERAH; } 
        else { warnaTeks = WARNA_KUNING; }
        console.log(`  [${index + 1}] ${warnaTeks}${store.nama_toko} ${iconStatus} (${store.status_cookie || 'Belum Dicek'})${RESET_WARNA}`);
    });

    const jawaban = await tanyaUser(`\n👉 Masukkan nomor toko yang ingin di-login (0 - ${stores.length}): `);
    const pilihan = parseInt(jawaban);
    if (pilihan === 0 || isNaN(pilihan) || pilihan < 1 || pilihan > stores.length) { rl.close(); return; }

    const store = stores[pilihan - 1];
    console.log(`\n🚀 MEMBUKA GOOGLE CHROME ASLI UNTUK TOKO: ${store.nama_toko}`);
    
    // 💥 MEMAKAI GOOGLE CHROME ASLI + MODE SILUMAN
    const browser = await chromium.launch({ 
        channel: 'chrome', // <-- Menggunakan Chrome di laptopmu, bukan Chromium bawaan
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'] 
    }); 
    
    const context = await browser.newContext({ userAgent: USER_AGENT_SAKTI, viewport: { width: 1280, height: 720 } });

    if (store.cookies && Array.isArray(store.cookies)) {
        try {
            const cleanCookies = store.cookies.map(c => { 
                const { hostOnly, session, storeId, expirationDate, ...rest } = c; 
                if (expirationDate) rest.expires = expirationDate;
                if (rest.sameSite === 'no_restriction') rest.sameSite = 'None';
                return rest; 
            });
            await context.addCookies(cleanCookies);
        } catch (err) {}
    }

    const page = await context.newPage();
    console.log(`   └─ 🌍 Membuka Seller Center TikTok...`);
    
    try {
        await page.goto('https://seller-id.tokopedia.com', { waitUntil: 'domcontentloaded' });
        await jeda(3000);

        if (page.url().includes('login') || page.url().includes('passport')) {
            console.log(`   └─ 🚨 SESI MATI! Silakan Login / Scan QR Code di browser sekarang.`);
            try {
                await page.waitForURL((url) => { return !url.href.toLowerCase().includes('login') && !url.href.toLowerCase().includes('passport'); }, { timeout: 120000 });
                console.log(`   └─ 🎉 Login Berhasil Terdeteksi!`);
            } catch (e) {
                console.log(`   └─ ❌ Waktu tunggu habis / Gagal Login.`); await browser.close(); rl.close(); return;
            }
        } else { console.log(`   └─ ✅ Toko ini ternyata masih HIDUP.`); }

        console.log(`   └─ 🔄 Melakukan REFRESH (Reload) 1 kali...`);
        await page.reload({ waitUntil: 'domcontentloaded' }); await jeda(5000);

        console.log(`   └─ ⏳ Menunggu 2 MENIT agar token (_abck, DID) ter-generate sempurna...`);
        process.stdout.write(`   └─ 🏃‍♂️ Melakukan Scroll Otomatis: `);
        
        for (let i = 1; i <= 12; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * Math.random()));
            await jeda(10000); process.stdout.write(`.`); 
        }
        
        console.log(`\n   └─ ✅ Waktu tunggu 2 menit selesai!`);
        await updateDatabase(store.seller_id, "HIDUP", await context.cookies());
        console.log(`   └─ 💾 Cookies JSON Sempurna (Full Token) tersimpan ke Supabase!`);

    } catch (error) { console.log(`   └─ ❌ Error jaringan: ${error.message}`); }

    console.log(`   └─ 🚪 Menutup browser...`);
    await browser.close(); rl.close(); console.log(`\n🎉 Proses Selesai!\n`);
}
loginManual();