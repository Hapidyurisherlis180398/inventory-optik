const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ==========================================
// PENGATURAN SUPABASE
// ==========================================
const SUPABASE_URL = 'https://lymewxughzatlbsixfex.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_uoiQT2GADE5URKyquF6r1w_HdyvgLVg'; 
const TABEL_TUJUAN = 'data_orderan_semua_toko_tiktok'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { enabled: false }
});

// ==========================================
// DAFTAR URL YANG AKAN DICEK
// ==========================================
const DAFTAR_URL_CEK = [
  'https://seller-id.tokopedia.com/order?order_status[]=2&selected_sort=11&tab=to_ship', // Status 2 (Perlu Dikirim)
  'https://seller-id.tokopedia.com/order?order_status[]=1&selected_sort=11&tab=to_ship'  // Status 1 (Menunggu Pembayaran/Diproses)
];

// Fungsi untuk menjalankan bot per satu toko secara paralel
async function jalankanBotToko(namaToko, cookieFileName) {
  console.log(`[${namaToko}] Menyiapkan Mesin Automasi Crawler Chrome...`);
  
  const browser = await chromium.launch({ headless: false }); 
  const context = await browser.newContext();

  try {
    let cookiesPath = path.join(__dirname, '../cookies', cookieFileName);
    if (!fs.existsSync(cookiesPath)) {
      cookiesPath = path.join(__dirname, '..', cookieFileName); 
    }

    if (!fs.existsSync(cookiesPath)) {
      console.log(`❌ [${namaToko}] File cookies '${cookieFileName}' tidak ditemukan!`);
      await browser.close();
      return;
    }

    const cookiesString = fs.readFileSync(cookiesPath, 'utf8');
    let rawCookies = JSON.parse(cookiesString);

    const validCookies = rawCookies.map(c => {
      const { hostOnly, session, storeId, id, sameSite, ...rest } = c;
      if (sameSite !== null && sameSite !== undefined) {
        const lower = String(sameSite).toLowerCase();
        if (lower === 'no_restriction' || lower === 'none') rest.sameSite = 'None';
        else if (lower === 'lax') rest.sameSite = 'Lax';
        else if (lower === 'strict') rest.sameSite = 'Strict';
      }
      return rest;
    });

    await context.addCookies(validCookies);
    console.log(`✅ [${namaToko}] Cookies berhasil dimasukkan!`);

    const page = await context.newPage();
    const pesananSudahDiproses = new Set();
    console.log(`🚀 [${namaToko}] Sistem CRAWLER & SUPABASE dimulai untuk tabel: ${TABEL_TUJUAN}...`);
    
    while (true) {
      // Loop untuk mengecek setiap URL secara bergantian
      for (const targetUrl of DAFTAR_URL_CEK) {
        let statusOrder = targetUrl.includes('status[]=2') ? 'Status 2 (Perlu Dikirim)' : 'Status 1 (Menunggu/Diproses)';
        console.log(`\n⏳ [${namaToko}] [${new Date().toLocaleTimeString('id-ID')}] Mengecek pesanan di: ${statusOrder}`);
        
        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForSelector('table[data-table-component="true"] tbody tr', { timeout: 15000 });
        } catch (e) {
          console.log(`⚠️ [${namaToko}] Halaman ${statusOrder} belum siap atau kosong, lanjut ke tahap berikutnya...`);
          continue; // Lanjut ke URL berikutnya jika gagal/kosong
        }

        const daftarOrderMentah = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/order/detail?order_no="]'));
          return links.map(a => {
            const href = a.getAttribute('href');
            const urlParams = new URLSearchParams(href.split('?')[1]);
            return {
              link: href,
              order_id: urlParams.get('order_no') || '-'
            };
          });
        });

        const semuaLinkPesanan = [];
        const seenIds = new Set();
        for (const item of daftarOrderMentah) {
          if (!seenIds.has(item.order_id) && item.order_id !== '-') {
            seenIds.add(item.order_id);
            semuaLinkPesanan.push(item);
          }
        }

        const linkBaru = semuaLinkPesanan.filter(item => !pesananSudahDiproses.has(item.link));

        if (linkBaru.length > 0) {
          console.log(`🔎 [${namaToko}] Menemukan ${linkBaru.length} pesanan di ${statusOrder}. Memeriksa database...`);
          let totalTerkirimSesiIni = 0;

          for (let i = 0; i < linkBaru.length; i++) {
            const { link: detailLink, order_id } = linkBaru[i];

            const { data: existing } = await supabase
              .from(TABEL_TUJUAN)
              .select('id')
              .eq('order_id', order_id)
              .maybeSingle();

            if (existing) {
              console.log(`   ⚪ [${namaToko}] Lewati Order ID ${order_id} (Sudah ada di database).`);
              pesananSudahDiproses.add(detailLink);
              continue; 
            }

            let item = null;
            let berhasilMendapatkanUsername = false;

            // --- SISTEM RETRY (COBA ULANG MAKSIMAL 3 KALI JIKA USERNAME MASIH BINTANG) ---
            for (let percobaan = 1; percobaan <= 3; percobaan++) {
              const detailPage = await context.newPage();
              console.log(`   [${namaToko}] Memproses [${i + 1}/${linkBaru.length}] Order ID: ${order_id} (Percobaan ke-${percobaan})...`);
              
              await detailPage.goto(`https://seller-id.tokopedia.com${detailLink}`, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
              });
              await detailPage.waitForTimeout(3000); 

              // Klik ikon mata
              const eyeIconUsername = detailPage.locator('svg[data-log_click_for="open_phone_plaintext"], svg[data-testid="icnEye"]').first();
              if (await eyeIconUsername.isVisible().catch(() => false)) {
                await eyeIconUsername.click().catch(() => {});
                
                for (let attempt = 0; attempt < 5; attempt++) {
                  await detailPage.waitForTimeout(1000);
                  const isStillCensored = await detailPage.evaluate(() => {
                    const eyeBtn = document.querySelector('svg[data-log_click_for="open_phone_plaintext"]') || document.querySelector('svg[data-testid="icnEye"]');
                    if (eyeBtn) {
                      const container = eyeBtn.closest('div');
                      if (container && container.innerText.includes('*')) {
                        return true;
                      }
                    }
                    return false;
                  });
                  if (!isStillCensored) break; 
                }
              }

              // Tarik data
              item = await detailPage.evaluate((currentOrderId) => {
                const teksLayar = document.body.innerText;
                const order_id = currentOrderId;
                const semuaBaris = teksLayar.split('\n').map(b => b.trim()).filter(b => b.length > 0);

                // --- 1. NAMA PEMBELI ---
                let nama_pembeli = '-';
                const eyeBtn = document.querySelector('svg[data-log_click_for="open_phone_plaintext"]') || document.querySelector('svg[data-testid="icnEye"]');
                if (eyeBtn) {
                  const container = eyeBtn.closest('div');
                  if (container) {
                    const textNode = container.innerText.replace(/[👁️]/g, '').trim();
                    if (textNode && !textNode.includes('*')) {
                      nama_pembeli = textNode.split('\n')[0].trim();
                    }
                  }
                }

                if (nama_pembeli === '-' || nama_pembeli.includes('*')) {
                   for (let j = 0; j < semuaBaris.length; j++) {
                      if (semuaBaris[j] === 'Nama pengguna' && semuaBaris[j+1]) {
                          const kandidat = semuaBaris[j+1].replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim();
                          if (!kandidat.includes('*')) {
                              nama_pembeli = kandidat;
                              break;
                          }
                      }
                   }
                }

                // --- 2. ALAMAT ---
                let alamat_pengiriman = '-';
                for (let baris of semuaBaris) {
                    if (baris.includes(', Indonesia') || baris.includes(',Indonesia') || (baris.includes(',') && baris.includes('West'))) {
                        if (baris.length > 10 && !baris.includes('Waktu') && !baris.includes('Metode')) {
                            alamat_pengiriman = baris;
                            break;
                        }
                    }
                }

                // --- 3. JUDUL PRODUK & VARIASI (Sistem Berlapis Baru) ---
                let judul_produk = '-';
                let variasi = '-';

                // STRATEGI 1: Gunakan kombinasi Class/Selector
                const selectors = [
                    '[data-testid="lblProductName"]',
                    '.line-clamp-2',
                    '.break-word',
                    'h4'
                ];

                let foundElement = null;
                for (let selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    for (let el of elements) {
                        const text = el.innerText.trim();
                        // Filter teks panjang yang BUKAN status pesanan/sistem
                        if (text.length > 15 && 
                            !text.includes('Menunggu') && 
                            !text.includes('Drop off') && 
                            !text.includes('Selesai') && 
                            !text.includes('Batal') &&
                            !text.includes('Status') &&
                            !text.includes('Invoice')) {
                            
                            judul_produk = text;
                            foundElement = el;
                            break;
                        }
                    }
                    if (judul_produk !== '-') break;
                }

                // STRATEGI 2: Ambil variasi dari elemen di dekatnya
                if (foundElement) {
                    let sibling = foundElement.nextElementSibling;
                    if (!sibling && foundElement.parentElement) {
                        sibling = foundElement.parentElement.nextElementSibling;
                    }
                    
                    if (sibling) {
                        let sibText = sibling.innerText.trim();
                        if (sibText && sibText.length > 0 && sibText.length < 50 && !sibText.includes('Rp') && !sibText.includes('x')) {
                            variasi = sibText;
                        }
                    }
                }

                // STRATEGI 3 (FALLBACK): Baca baris teks heuristik
                if (judul_produk === '-') {
                    for (let j = 0; j < semuaBaris.length; j++) {
                        const baris = semuaBaris[j];
                        if (baris.length > 15 && !baris.includes('Rp') && !baris.includes('Waktu') && !baris.includes('Kurir')) {
                            const baris1 = semuaBaris[j+1] || '';
                            const baris2 = semuaBaris[j+2] || '';
                            
                            // Jika ada angka quantity atau harga di dekatnya
                            if (baris1.includes('Rp') || baris2.includes('Rp') || baris1.match(/^\d+\s*x/)) {
                                judul_produk = baris;
                                if (baris1.length > 0 && !baris1.includes('Rp') && baris1.length < 50) {
                                    variasi = baris1;
                                }
                                break;
                            }
                        }
                    }
                }

                // --- 4. DATA LAINNYA ---
                const tarikTeks = (regex) => {
                    const match = teksLayar.match(regex);
                    return match ? match[1].trim() : '-';
                };

                const metode = teksLayar.includes('Bayar di tempat') ? 'COD (Bayar di tempat)' : tarikTeks(/Metode pembayaran\n([^\n]+)/);
                let akun_live = tarikTeks(/LIVE:\s*([^\n]+)/);
                if (akun_live === '-') akun_live = 'Bukan Live';
                
                const catatan_penjual = tarikTeks(/Catatan penjual:\s*([^\n]+)/);
                const pesan_pembeli = tarikTeks(/Pesan Pembeli:\s*([^\n]+)/);
                const waktu_dibuat = tarikTeks(/Waktu pembuatan\n([^\n]+)/);
                
                const hargaEl = Array.from(document.querySelectorAll('p')).find(p => p.innerText.includes('Rp'));
                const total_pendapatan = hargaEl ? hargaEl.innerText.trim() : 'Rp0';

                return { order_id, nama_pembeli, judul_produk, variasi, metode, akun_live, alamat_pengiriman, catatan_penjual, pesan_pembeli, waktu_dibuat, total_pendapatan };
              }, order_id);

              await detailPage.close();

              if (item && item.nama_pembeli !== '-' && !item.nama_pembeli.includes('*')) {
                berhasilMendapatkanUsername = true;
                break; 
              } else {
                console.log(`   ⚠️ [${namaToko}] Username masih tersensor bintang, mencoba ulang klik (${percobaan}/3)...`);
                await new Promise(r => setTimeout(r, 2000)); 
              }
            }

            if (!berhasilMendapatkanUsername) {
              console.log(`   ❌ [${namaToko}] Gagal membuka sensor username untuk Order ID ${order_id} setelah 3 kali percobaan. Pesanan dilewati.`);
              continue;
            }

            pesananSudahDiproses.add(detailLink);

            // --- KIRIM KE SUPABASE SATU PER SATU ---
            const { error } = await supabase.from(TABEL_TUJUAN).insert([
              {
                order_id: item.order_id,
                pembeli: item.nama_pembeli,
                produk: item.judul_produk,
                variation: item.variasi,
                payment_method: item.metode,
                creator_handle: item.akun_live,
                lokasi: item.alamat_pengiriman,
                catatan: item.catatan_penjual,
                pesan: item.pesan_pembeli,
                total_pendapatan: item.total_pendapatan,
                created_time: item.waktu_dibuat,
                status: targetUrl.includes('status[]=2') ? 'TERBAYAR (Perlu Dikirim)' : 'TERBAYAR (Status 1)'
              },
            ]);

            if (!error) {
              totalTerkirimSesiIni++;
              console.log(`   🟢 [${namaToko}] Sukses kirim ke Supabase: ID ${item.order_id} (Produk: ${item.judul_produk.substring(0,25)}...)`);
            } else {
              console.error(`   ❌ [${namaToko}] Gagal kirim ID ${item.order_id}:`, error.message);
            }
          }

          console.log(`📥 [${namaToko}] Total ${totalTerkirimSesiIni} pesanan baru dari ${statusOrder} berhasil disetor ke Supabase!`);

        } else {
          console.log(`⚪ [${namaToko}] Tidak ada pesanan baru di ${statusOrder}.`);
        }
      } // Akhir dari loop URL

      console.log(`\n⏳ [${namaToko}] Selesai mengecek kedua status. Menunggu 30 detik sebelum putaran berikutnya...`);
      await page.waitForTimeout(30000); 
    }

  } catch (error) {
    console.error(`❌ [${namaToko}] Terjadi kesalahan Fatal:`, error.message);
    await browser.close(); 
  }
}

// Eksekusi Paralel untuk beberapa toko sekaligus
(async () => {
  const daftarToko = [
    { nama: "Toko_Optik_1", cookieFile: "cookies.json" },
    { nama: "Toko_Optik_2", cookieFile: "toko2.json" },
  ];

  console.log(`🔥 Menyalakan sistem untuk ${daftarToko.length} toko secara simultan...`);
  await Promise.all(daftarToko.map(toko => jalankanBotToko(toko.nama, toko.cookieFile)));
})();