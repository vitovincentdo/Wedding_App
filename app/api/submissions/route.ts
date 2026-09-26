import { insertSubmission } from '@/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: 'rsvp' | 'wish';
      name?: string;
      attendance?: 'hadir' | 'tidak-hadir' | 'ragu';
      guests?: number;
      note?: string;
    };

    const name = body.name?.trim();
    if (!name || name.length < 2 || !['rsvp', 'wish'].includes(body.kind || '')) {
      return Response.json({ ok: false, message: 'Data belum lengkap.' }, { status: 400 });
    }
    if (body.kind === 'rsvp' && (!body.attendance || !body.guests || body.guests < 1 || body.guests > 4)) {
      return Response.json({ ok: false, message: 'Konfirmasi kehadiran belum lengkap.' }, { status: 400 });
    }
    if (body.kind === 'wish' && (!body.note?.trim() || body.note.trim().length < 3)) {
      return Response.json({ ok: false, message: 'Ucapan terlalu singkat.' }, { status: 400 });
    }

    await insertSubmission({
      id: crypto.randomUUID(),
      kind: body.kind as 'rsvp' | 'wish',
      name: name.slice(0, 120),
      attendance: body.attendance || null,
      guests: body.kind === 'rsvp' ? body.guests || null : null,
      note: body.note?.trim().slice(0, 1000) || null,
    });

    return Response.json({ ok: true });
  } catch (error) {
    const isDatabaseMissing = error instanceof Error && error.message.includes('DATABASE_URL');
    return Response.json(
      {
        ok: false,
        message: isDatabaseMissing
          ? 'Penyimpanan RSVP belum dikonfigurasi.'
          : 'Data belum dapat disimpan.',
      },
      { status: isDatabaseMissing ? 503 : 500 },
    );
  }
}
