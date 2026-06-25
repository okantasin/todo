import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/services/data.service';
import type { AppData } from '@/lib/types';

// Bu dosya yalnızca HTTP katmanıdır: isteği alır, servise devreder, cevabı döner.
// Tüm veritabanı mantığı lib/services/data.service.ts içindedir.
export const dynamic = 'force-dynamic';

// GET /api/data -> tüm uygulama verisini döner
export async function GET() {
  try {
    const data = await dataService.getAll();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Okuma hatası', detail: String(err) }, { status: 500 });
  }
}

// PUT /api/data -> gelen tüm durumu kaydeder
export async function PUT(req: NextRequest) {
  let body: AppData;
  try {
    body = (await req.json()) as AppData;
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  try {
    await dataService.save(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Yazma hatası', detail: String(err) }, { status: 500 });
  }
}
