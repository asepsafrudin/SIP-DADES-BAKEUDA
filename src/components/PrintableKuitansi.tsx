import React from 'react';
import { terbilang } from '@/utils/terbilang';

export interface KuitansiData {
  id: string;
  namaDesa: string;
  kecamatan: string;
  nominal: number;
  keterangan: string;
  tahun: string;
  noRekening: string;
  noRekomendasi?: string;
}

interface Props {
  data: KuitansiData;
}

export default function PrintableKuitansi({ data }: Props) {
  // Format currency
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const nominalTerbilang = terbilang(data.nominal) + ' Rupiah';

  return (
    <div className="kuitansi-container print-only bg-white text-black p-8 border-2 border-black w-full max-w-4xl mx-auto mb-8 font-serif" style={{ width: '210mm', minHeight: '148mm' }}>
      
      {/* KOP SURAT */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="text-center w-full">
          <h1 className="text-xl font-bold uppercase">PEMERINTAH KABUPATEN PURBALINGGA</h1>
          <h2 className="text-2xl font-extrabold uppercase">BADAN KEUANGAN DAERAH</h2>
          <p className="text-sm">Jl. Onje No. 1B, Purbalingga, Jawa Tengah 53311</p>
        </div>
      </div>

      {/* JUDUL */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold underline uppercase tracking-widest">K U I T A N S I</h3>
        <p className="text-sm">No. BKU: .......................................</p>
      </div>

      {/* ISI */}
      <div className="space-y-6 text-lg">
        <div className="flex">
          <div className="w-48 font-semibold">Telah Terima Dari</div>
          <div className="w-8 text-center">:</div>
          <div className="flex-1 font-bold">KUASA PENGGUNA ANGGARAN BKD KAB. PURBALINGGA</div>
        </div>

        <div className="flex">
          <div className="w-48 font-semibold">Uang Sebesar</div>
          <div className="w-8 text-center">:</div>
          <div className="flex-1 italic font-bold bg-zinc-100 px-2 py-1 border border-zinc-300">
            {nominalTerbilang}
          </div>
        </div>

        <div className="flex">
          <div className="w-48 font-semibold">Yaitu Untuk</div>
          <div className="w-8 text-center">:</div>
          <div className="flex-1">
            Pembayaran Belanja Bantuan Keuangan Khusus (BKK) Sarpras Tahun Anggaran {data.tahun}<br/>
            Untuk Kegiatan: <strong>{data.keterangan}</strong><br/>
            Desa: <strong>{data.namaDesa}</strong> (Kec. {data.kecamatan})<br/>
            Ditransfer ke Rekening Kas Desa No: <strong>{data.noRekening}</strong>
          </div>
        </div>
      </div>

      {/* NOMINAL BESAR */}
      <div className="mt-8 mb-12">
        <div className="inline-block border-4 border-black px-6 py-2 text-3xl font-bold">
          {formatRupiah(data.nominal)}
        </div>
      </div>

      {/* TANDA TANGAN */}
      <div className="flex justify-between mt-8 text-center">
        <div className="w-1/3">
          <p className="mb-20">Mengetahui/Menyetujui,<br/>Kuasa Pengguna Anggaran</p>
          <p className="font-bold underline">( .................................................... )</p>
          <p>NIP. ..........................................</p>
        </div>
        
        <div className="w-1/3">
          <p className="mb-20">Purbalingga, ........................ {data.tahun}<br/>Yang Menerima,<br/>Kepala Desa {data.namaDesa}</p>
          <p className="font-bold underline">( .................................................... )</p>
        </div>
      </div>

    </div>
  );
}
