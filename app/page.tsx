'use client';

import Image from 'next/image';
import { type CSSProperties, type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, CalendarDays, Check, Copy, Gift, MapPin, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const WEDDING_DATE = new Date('2027-07-18T10:00:00+07:00');
type Attendance = 'hadir' | 'tidak-hadir' | 'ragu';

const storyChapters = [
  { number: '01', year: 'The first rack', title: 'A chance encounter.', copy: 'Berawal dari satu meja, obrolan kecil, dan pertandingan yang seharusnya singkat. Tidak ada yang menyangka malam itu akan menjadi pembuka cerita yang panjang.', image: '/images/couple-hands.jpg' },
  { number: '08', year: 'Learning the angles', title: 'Growing into a team.', copy: 'Kami belajar bahwa hidup, seperti permainan, tidak selalu berjalan lurus. Ada sudut yang harus dipahami, jeda yang harus dihargai, dan pasangan yang selalu bisa diandalkan.', image: '/images/billiard-break.jpg' },
  { number: '∞', year: 'The next game', title: 'Choosing forever.', copy: 'Kini kami memilih untuk memainkan seluruh musim kehidupan dalam satu tim—menyambut setiap kemenangan, kesalahan, dan kejutan bersama-sama.', image: '/images/empty-table.jpg' },
];

function useCountdown() {
  const [now, setNow] = useState(WEDDING_DATE.getTime());
  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearTimeout(firstTick); window.clearInterval(timer); };
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
  const response = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = (await response.json()) as { ok?: boolean; message?: string };
  if (!response.ok || !result.ok) throw new Error(result.message || 'Gagal menyimpan data.');
  return result;
}

function smoothProgress(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export default function Home() {
  const sequenceRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [attendance, setAttendance] = useState<Attendance>('hadir');
  const [rsvpState, setRsvpState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [wishState, setWishState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown();

  useEffect(() => {
    let measureFrame = 0;
    let smoothingFrame = 0;
    let targetProgress = 0;
    let renderedProgress = 0;
    const shouldSmoothTouchScroll =
      window.matchMedia('(pointer: coarse)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderSmoothedProgress = () => {
      const distance = targetProgress - renderedProgress;
      renderedProgress += distance * 0.18;
      setScrollProgress(renderedProgress);

      if (Math.abs(distance) > 0.00025) {
        smoothingFrame = window.requestAnimationFrame(renderSmoothedProgress);
      } else {
        renderedProgress = targetProgress;
        setScrollProgress(targetProgress);
        smoothingFrame = 0;
      }
    };

    const update = () => {
      measureFrame = 0;
      const element = sequenceRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        const distance = Math.max(1, element.offsetHeight - window.innerHeight);
        targetProgress = Math.min(1, Math.max(0, -rect.top / distance));
        if (shouldSmoothTouchScroll) {
          if (!smoothingFrame) smoothingFrame = window.requestAnimationFrame(renderSmoothedProgress);
        } else {
          renderedProgress = targetProgress;
          setScrollProgress(targetProgress);
        }
      }
      const pageDistance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      document.documentElement.style.setProperty('--page-progress', String(window.scrollY / pageDistance));
    };
    const onScroll = () => { if (!measureFrame) measureFrame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      if (smoothingFrame) window.cancelAnimationFrame(smoothingFrame);
    };
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { (entry.target as HTMLElement).classList.add('is-inview'); observer.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: 'submit_wedding_rsvp', title: 'Konfirmasi kehadiran', description: 'Mengirim konfirmasi kehadiran tamu untuk pernikahan Gerald dan Angie.',
      inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 2 }, attendance: { type: 'string', enum: ['hadir', 'tidak-hadir', 'ragu'] }, guests: { type: 'integer', minimum: 1, maximum: 4 }, note: { type: 'string' } }, required: ['name', 'attendance', 'guests'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const value = input as { name?: string; attendance?: Attendance; guests?: number; note?: string };
        if (!value.name || !value.attendance || !value.guests) throw new Error('Nama, status, dan jumlah tamu wajib diisi.');
        await saveSubmission({ kind: 'rsvp', ...value }); setRsvpState('saved');
        return { status: 'confirmed', attendance: value.attendance, guests: value.guests };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  async function submitRsvp(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setRsvpState('saving'); const data = new FormData(event.currentTarget);
    try { await saveSubmission({ kind: 'rsvp', name: data.get('name'), attendance, guests: Number(data.get('guests') || 1), note: data.get('note') }); setRsvpState('saved'); }
    catch { setRsvpState('error'); }
  }

  async function submitWish(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setWishState('saving'); const form = event.currentTarget; const data = new FormData(form);
    try { await saveSubmission({ kind: 'wish', name: data.get('name'), note: data.get('note') }); setWishState('saved'); form.reset(); }
    catch { setWishState('error'); }
  }

  async function copyAccount() { await navigator.clipboard.writeText('1234567890'); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }

  const approach = smoothProgress(scrollProgress, 0.08, 0.22);
  const pull = smoothProgress(scrollProgress, 0.22, 0.4);
  const strike = smoothProgress(scrollProgress, 0.4, 0.54);
  const travel = smoothProgress(scrollProgress, 0.54, 0.72);
  const breakProgress = smoothProgress(scrollProgress, 0.72, 0.88);
  const reveal = smoothProgress(scrollProgress, 0.84, 0.97);
  const cueContact = Math.max(0, 1 - Math.abs(scrollProgress - 0.54) / 0.035);
  const impact = Math.max(0, 1 - Math.abs(scrollProgress - 0.72) / 0.042);
  const collision = impact * impact * (3 - 2 * impact);
  const cueTop = 112 + pull * 9 - strike * 12;
  const ballTop = 77 - travel * 38;
  const ballCompression = cueContact * cueContact * (3 - 2 * cueContact) * (1 - travel);
  const sceneStyle = {
    '--scene-progress': scrollProgress,
    '--approach': approach,
    '--pull': pull,
    '--strike': strike,
    '--travel': travel,
    '--impact': impact,
    '--break': breakProgress,
    '--reveal': reveal,
  } as CSSProperties;

  return (
    <main className="site-shell">
      <div className="page-progress" aria-hidden="true"><span /></div>
      <section className="break-sequence" ref={sequenceRef} style={sceneStyle} aria-label="Animasi pembuka billiard yang dikendalikan dengan scroll">
        <div className="break-stage" style={{ transform: `translate(${collision * 1.2}px, ${collision * -0.8}px)` }}>
          <Image src="/images/empty-table.jpg" alt="Meja billiard elegan" fill priority className="break-background" sizes="100vw" />
          <div className="break-vignette" /><div className="ambient-light" /><div className="table-line table-line-left" /><div className="table-line table-line-right" />
          <div className="opening-copy"><span className="eyebrow">The wedding invitation of</span><h1><span>Gerald</span><i>&amp;</i><span>Angie</span></h1><p className="cover-date">18 · 07 · 2027</p><div className="guest-card"><span>Kepada Yth.</span><strong>Tamu Undangan</strong><small>Mohon maaf apabila ada kesalahan penulisan nama.</small></div></div>
          <Image src="/images/ball-rack.png" width={760} height={760} alt="Susunan bola siap di-break" className="intact-rack" style={{ transform: `translate(-50%, -50%) scale(${0.72 + approach * 0.18 + collision * 0.035})`, opacity: Math.max(0, approach * 1.25 - breakProgress * 1.45) }} priority />
          <Image src="/images/scattered-balls.png" width={1000} height={1000} alt="Bola billiard menyebar setelah break" className="scattered-rack" style={{ transform: `translate(-50%, -50%) scale(${0.52 + breakProgress * 0.68}) rotate(${breakProgress * 5}deg)`, opacity: smoothProgress(breakProgress, 0.04, 0.55) * (1 - reveal * 0.48) }} priority />
          <div className="cue-aim-line" aria-hidden="true" style={{ opacity: approach * (1 - travel) * 0.7, transform: `scaleY(${0.4 + pull * 0.6})` }} />
          <Image src="/images/pool-cue.png" width={2172} height={724} alt="Tongkat billiard ditarik sebelum memukul" className="moving-cue-stick" style={{ top: `${cueTop}%`, opacity: approach * (1 - smoothProgress(travel, 0.25, 0.92)), filter: `drop-shadow(0 1.2rem 1rem rgba(0,0,0,.55)) blur(${travel * 0.7}px)` }} priority />
          <div className="cue-ball-trail" aria-hidden="true" style={{ top: `${ballTop + 7}%`, height: `${travel * 35}svh`, opacity: travel * (1 - breakProgress) }} />
          <Image src="/images/cue-ball.png" width={280} height={280} alt="Bola putih meluncur menuju susunan bola" className="moving-cue-ball" style={{ top: `${ballTop}%`, transform: `translate(-50%, -50%) scaleX(${0.82 + approach * 0.18 + ballCompression * 0.08}) scaleY(${0.82 + approach * 0.18 - ballCompression * 0.08})`, opacity: approach * (1 - smoothProgress(breakProgress, 0.12, 0.7)), filter: `drop-shadow(0 ${1.2 + travel * 1.2}rem ${0.8 + travel}px rgba(0,0,0,.58)) blur(${travel * 0.35}px)` }} priority />
          <div className="chalk-burst" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="impact-ring" aria-hidden="true" /><div className="speed-lines" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <div className="reveal-copy"><span className="eyebrow">The perfect break</span><h2>Gerald <i>&amp;</i> Angie</h2><p>One table. Two players. One forever.</p></div>
          <div className="scroll-instruction"><span>{scrollProgress < 0.2 ? 'Scroll to line up the shot' : scrollProgress < 0.4 ? 'Pull back' : scrollProgress < 0.72 ? 'Take the shot' : scrollProgress < 0.88 ? 'Watch the break' : 'Enter the story'}</span><ArrowDown aria-hidden="true" /></div>
          <div className="sequence-progress"><span /></div><div className="cover-index">Private table · No. 08</div>
        </div>
      </section>

      <div className="invitation-content">
        <nav className="club-nav" aria-label="Navigasi undangan"><a href="#story" className="monogram" aria-label="Gerald dan Angie">G<span>·</span>A</a><div className="nav-date"><span>JUL</span><strong>18</strong><span>2027</span></div><a className="nav-rsvp" href="#rsvp">RSVP <ArrowUpRight /></a></nav>

        <section className="intro-section motion-section" id="story">
          <div className="intro-orbit orbit-one" aria-hidden="true"><span>8</span></div><div className="intro-orbit orbit-two" aria-hidden="true"><span>1</span></div>
          <p className="section-number" data-reveal>01 / The opening shot</p><div className="intro-title" data-reveal><span>One table.</span><span>Two players.</span><em>One forever.</em></div>
          <div className="intro-note" data-reveal><span className="rule" /><p>Dari pertandingan kecil yang tak pernah benar-benar ingin kami menangkan sendiri, tumbuh satu keputusan besar: menjalani seluruh permainan kehidupan ini sebagai satu tim.</p></div><div className="intro-stamp" aria-hidden="true">G · A</div>
        </section>

        <section className="couple-section motion-section">
          <div className="couple-manifesto" data-reveal><span className="eyebrow dark">Dengan penuh sukacita</span><p>Kami mengundang Anda untuk hadir saat dua cerita, dua keluarga, dan dua sahabat memilih menjadi satu tim.</p></div>
          <div className="couple-table"><article className="player-card player-one" data-reveal><span className="player-number">01</span><span className="role">The Bride</span><h2>Angie</h2><p>Putri dari<br /><strong>Bapak Hendra Maheswara</strong><br />&amp; <strong>Ibu Larasati</strong></p></article><div className="versus-mark" data-reveal><span>&amp;</span><small>partners</small></div><article className="player-card player-two" data-reveal><span className="player-number">02</span><span className="role">The Groom</span><h2>Gerald</h2><p>Putra dari<br /><strong>Bapak Bima Pradana</strong><br />&amp; <strong>Ibu Ratih</strong></p></article></div>
        </section>

        <section className="cinema-quote motion-section"><Image src="/images/couple-hands.jpg" alt="Sepasang tangan di tepi meja billiard" fill className="quote-image" sizes="100vw" /><div className="quote-shade" /><div className="quote-copy" data-reveal><span className="quote-mark">“</span><blockquote>The best partnerships are built on trust, patience, and knowing exactly when to take the shot.</blockquote><span className="quote-caption">A story about choosing the same side</span></div></section>

        <section className="story-section motion-section"><div className="story-heading" data-reveal><p className="section-number">02 / Our game</p><h2>Every shot<br />led us <em>here.</em></h2></div><div className="story-track">{storyChapters.map((chapter, index) => <article className="story-card" key={chapter.number} data-reveal style={{ '--delay': `${index * 90}ms` } as CSSProperties}><div className="story-photo"><Image src={chapter.image} alt="" fill sizes="(max-width: 800px) 86vw, 30vw" /><span className="story-ball">{chapter.number}</span></div><span className="story-year">{chapter.year}</span><h3>{chapter.title}</h3><p>{chapter.copy}</p></article>)}</div></section>

        <section className="date-section motion-section" id="date"><div className="date-light" aria-hidden="true" /><div className="date-heading" data-reveal><p className="section-number">03 / Save the date</p><h2>The day<br /><em>we break together.</em></h2></div><div className="countdown" aria-label="Hitung mundur menuju hari pernikahan" data-reveal>{countdown.map((item) => <div key={item.label}><strong>{String(item.value).padStart(2, '0')}</strong><span>{item.label}</span></div>)}</div><div className="date-lockup" data-reveal><span>Minggu</span><strong>18</strong><span>Juli · 2027</span></div><div className="events-grid"><article className="event-card" data-reveal><span className="event-ball">1</span><span className="event-chip">Akad Nikah</span><h3>10.00<br /><small>— 11.00 WIB</small></h3><p><MapPin /> The Glasshouse, Jakarta</p></article><article className="event-card event-card-dark" data-reveal><span className="event-ball">8</span><span className="event-chip">Resepsi</span><h3>12.00<br /><small>— 15.00 WIB</small></h3><p><MapPin /> The Glasshouse, Jakarta</p></article></div><div className="action-row" data-reveal><a className="text-button" href="https://maps.google.com/?q=Jakarta" target="_blank" rel="noreferrer"><MapPin /> Buka Google Maps <ArrowUpRight /></a><a className="text-button" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Gerald%20%26%20Angie%20Wedding&dates=20270718T030000Z/20270718T080000Z&location=Jakarta" target="_blank" rel="noreferrer"><CalendarDays /> Tambah ke Kalender <ArrowUpRight /></a></div></section>

        <section className="dresscode-section motion-section"><div className="dress-copy" data-reveal><p className="section-number">04 / Dress code</p><h2>Evening<br />at the <em>club.</em></h2><p>Formal attire dengan palet gelap dan hangat. Pilih warna yang membuat Anda nyaman bergerak dan merayakan malam bersama kami.</p></div><div className="swatch-fan" data-reveal aria-label="Palet warna dress code"><span className="swatch emerald"><b>01</b><small>Emerald</small></span><span className="swatch black"><b>02</b><small>Black</small></span><span className="swatch burgundy"><b>03</b><small>Burgundy</small></span><span className="swatch champagne"><b>04</b><small>Champagne</small></span></div></section>

        <section className="rundown-section motion-section"><div className="rundown-heading" data-reveal><p className="section-number">05 / The match plan</p><h2>Rundown</h2></div><ol className="timeline">{[['10.00', 'Akad Nikah', 'Ijab kabul dan doa bersama'], ['11.30', 'Guest Arrival', 'Registrasi dan welcome drinks'], ['12.00', 'Grand Entrance', 'Perkenalan kedua mempelai'], ['13.00', 'Lunch & Toast', 'Santap siang dan ucapan keluarga'], ['14.30', 'Open Table', 'Foto, musik, dan friendly match']].map(([time, title, detail], index) => <li key={time} data-reveal style={{ '--delay': `${index * 65}ms` } as CSSProperties}><span className="timeline-ball">{index + 1}</span><time>{time}</time><div><strong>{title}</strong><p>{detail}</p></div></li>)}</ol></section>

        <section className="gallery-section motion-section" id="gallery"><div className="gallery-heading" data-reveal><p className="section-number">06 / Frames we keep</p><h2>Portraits<br />of <em>our game.</em></h2></div><div className="gallery-stage"><figure className="gallery-frame gallery-frame-a" data-reveal><Image src="/images/couple-hands.jpg" alt="Detail romantis pasangan di meja billiard" fill sizes="(max-width: 800px) 92vw, 58vw" /></figure><figure className="gallery-frame gallery-frame-b" data-reveal><Image src="/images/billiard-break.jpg" alt="Break bola billiard di klub elegan" fill sizes="(max-width: 800px) 76vw, 35vw" /></figure><div className="gallery-note" data-reveal><Sparkles /><p>Setiap permainan punya jeda. Ini adalah momen yang ingin kami simpan selamanya.</p></div><div className="gallery-number" aria-hidden="true">08</div></div></section>

        <section className="rsvp-section motion-section" id="rsvp"><div className="rsvp-copy" data-reveal><p className="section-number">07 / Reserve your spot</p><h2>Will you<br /><em>join the table?</em></h2><p>Konfirmasi kehadiran paling lambat 30 Juni 2027 agar kami dapat menyiapkan tempat terbaik untuk Anda.</p><div className="rsvp-seal"><span>G</span><i>&amp;</i><span>A</span></div></div><form className="rsvp-form" onSubmit={submitRsvp} data-reveal><div className="form-heading"><span>Private table</span><strong>RSVP</strong><small>18 · 07 · 2027</small></div><label htmlFor="rsvp-name">Nama lengkap</label><Input id="rsvp-name" name="name" required placeholder="Nama Anda" /><fieldset><legend>Konfirmasi kehadiran</legend><RadioGroup value={attendance} onValueChange={(value) => setAttendance(value as Attendance)} className="attendance-options">{[['hadir', 'Hadir'], ['ragu', 'Masih ragu'], ['tidak-hadir', 'Tidak hadir']].map(([value, label]) => <label key={value}><RadioGroupItem value={value} />{label}</label>)}</RadioGroup></fieldset><label htmlFor="rsvp-guests">Jumlah tamu</label><Input id="rsvp-guests" name="guests" type="number" min="1" max="4" defaultValue="1" required /><label htmlFor="rsvp-note">Pesan atau kebutuhan khusus</label><Textarea id="rsvp-note" name="note" placeholder="Contoh: alergi makanan, aksesibilitas, atau pesan singkat" /><Button type="submit" className="submit-button" disabled={rsvpState === 'saving' || rsvpState === 'saved'}>{rsvpState === 'saved' ? <><Check /> Kehadiran tercatat</> : rsvpState === 'saving' ? 'Menyimpan…' : <><Send /> Kirim konfirmasi</>}</Button>{rsvpState === 'error' && <p className="form-error">Belum berhasil tersimpan. Coba sekali lagi ya.</p>}</form></section>

        <section className="gift-section motion-section"><div className="gift-copy" data-reveal><Gift /><p className="section-number">08 / Wedding gift</p><h2>A little<br /><em>something.</em></h2><p>Kehadiran dan doa Anda adalah hadiah terbaik. Namun bila ingin mengirim tanda kasih, amplop digital tersedia di sini.</p></div><div className="bank-card" data-reveal><div className="bank-glow" /><div className="bank-top"><span>Private banking</span><small>G · A</small></div><div className="bank-detail"><span>Bank Central Asia</span><strong>1234&nbsp; 5678&nbsp; 90</strong><small>a.n. Angie</small></div><Button variant="outline" onClick={copyAccount}>{copied ? <Check /> : <Copy />}{copied ? 'Tersalin' : 'Salin nomor'}</Button><p>Data rekening ini masih contoh dan siap diganti dengan detail pasangan.</p></div></section>

        <section className="wishes-section motion-section"><div className="wishes-orbit" aria-hidden="true"><span>8</span></div><div data-reveal><p className="section-number">09 / Leave a note</p><h2>Send your<br /><em>best shot.</em></h2></div><form onSubmit={submitWish} className="wish-form" data-reveal><label htmlFor="wish-name">Nama</label><Input id="wish-name" name="name" required placeholder="Nama Anda" /><label htmlFor="wish-note">Doa dan ucapan</label><Textarea id="wish-note" name="note" required minLength={3} placeholder="Tulis doa dan ucapan untuk Gerald & Angie" /><Button type="submit" disabled={wishState === 'saving' || wishState === 'saved'}>{wishState === 'saved' ? <><Check /> Ucapan terkirim</> : wishState === 'saving' ? 'Mengirim…' : <><Send /> Kirim ucapan</>}</Button>{wishState === 'error' && <p className="form-error">Ucapan belum terkirim. Silakan coba lagi.</p>}</form></section>

        <footer className="motion-section"><div className="footer-light" /><div className="footer-ball" aria-hidden="true">8</div><p data-reveal>Terima kasih telah menjadi bagian dari cerita kami.</p><h2 data-reveal>Gerald <span>&amp;</span> Angie</h2><small data-reveal>#ThePerfectBreak · 18.07.2027</small></footer>
      </div>
    </main>
  );
}
