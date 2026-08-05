import { useState, useCallback, useRef, useEffect } from 'react';
import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

const DB_ID = 'sipdades_db';

export interface Transaction {
  $id: string;
  desa_id: string;
  jenis_dana: string;
  bulan_penyaluran: string;
  nominal_pengajuan: number;
  potongan_bpjs: number;
  nominal_net: number;
  status: string;
  hasil_ocr?: string;
}

export function useAddTransactions(bulan: string) {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetcherRef = useRef(async () => {
    const response = await databases.listDocuments(DB_ID, 'transaksi_pencairan', [
      Query.equal('jenis_dana', 'ADD'),
      Query.equal('bulan_penyaluran', bulan),
      Query.limit(300)
    ]);
    return response.documents as unknown as Transaction[];
  });

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bulan) {
      refetch();
    }
  }, [bulan, refetch]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || resData.error || 'Gagal memperbarui status transaksi.');
      }
      
      await refetch();
    } catch (err) {
      console.error('Update status failed:', err);
      throw err;
    }
  };

  return { data, loading, error, refetch, updateStatus };
}
