import { env } from 'cloudflare:workers';

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

    await env.DB.prepare(
      `INSERT INTO submissions (id, kind, name, attendance, guests, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        body.kind,
        name.slice(0, 120),
        body.attendance || null,
        body.kind === 'rsvp' ? body.guests : null,
        body.note?.trim().slice(0, 1000) || null,
        Math.floor(Date.now() / 1000),
      )
      .run();

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, message: 'Data belum dapat disimpan.' }, { status: 500 });
  }
}
