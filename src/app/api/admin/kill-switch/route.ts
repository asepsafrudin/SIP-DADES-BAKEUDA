import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/authMiddleware';
import { getKillSwitchState, setKillSwitchState } from '@/lib/killSwitch';

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  return NextResponse.json({
    status: 'success',
    data: getKillSwitchState()
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req, ['SUPER_ADMIN']);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { active, reason } = body;

    const newState = setKillSwitchState(Boolean(active), reason || 'Toggled via Admin UI');

    return NextResponse.json({
      status: 'success',
      message: `AI Kill-Switch berhasil di-set ke: ${newState.active ? 'AKTIF (PDFParse Fallback)' : 'NON-AKTIF (RunPod AI Live)'}`,
      data: newState
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengubah status Kill-Switch.' }, { status: 400 });
  }
}
