import React from 'react';
import { terbilang } from '@/utils/terbilang';
import { KuitansiData } from '@/components/PrintableKuitansi'; // reuse interface

export interface PrintConfig {
  penyaluranKe: string;
  kodeSubKegiatan: string;
  namaSubKegiatan: string;
  kodeRekening: string;
  namaPA: string;
  nipPA: string;
  namaBendahara: string;
  nipBendahara: string;
  namaPPTK: string;
  nipPPTK: string;
  tanggalCetak: string;
}

interface Props {
  dataList: KuitansiData[];
  config: PrintConfig;
}

export default function PrintableKuitansiGlobal({ dataList, config }: Props) {
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2
    }).format(angka);
  };

  const totalNominal = dataList.reduce((acc, curr) => acc + curr.nominal, 0);
  const nominalTerbilang = terbilang(totalNominal).toLowerCase() + ' rupiah';
  const tahunAnggaran = dataList.length > 0 ? dataList[0].tahun : new Date().getFullYear().toString();

  return (
    <div className="print-only bg-white text-black mx-auto font-sans" style={{ width: '210mm' }}>
      
      {/* ========================================================= */}
      {/* HALAMAN 1: KUITANSI GLOBAL (Setengah Folio)               */}
      {/* ========================================================= */}
      <div className="border border-black" style={{ minHeight: '148mm' }}>
        
        {/* KOP */}
        <div className="border-b border-black text-center py-2">
          <h1 className="text-sm font-bold uppercase tracking-wide">PEMERINTAH KABUPATEN PURBALINGGA</h1>
          <h2 className="text-sm font-bold uppercase tracking-wide">TAHUN ANGGARAN {tahunAnggaran}</h2>
        </div>

        {/* HEADER BUKTI */}
        <div className="flex border-b border-black">
          <div className="w-2/3 p-4 border-r border-black flex items-center justify-center">
            <h3 className="font-bold text-base">TANDA BUKTI PEMBAYARAN</h3>
          </div>
          <div className="w-1/3 p-4 text-sm leading-tight">
            <div className="flex justify-between mb-1">
              <span>Lembar ke</span>
              <span>1 / 2</span>
            </div>
            <div className="border-b border-black w-full my-1"></div>
            <div className="mb-2">Transaksi tersebut telah dibukukan:</div>
            <div className="flex justify-between">
              <span>Tanggal</span>
              <span>: {config.tanggalCetak}</span>
            </div>
            <div className="flex justify-between">
              <span>Nomor Bukti</span>
              <span>: ......................</span>
            </div>
          </div>
        </div>

        {/* ISI KUITANSI */}
        <div className="flex border-b border-black">
          <div className="w-2/3 p-4 text-sm space-y-4 border-r border-black">
            
            <div className="flex">
              <div className="w-36">Terima dari</div>
              <div className="w-4">:</div>
              <div className="flex-1">Pengguna Anggaran Badan Keuangan Daerah Kab. Purbalingga</div>
            </div>
            
            <div className="flex">
              <div className="w-36">Uang sejumlah</div>
              <div className="w-4">:</div>
              <div className="flex-1 font-bold">
                Rp {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(totalNominal)} <br/>
                <span className="font-normal italic">({nominalTerbilang})</span>
              </div>
            </div>

            <div className="flex">
              <div className="w-36">Untuk pembayaran</div>
              <div className="w-4">:</div>
              <div className="flex-1">
                Membayar BKK Kegiatan Sarpras Desa Penyaluran Ke-{config.penyaluranKe} Tahun {tahunAnggaran} untuk {dataList.length} kegiatan
              </div>
            </div>

            <div className="flex">
              <div className="w-36">Kode Sub Kegiatan</div>
              <div className="w-4">:</div>
              <div className="flex-1">{config.kodeSubKegiatan}</div>
            </div>
            
            <div className="flex">
              <div className="w-36">Nama Sub Kegiatan</div>
              <div className="w-4">:</div>
              <div className="flex-1">{config.namaSubKegiatan}</div>
            </div>

            <div className="flex">
              <div className="w-36">Kode Rekening</div>
              <div className="w-4">:</div>
              <div className="flex-1">{config.kodeRekening}</div>
            </div>

          </div>
          
          {/* TABEL RINCIAN KANAN */}
          <div className="w-1/3 text-sm">
            <div className="flex p-2 border-b border-black">
              <div className="w-24">Jumlah Kotor</div>
              <div className="w-4">:</div>
              <div className="flex-1 text-right">Rp</div>
              <div className="w-28 text-right">{new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(totalNominal)}</div>
            </div>
            <div className="flex p-2">
              <div className="w-24">PPN</div>
              <div className="w-4">:</div>
              <div className="flex-1 text-right">Rp</div>
              <div className="w-28 text-right">-</div>
            </div>
            <div className="flex p-2 border-b border-black pb-4">
              <div className="w-24">PPh</div>
              <div className="w-4">:</div>
              <div className="flex-1 text-right">Rp</div>
              <div className="w-28 text-right">-</div>
            </div>
            <div className="flex p-2 font-bold bg-zinc-50">
              <div className="w-24">Dibayarkan</div>
              <div className="w-4">:</div>
              <div className="flex-1 text-right">Rp</div>
              <div className="w-28 text-right">{new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(totalNominal)}</div>
            </div>
          </div>
        </div>

        {/* TANDA TANGAN (ATAS) */}
        <div className="p-4 text-sm border-b border-black text-center relative">
          <div className="absolute right-8 top-4 text-left">
            <p>Purbalingga,</p>
            <p>Yang berhak menerima,</p>
          </div>
          
          <div className="mt-16 w-64 mx-auto text-left">
            <div className="flex"><span className="w-24">Tanda Tangan</span><span>: Terlampir</span></div>
            <div className="flex"><span className="w-24">Nama</span><span>: Terlampir</span></div>
            <div className="flex"><span className="w-24">Alamat</span><span>: Terlampir</span></div>
          </div>
        </div>

        {/* PEJABAT */}
        <div className="flex text-sm text-center">
          <div className="w-1/3 p-4 border-r border-black">
            <p className="mb-16">Pengguna Anggaran,</p>
            <p className="font-bold underline">{config.namaPA}</p>
            <p>NIP. {config.nipPA}</p>
          </div>
          <div className="w-1/3 p-4 border-r border-black">
            <p className="mb-16">Bendahara Pengeluaran,</p>
            <p className="font-bold underline">{config.namaBendahara}</p>
            <p>NIP. {config.nipBendahara}</p>
          </div>
          <div className="w-1/3 p-4">
            <p className="mb-16">PPTK,</p>
            <p className="font-bold underline">{config.namaPPTK}</p>
            <p>NIP. {config.nipPPTK}</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HALAMAN 2: LAMPIRAN (PAGE BREAK)                            */}
      {/* ========================================================= */}
      <div style={{ pageBreakBefore: 'always' }} className="pt-8 text-sm">
        <h3 className="font-bold text-center text-lg mb-2 uppercase">
          LAMPIRAN TANDA BUKTI PEMBAYARAN BKK SARPRAS TAHUN {tahunAnggaran}
        </h3>
        <p className="text-center mb-6">Penyaluran Ke-{config.penyaluranKe} / Tanggal: {config.tanggalCetak}</p>

        <table className="w-full border-collapse border border-black text-sm mb-12">
          <thead className="bg-zinc-100 text-center">
            <tr>
              <th className="border border-black p-2 w-10">NO</th>
              <th className="border border-black p-2">URAIAN KEGIATAN</th>
              <th className="border border-black p-2 w-10"></th>
              <th className="border border-black p-2">NOMINAL</th>
              <th className="border border-black p-2">NO REKENING</th>
              <th className="border border-black p-2">ATAS NAMA</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map((row, idx) => (
              <tr key={row.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2">{row.keterangan}</td>
                <td className="border border-black p-2 text-center">Rp</td>
                <td className="border border-black p-2 text-right">{new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(row.nominal)}</td>
                <td className="border border-black p-2 text-center font-mono">{row.noRekening}</td>
                <td className="border border-black p-2">{row.namaDesa} Kec. {row.kecamatan}</td>
              </tr>
            ))}
            <tr className="font-bold bg-zinc-50">
              <td colSpan={2} className="border border-black p-2 text-center">Jumlah</td>
              <td className="border border-black p-2 text-center">Rp</td>
              <td className="border border-black p-2 text-right text-base">{new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(totalNominal)}</td>
              <td colSpan={2} className="border border-black p-2"></td>
            </tr>
          </tbody>
        </table>

        {/* TANDA TANGAN LAMPIRAN (BAWAH) */}
        <div className="flex text-sm text-center mt-12">
          <div className="w-1/3 p-4">
            <p className="mb-20">Pengguna Anggaran,</p>
            <p className="font-bold underline">{config.namaPA}</p>
            <p>NIP. {config.nipPA}</p>
          </div>
          <div className="w-1/3 p-4">
            <p className="mb-20">Bendahara,</p>
            <p className="font-bold underline">{config.namaBendahara}</p>
            <p>NIP. {config.nipBendahara}</p>
          </div>
          <div className="w-1/3 p-4">
            <p className="mb-20">PPTK,</p>
            <p className="font-bold underline">{config.namaPPTK}</p>
            <p>NIP. {config.nipPPTK}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
