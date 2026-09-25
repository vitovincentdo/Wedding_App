'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Gift,
  MapPin,
  Music2,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const WEDDING_DATE = new Date('2027-07-18T10:00:00+07:00');
type Attendance = 'hadir' | 'tidak-hadir' | 'ragu';

function useCountdown() {
  const [now, setNow] = useState(WEDDING_DATE.getTime());
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return useMemo(() => {
    const distance = Math.max(0, WEDDING_DATE.getTime() - now);
    return [
      { label: 'Hari', value: Math.floor(distance / 86_400_000) },
      { label: 'Jam', value: Math.floor((distance / 3_600_000) % 24) },
      { label: 'Menit', value: Math.floor((distance / 60_000) % 60) },
      { label: 'Detik', value: Math.floor((distance / 1000) % 60) },
    ];
  }, [now]);
}

async function saveSubmission(payload: Record<string, unknown>) {
  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as { ok?: boolean; message?: string };
  if (!response.ok || !result.ok) throw new Error(result.message || 'Gagal menyimpan data.');
  return result;
}

export default function Home() {
  const [opened, setOpened] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [attendance, setAttendance] = useState<Attendance>('hadir');
  const [rsvpState, setRsvpState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [wishState, setWishState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown();

  function openInvitation() {
    setBreaking(true);
    window.setTimeout(() => {
      setOpened(true);
      document.body.classList.add('invitation-open');
    }, 820);
  }

  useEffect(() => {
    const modelContext = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'submit_wedding_rsvp',
          title: 'Konfirmasi kehadiran',
          description: 'Mengirim konfirmasi kehadiran tamu untuk pernikahan Alya dan Raka.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 2 },
              attendance: { type: 'string', enum: ['hadir', 'tidak-hadir', 'ragu'] },
              guests: { type: 'integer', minimum: 1, maximum: 4 },
              note: { type: 'string' },
            },
            required: ['name', 'attendance', 'guests'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input: unknown) {
            const value = input as { name?: string; attendance?: Attendance; guests?: number; note?: string };
            if (!value.name || !value.attendance || !value.guests) throw new Error('Nama, status, dan jumlah tamu wajib diisi.');
            await saveSubmission({ kind: 'rsvp', ...value });
            setRsvpState('saved');
            return { status: 'confirmed', attendance: value.attendance, guests: value.guests };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  async function submitRsvp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRsvpState('saving');
    const data = new FormData(event.currentTarget);
    try {
      await saveSubmission({ kind: 'rsvp', name: data.get('name'), attendance, guests: Number(data.get('guests') || 1), note: data.get('note') });
      setRsvpState('saved');
    } catch {
      setRsvpState('error');
    }
  }

  async function submitWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWishState('saving');
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await saveSubmission({ kind: 'wish', name: data.get('name'), note: data.get('note') });
      setWishState('saved');
      form.reset();
    } catch {
      setWishState('error');
    }
  }

  async function copyAccount() {
    await navigator.clipboard.writeText('1234567890');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="site-shell">
      <section className={`invitation-cover ${breaking ? 'is-breaking' : ''} ${opened ? 'is-open' : ''}`} aria-hidden={opened}>
        <Image src="/images/billiard-break.jpg" alt="Bola-bola billiard sesaat setelah break" fill priority className="cover-image" sizes="100vw" />
        <div className="cover-vignette" />
        <div className="impact-flash" />
        <div className="cover-copy">
          <span className="eyebrow">The wedding invitation of</span>
          <h1><span>Alya</span><i>&amp;</i><span>Raka</span></h1>
          <p className="cover-date">18 · 07 · 2027</p>
          <div className="guest-card">
            <span>Kepada Yth.</span><strong>Tamu Undangan</strong><small>Mohon maaf apabila ada kesalahan penulisan nama.</small>
          </div>
          <Button onClick={openInvitation} disabled={breaking} className="open-button">
            <span>{breaking ? 'Make the break…' : 'Buka Undangan'}</span><ArrowDown aria-hidden="true" />
          </Button>
        </div>
        <div className="cover-index">No. 08</div>
      </section>

      <div className={`invitation-content ${opened ? 'is-visible' : ''}`}>
        <header className="topbar">
          <a href="#story" className="monogram" aria-label="Alya dan Raka">A<span>·</span>R</a>
          <span className="topbar-date">18 July 2027</span>
          <a className="topbar-rsvp" href="#rsvp">RSVP</a>
        </header>

        <section className="hero" id="story">
          <div className="hero-grid">
            <p className="section-number">01 / The opening shot</p>
            <div className="hero-title"><span>One table.</span><span>Two players.</span><em>One forever.</em></div>
            <p className="hero-lead">Dari pertandingan kecil yang tak pernah benar-benar ingin kami menangkan sendiri, tumbuh satu keputusan besar: menjalani seluruh permainan kehidupan ini sebagai satu tim.</p>
          </div>
          <div className="scroll-cue"><span /> Gulir untuk cerita kami</div>
        </section>

        <section className="couple-section section-pad">
          <div className="couple-intro">
            <span className="eyebrow dark">Dengan penuh sukacita</span>
            <p>Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menjadi bagian dari hari bahagia kami.</p>
          </div>
          <div className="couple-names">
            <article><span className="role">The Bride</span><h2>Alya<br />Maheswari</h2><p>Putri dari<br /><strong>Bapak Hendra Maheswara</strong><br />&amp; <strong>Ibu Larasati</strong></p></article>
            <div className="ampersand">&amp;</div>
            <article><span className="role">The Groom</span><h2>Raka<br />Pradana</h2><p>Putra dari<br /><strong>Bapak Bima Pradana</strong><br />&amp; <strong>Ibu Ratih</strong></p></article>
          </div>
        </section>

        <section className="quote-section">
          <Image src="/images/couple-hands.jpg" alt="Sepasang tangan di tepi meja billiard" fill className="quote-image" sizes="100vw" />
          <div className="quote-overlay" />
          <blockquote>“The best partnerships are built on trust, patience, and knowing exactly when to take the shot.”</blockquote>
        </section>

        <section className="date-section section-pad" id="date">
          <div className="date-heading"><p className="section-number">02 / Save the date</p><h2>The day<br /><em>we break together.</em></h2></div>
          <div className="countdown" aria-label="Hitung mundur menuju hari pernikahan">
            {countdown.map((item) => <div key={item.label}><strong>{String(item.value).padStart(2, '0')}</strong><span>{item.label}</span></div>)}
          </div>
          <div className="events-grid">
            <article className="event-card"><span className="event-chip">Akad Nikah</span><h3>Minggu<br />18 Juli 2027</h3><div><p><Clock3 /> 10.00 — 11.00 WIB</p><p><MapPin /> The Glasshouse, Jakarta</p></div></article>
            <article className="event-card featured"><span className="event-chip">Resepsi</span><h3>Minggu<br />18 Juli 2027</h3><div><p><Clock3 /> 12.00 — 15.00 WIB</p><p><MapPin /> The Glasshouse, Jakarta</p></div></article>
          </div>
          <div className="action-row">
            <a className="text-button" href="https://maps.google.com/?q=Jakarta" target="_blank" rel="noreferrer"><MapPin /> Buka Google Maps</a>
            <a className="text-button" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Alya%20%26%20Raka%20Wedding&dates=20270718T030000Z/20270718T080000Z&location=Jakarta" target="_blank" rel="noreferrer"><CalendarDays /> Tambah ke Kalender</a>
          </div>
        </section>

        <section className="dresscode-section section-pad">
          <div><p className="section-number">03 / Dress code</p><h2>Evening<br />at the club.</h2></div>
          <div className="dress-info"><p>Formal attire dengan palet gelap dan hangat. Pilih warna yang membuat Anda nyaman bergerak dan merayakan malam bersama kami.</p><div className="swatches" aria-label="Palet warna dress code"><span style={{ background: '#0d3b2e' }}>Emerald</span><span style={{ background: '#171717' }}>Black</span><span style={{ background: '#7b2635' }}>Burgundy</span><span style={{ background: '#d5c3a1', color: '#171717' }}>Champagne</span></div></div>
        </section>

        <section className="rundown-section section-pad">
          <p className="section-number">04 / The match plan</p><h2>Rundown</h2>
          <ol className="timeline">
            {[
              ['10.00', 'Akad Nikah', 'Ijab kabul dan doa bersama'], ['11.30', 'Guest Arrival', 'Registrasi dan welcome drinks'], ['12.00', 'Grand Entrance', 'Perkenalan kedua mempelai'], ['13.00', 'Lunch & Toast', 'Santap siang dan ucapan keluarga'], ['14.30', 'Open Table', 'Foto, musik, dan friendly match'],
            ].map(([time, title, detail], index) => <li key={time}><span className="timeline-ball">{index + 1}</span><time>{time}</time><div><strong>{title}</strong><p>{detail}</p></div></li>)}
          </ol>
        </section>

        <section className="gallery-section" id="gallery">
          <div className="gallery-heading section-pad"><p className="section-number">05 / Frames we keep</p><h2>Portraits<br />of <em>our game.</em></h2></div>
          <div className="gallery-grid">
            <figure className="gallery-primary"><Image src="/images/couple-hands.jpg" alt="Detail romantis pasangan di meja billiard" fill sizes="(max-width: 800px) 100vw, 65vw" /></figure>
            <figure className="gallery-secondary"><Image src="/images/billiard-break.jpg" alt="Break bola billiard di klub elegan" fill sizes="(max-width: 800px) 100vw, 35vw" /></figure>
            <div className="gallery-caption"><Sparkles /><p>Setiap permainan punya jeda. Ini adalah momen yang ingin kami simpan selamanya.</p></div>
          </div>
        </section>

        <section className="rsvp-section section-pad" id="rsvp">
          <div className="rsvp-copy"><p className="section-number">06 / Reserve your spot</p><h2>Will you<br /><em>join the table?</em></h2><p>Konfirmasi kehadiran paling lambat 30 Juni 2027 agar kami dapat menyiapkan tempat terbaik untuk Anda.</p></div>
          <form className="rsvp-form" onSubmit={submitRsvp}>
            <label>Nama lengkap<Input name="name" required placeholder="Nama Anda" /></label>
            <fieldset><legend>Konfirmasi kehadiran</legend><RadioGroup value={attendance} onValueChange={(value) => setAttendance(value as Attendance)} className="attendance-options">{[['hadir', 'Hadir'], ['ragu', 'Masih ragu'], ['tidak-hadir', 'Tidak hadir']].map(([value, label]) => <label key={value}><RadioGroupItem value={value} />{label}</label>)}</RadioGroup></fieldset>
            <label>Jumlah tamu<Input name="guests" type="number" min="1" max="4" defaultValue="1" required /></label>
            <label>Pesan atau kebutuhan khusus<Textarea name="note" placeholder="Contoh: alergi makanan, aksesibilitas, atau pesan singkat" /></label>
            <Button type="submit" className="submit-button" disabled={rsvpState === 'saving' || rsvpState === 'saved'}>{rsvpState === 'saved' ? <><Check /> Kehadiran tercatat</> : rsvpState === 'saving' ? 'Menyimpan…' : <><Send /> Kirim konfirmasi</>}</Button>
            {rsvpState === 'error' && <p className="form-error">Belum berhasil tersimpan. Coba sekali lagi ya.</p>}
          </form>
        </section>

        <section className="gift-section section-pad">
          <div className="gift-copy"><Gift /><p className="section-number">07 / Wedding gift</p><h2>A little<br /><em>something.</em></h2><p>Kehadiran dan doa Anda adalah hadiah terbaik. Namun bila ingin mengirim tanda kasih, amplop digital tersedia di bawah ini.</p></div>
          <div className="bank-card"><div><span>Bank Central Asia</span><strong>1234567890</strong><small>a.n. Alya Maheswari</small></div><Button variant="outline" onClick={copyAccount}>{copied ? <Check /> : <Copy />}{copied ? 'Tersalin' : 'Salin nomor'}</Button><p>Data rekening ini adalah contoh dan siap diganti dengan detail pasangan.</p></div>
        </section>

        <section className="wishes-section section-pad">
          <div><p className="section-number">08 / Leave a note</p><h2>Send your<br /><em>best shot.</em></h2></div>
          <form onSubmit={submitWish} className="wish-form"><Input name="name" required placeholder="Nama Anda" /><Textarea name="note" required minLength={3} placeholder="Tulis doa dan ucapan untuk Alya & Raka" /><Button type="submit" disabled={wishState === 'saving' || wishState === 'saved'}>{wishState === 'saved' ? <><Check /> Ucapan terkirim</> : wishState === 'saving' ? 'Mengirim…' : <><Send /> Kirim ucapan</>}</Button>{wishState === 'error' && <p className="form-error">Ucapan belum terkirim. Silakan coba lagi.</p>}</form>
        </section>

        <footer><Music2 /><p>Terima kasih telah menjadi bagian dari cerita kami.</p><h2>Alya <span>&amp;</span> Raka</h2><small>#ThePerfectBreak · 18.07.2027</small></footer>
      </div>
    </main>
  );
}
