import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

export const maxDuration = 180;

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = "sipdades_db";

const fonts = {
  Roboto: {
    normal: 'node_modules/pdfmake/build/vfs_fonts.js', // We usually load a TTF but pdfmake comes with standard fonts when used in Node, we should use standard ones.
    bold: 'node_modules/pdfmake/build/vfs_fonts.js',
    italics: 'node_modules/pdfmake/build/vfs_fonts.js',
    bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js'
  }
};
// Actually in nodejs environment without custom fonts, it's better to use standard fonts provided by pdfmake or just provide path to standard TTF.
// pdfmake standard fonts usually require path to file. Let's use standard fonts fallback.

import { verifyAuth } from '@/lib/authMiddleware';

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN', 'DESA']);
  if (!auth.authorized) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get('bulan'); // e.g. "Agustus 2026"

    if (!bulan) {
      return NextResponse.json({ error: 'Parameter bulan diperlukan' }, { status: 400 });
    }

    let activeDbId = DB_ID;
    try {
      await databases.get(DB_ID);
    } catch(e) {
      const dbs = await databases.list();
      if(dbs.total > 0) activeDbId = dbs.databases[0].$id;
    }

    // Ambil data transaksi pencairan untuk bulan tersebut
    const pencairanResponse = await databases.listDocuments(activeDbId, 'transaksi_pencairan', [
      Query.equal('jenis_dana', 'ADD'),
      Query.equal('bulan_penyaluran', bulan),
      Query.limit(300)
    ]);

    // Filter status DISETUJUI atau DRAFT
    const validTrx = pencairanResponse.documents.filter(
      d => d.status_verifikasi === 'DISETUJUI' || d.status_verifikasi === 'DRAFT'
    );

    if (validTrx.length === 0) {
       return NextResponse.json({ error: 'Tidak ada data pencairan ADD untuk bulan ini' }, { status: 404 });
    }

    // Ambil data master desa
    const masterDesaResponse = await databases.listDocuments(activeDbId, 'master_desa', [
      Query.limit(500)
    ]);
    const masterDesaMap = new Map(masterDesaResponse.documents.map(d => [d.$id, d]));

    // Format data untuk tabel
    const tableBody = [];
    tableBody.push([
      { text: 'No.', style: 'tableHeader' },
      { text: 'Kode', style: 'tableHeader' },
      { text: 'Nama Desa', style: 'tableHeader' },
      { text: 'Nomor Rekening', style: 'tableHeader' },
      { text: 'Pagu (Rp.)', style: 'tableHeader' },
      { text: 'Potongan BPJS Kesehatan (Rp.)', style: 'tableHeader' },
      { text: 'Jumlah Penyaluran (Rp.)', style: 'tableHeader' }
    ]);

    let totalPagu = 0;
    let totalPotongan = 0;
    let totalPenyaluran = 0;

    let idx = 1;
    for (const trx of validTrx) {
      const desa = masterDesaMap.get(trx.desa_id) || { nama_desa: 'Tidak Diketahui', no_rekening: '-' };
      const pagu = trx.nominal_pengajuan || 0;
      const bpjs = trx.potongan_bpjs || 0;
      const net = trx.nominal_pencairan_net || 0;

      totalPagu += pagu;
      totalPotongan += bpjs;
      totalPenyaluran += net;

      tableBody.push([
        idx.toString(),
        "01" + idx.toString().padStart(2, '0'), // Dummy kode
        desa.nama_desa,
        desa.no_rekening || '-',
        pagu.toLocaleString('id-ID'),
        bpjs.toLocaleString('id-ID'),
        net.toLocaleString('id-ID')
      ]);
      idx++;
    }

    // Summary Row
    tableBody.push([
      { colSpan: 4, text: 'JUMLAH', style: 'tableHeader', alignment: 'center' },
      '', '', '',
      { text: totalPagu.toLocaleString('id-ID'), style: 'tableHeader' },
      { text: totalPotongan.toLocaleString('id-ID'), style: 'tableHeader' },
      { text: totalPenyaluran.toLocaleString('id-ID'), style: 'tableHeader' }
    ]);

    const docDefinition: TDocumentDefinitions = {
      pageOrientation: 'landscape',
      content: [
        { text: 'DAFTAR PENYALURAN ALOKASI DANA DESA', style: 'header', alignment: 'center' },
        { text: 'PEMERINTAH KABUPATEN PURBALINGGA', style: 'header', alignment: 'center' },
        { text: `${bulan.toUpperCase()}`, style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'PENYALURAN KE-1', style: 'subheader', margin: [0, 0, 0, 5] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody
          }
        },
        { text: '\n\n' },
        {
          columns: [
            { text: 'Pengguna Anggaran,\n\n\n\n(Nama Pengguna)\nNIP. ...', alignment: 'center' },
            { text: 'Bendahara,\n\n\n\n(Nama Bendahara)\nNIP. ...', alignment: 'center' },
            { text: 'PPTK,\n\n\n\n(Nama PPTK)\nNIP. ...', alignment: 'center' }
          ]
        }
      ],
      styles: {
        header: { fontSize: 14, bold: true },
        subheader: { fontSize: 12, bold: true },
        tableHeader: { bold: true, fillColor: '#f2f2f2' }
      },
      defaultStyle: {
        font: 'Helvetica' // Menggunakan font standar Helvetica bawaan pdfmake
      }
    };

    const printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    });
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Stream the PDF to response
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    return new Promise<NextResponse>((resolve) => {
      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(new NextResponse(result, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=SPM_ADD_${bulan.replace(/\s+/g, '_')}.pdf`
          }
        }));
      });
      pdfDoc.end();
    });

  } catch (error: any) {
    console.error('Rekap SPM Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
