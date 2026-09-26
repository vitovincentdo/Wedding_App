import { neon } from '@neondatabase/serverless';

type Submission = {
  id: string;
  kind: 'rsvp' | 'wish';
  name: string;
  attendance: 'hadir' | 'tidak-hadir' | 'ragu' | null;
  guests: number | null;
  note: string | null;
};

let client: ReturnType<typeof neon> | undefined;
let schemaReady: Promise<unknown> | undefined;

function getClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum dikonfigurasi.');
  }

  client ??= neon(databaseUrl);
  return client;
}

export async function insertSubmission(submission: Submission) {
  const sql = getClient();

  schemaReady ??= sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id uuid PRIMARY KEY,
      kind text NOT NULL CHECK (kind IN ('rsvp', 'wish')),
      name text NOT NULL,
      attendance text,
      guests integer,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await schemaReady;
  await sql`
    INSERT INTO submissions (id, kind, name, attendance, guests, note)
    VALUES (
      ${submission.id},
      ${submission.kind},
      ${submission.name},
      ${submission.attendance},
      ${submission.guests},
      ${submission.note}
    )
  `;
}
