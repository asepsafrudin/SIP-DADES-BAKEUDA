import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bulan = searchParams.get('bulan') || 'Agustus 2026';
  const desa = searchParams.get('desa') || 'Kedungbenda';
  const nominal = searchParams.get('nominal') || '373456000';

  // Sample HTML response for printing PDF / SPM document with QR Code placeholder
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Surat Perintah Membayar (SPM) - ${desa}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
        .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
        .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
        .header h3 { margin: 5px 0 0 0; font-size: 14px; font-weight: normal; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 6px 4px; vertical-align: top; font-size: 13px; }
        .content-box { border: 1px solid #000; padding: 15px; margin-bottom: 20px; font-size: 13px; }
        .sig-container { display: flex; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; }
        .sig-box { width: 45%; text-align: center; font-size: 13px; }
        .sig-space { height: 70px; }
        .qr-section { margin-top: 30px; text-align: center; border-top: 1px dashed #ccc; padding-top: 15px; }
        .qr-placeholder { display: inline-block; width: 80px; height: 80px; background: #eee; border: 1px solid #ccc; line-height: 80px; font-size: 10px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>PEMERINTAH KABUPATEN PURBALINGGA</h2>
        <h3>BADAN KEUANGAN DAERAH (BAKEUDA)</h3>
        <p style="margin: 3px 0 0 0; font-size: 11px;">Jl. Onje No. 1, Purbalingga, Jawa Tengah</p>
      </div>

      <h3 style="text-align: center; text-decoration: underline; margin-bottom: 5px;">SURAT PERINTAH MEMBAYAR (SPM)</h3>
      <p style="text-align: center; margin-top: 0; font-size: 12px;">Nomor: 900 / SPM-ADD / ${bulan.toUpperCase()} / 2026</p>

      <table class="info-table">
        <tr>
          <td width="30%"><strong>Kepada Yth.</strong></td>
          <td>: Bank Jateng Cabang Purbalingga</td>
        </tr>
        <tr>
          <td><strong>Nama Desa / RKD</strong></td>
          <td>: Desa ${desa}</td>
        </tr>
        <tr>
          <td><strong>Bulan Penyaluran</strong></td>
          <td>: ${bulan}</td>
        </tr>
        <tr>
          <td><strong>Keperluan</strong></td>
          <td>: Penyaluran Alokasi Dana Desa (ADD) ${bulan}</td>
        </tr>
      </table>

      <div class="content-box">
        <p style="margin-top: 0;">Bank diperintahkan untuk mentransfer dana dari Rekening Kas Umum Daerah (RKUD) ke Rekening Kas Desa (RKD) dengan rincian:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td>Nominal Bruto Pengajuan</td>
            <td style="text-align: right; font-weight: bold;">Rp ${Number(nominal).toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td>Potongan BPJS (1% + 4%)</td>
            <td style="text-align: right; color: #c00;">- Rp ${(Number(nominal) * 0.04).toLocaleString('id-ID')}</td>
          </tr>
          <tr style="border-top: 1px solid #000; font-size: 14px;">
            <td><strong>Jumlah Netto Ditransfer (RKD)</strong></td>
            <td style="text-align: right; font-weight: bold;">Rp ${(Number(nominal) * 0.96).toLocaleString('id-ID')}</td>
          </tr>
        </table>
      </div>

      <div class="sig-container">
        <div class="sig-box">
          <p>Mengetahui/Menyetujui,<br><strong>Kepala Bidang APDT</strong></p>
          <div class="sig-space"></div>
          <p style="text-decoration: underline; font-weight: bold; margin: 0;">_______________________</p>
          <p style="margin: 2px 0 0 0; font-size: 11px;">NIP. 19780512 200312 1 002</p>
        </div>
        <div class="sig-box">
          <p>Purbalingga, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br><strong>Bendahara Pengeluaran</strong></p>
          <div class="sig-space"></div>
          <p style="text-decoration: underline; font-weight: bold; margin: 0;">_______________________</p>
          <p style="margin: 2px 0 0 0; font-size: 11px;">NIP. 19850314 200902 2 004</p>
        </div>
      </div>

      <div class="qr-section">
        <div class="qr-placeholder">QR TRACKING</div>
        <p style="font-size: 10px; color: #555; margin-top: 5px;">
          Dokumen ini dicetak otomatis oleh SIP-DADES BAKEUDA. Kode Tracking: <strong>SPM-ADD-3303-${Date.now()}</strong><br>
          Setelah ditandatangani basah, pindai dokumen ini dan unggah kembali ke sistem untuk verifikasi pencairan.
        </p>
      </div>

      <script>
        // Auto trigger print dialog when opened in browser
        window.onload = function() {
          // window.print();
        };
      </script>
    </body>
    </html>
  `;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
