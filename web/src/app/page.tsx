"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowRightCircle, Zap, LockKeyhole, Fingerprint, Menu, X, MessageSquareText, ShieldCheck, Send, FileCode2, KeyRound, ArrowUpRight } from "lucide-react";

const VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_003132_8b7edcb6-c64d-4a52-a9ca-879942e122ad.mp4";
const EASE = [0.22, 1, 0.36, 1] as const;
const GITHUB = "https://github.com/hackerjose25/QuoreHack";

const NAV: { label: string; href: string }[] = [
  { label: "Vault", href: "/app" },
  { label: "Agent", href: "/app" },
  { label: "Leashes", href: "#what" },
  { label: "Security", href: `${GITHUB}/blob/main/docs/ARCHITECTURE.md#3-threat-model-what-we-claim-and-only-that` },
  { label: "GitHub", href: GITHUB },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6, ease: EASE } }),
};

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" overflow="visible" viewBox="0 0 256 256" aria-label="Leashed">
      <path d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z" fill="#192837" />
    </svg>
  );
}

const NavLink = ({ href, children, className = "", style }: { href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) =>
  href.startsWith("http")
    ? <a href={href} target="_blank" rel="noreferrer" className={className} style={style}>{children}</a>
    : <Link href={href} className={className} style={style}>{children}</Link>;

function CtaButtons({ onClick }: { onClick?: () => void }) {
  return (
    <>
      <Link href="/app" onClick={onClick} className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90" style={{ background: "#7342E2" }}>Launch App</Link>
      <a href={GITHUB} target="_blank" rel="noreferrer" onClick={onClick} className="rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-80" style={{ background: "#F2F2EE", color: "#192837" }}>View Source</a>
    </>
  );
}

const iconStyle: React.CSSProperties = { display: "inline-block", width: "0.8em", height: "0.8em", verticalAlign: "middle", position: "relative", top: "-0.08em", color: "#7342E2" };

type Live = { treasury?: { balance: string; remainingToday: string }; window?: { live?: boolean; remaining_txs?: string }; history?: unknown[] };
function LiveStats() {
  const [d, setD] = useState<Live | null>(null);
  useEffect(() => { fetch("/api/state").then((r) => r.json()).then(setD).catch(() => {}); }, []);
  const items: [string, string][] = [
    [d?.treasury ? `${Number(d.treasury.balance).toLocaleString()} fUSD` : "—", "in the vault"],
    [d?.treasury ? `${Number(d.treasury.remainingToday).toLocaleString()} fUSD` : "—", "agent can still spend today"],
    [d?.window ? (d.window.live ? `${d.window.remaining_txs} txs` : "closed") : "—", "left on the PQC leash"],
  ];
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="mt-auto flex flex-wrap gap-3 pt-4">
      {items.map(([v, l]) => (
        <div key={l} className="rounded-2xl px-5 py-2.5" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(25,40,55,0.08)", backdropFilter: "blur(10px)" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 22, letterSpacing: "-0.01em" }}>{v}</p>
          <p className="text-xs" style={{ opacity: 0.6 }}>{l}</p>
        </div>
      ))}
    </motion.div>
  );
}

export default function Landing() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--color-text)", background: "#F2F2EE" }}>
    <div className="relative flex min-h-[100svh] w-full flex-col overflow-hidden md:h-[100svh] md:min-h-[620px]">
      <video className="absolute inset-0 h-full w-full object-cover" src={VIDEO} autoPlay muted loop playsInline />

      {/* Navbar */}
      <nav className="relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <Link href="/" aria-label="Leashed home" className="flex items-center gap-2.5">
          <Logo />
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, letterSpacing: "-0.02em" }}>Leashed<span style={{ color: "#7342E2" }}>.</span></span>
        </Link>
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.label} href={n.href} className="text-sm font-medium transition-opacity hover:opacity-60">{n.label}</NavLink>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex"><CtaButtons /></div>
        <button className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={26} color="#192837" /></button>
      </nav>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40" style={{ background: "rgba(25,40,55,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed right-0 top-0 z-50 flex flex-col p-6"
              style={{ width: "min(88vw, 360px)", height: "100dvh", background: "#CFC8C5", boxShadow: "-12px 0 48px rgba(25,40,55,0.18)" }}
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ ease: EASE, duration: 0.45 }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5"><Logo /><span style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>Leashed<span style={{ color: "#7342E2" }}>.</span></span></span>
                <button aria-label="Close menu" onClick={() => setOpen(false)}><X size={26} color="#192837" /></button>
              </div>
              <div className="my-5 h-px w-full" style={{ background: "rgba(25,40,55,0.15)" }} />
              <div className="flex flex-col gap-5">
                {NAV.map((n, i) => (
                  <motion.div key={n.label} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 + i * 0.07, ease: EASE, duration: 0.45 }}>
                    <NavLink href={n.href} className="text-lg font-medium">{n.label}</NavLink>
                  </motion.div>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-3 text-center"><CtaButtons onClick={() => setOpen(false)} /></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col px-5 pb-[3vh] sm:px-8">
        <div style={{ maxWidth: 640, paddingTop: "clamp(8px, 4vh, 72px)" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="mb-[2.5vh] inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(25,40,55,0.08)", backdropFilter: "blur(8px)" }}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#22c55e" }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#22c55e" }} /></span>
            Live on QoreChain testnet · Post-Quantum AI Agents
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(3rem, min(10vw, 12.5vh), 7rem)", lineHeight: 0.95, letterSpacing: "-0.04em", color: "#192837" }}>
            Leashed<span style={{ color: "#7342E2" }}>.</span>
          </motion.h1>

          <motion.h2 variants={fadeUp} initial="hidden" animate="visible" custom={2}
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.25rem, min(3.2vw, 4.3vh), 2.25rem)", lineHeight: 1.15, letterSpacing: "-0.01em", color: "#192837", marginTop: "2vh", marginBottom: "2vh", textWrap: "balance" }}>
            <Zap style={iconStyle} /> Let AI run your treasury<br className="hidden sm:block" />{" "}
            on a post-quantum leash <LockKeyhole style={iconStyle} />
          </motion.h2>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={3}
            style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, min(2.2vw, 2.4vh), 1.1rem)", lineHeight: 1.6, opacity: 0.8, maxWidth: 520 }}>
            Zero blind trust, total control. An AI agent pays your vendors on-chain, bounded by a smart contract and an ML-DSA key it can never touch.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="mt-[3.5vh] flex flex-wrap items-center gap-3">
            <motion.div whileHover={{ scale: 1.04, filter: "brightness(1.1)" }} whileTap={{ scale: 0.96 }} className="inline-block">
              <Link href="/app" className="flex items-center justify-between font-semibold text-white"
                style={{ background: "#7342E2", borderRadius: 50, padding: "17px 24px", fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2vw, 1rem)", boxShadow: "0 4px 24px rgba(115,66,226,0.28)", minWidth: 210, gap: 32 }}>
                Launch the App <ArrowRightCircle size={20} />
              </Link>
            </motion.div>
            <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} href={`${GITHUB}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 font-semibold"
              style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(25,40,55,0.1)", borderRadius: 50, padding: "16px 22px", fontSize: "clamp(0.9rem, 2vw, 1rem)", backdropFilter: "blur(8px)" }}>
              <Fingerprint size={18} /> How it works
            </motion.a>
          </motion.div>
        </div>

        <LiveStats />
      </main>
    </div>
      <WhatItDoes />
      <Footer />
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid rgba(25,40,55,0.08)", borderRadius: 24, boxShadow: "0 1px 2px rgba(25,40,55,0.04), 0 12px 32px rgba(25,40,55,0.05)" };
const h2Style: React.CSSProperties = { fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1.05, letterSpacing: "-0.02em", textWrap: "balance" };

const STEPS = [
  { Icon: MessageSquareText, n: "01", t: "You ask in plain English", d: "“Pay CloudHost 200 fUSD for hosting.” Paste an invoice or type a sentence. The AI agent reads the treasury and picks the right vendor." },
  { Icon: ShieldCheck, n: "02", t: "The vault rehearses it", d: "Every payment is simulated against the vault first. Wrong vendor, over a cap, or a prompt-injection trick? It is refused, and nothing is spent." },
  { Icon: Send, n: "03", t: "It pays, or asks you", d: "Small payments go out instantly with a tx hash. Anything above the approval threshold waits for the owner to sign off." },
];

const LEASHES = [
  { Icon: FileCode2, tag: "Leash 1 · Smart contract", t: "How much, and to whom", items: ["Whitelisted vendors only", "Per-payment, per-vendor and daily caps", "Owner approval above 500 fUSD", "Instant pause switch"] },
  { Icon: KeyRound, tag: "Leash 2 · Post-quantum window", t: "Where, how often, how long", items: ["Agent can call the vault and nothing else", "Limited transactions and blocks", "Opened only with the owner’s ML-DSA-87 key", "Close it and the agent stops next block"] },
];

function WhatItDoes() {
  const inView = { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.25 } } as const;
  return (
    <section id="what" className="relative mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32">
      <video className="what-coins" src="/coins.webm" autoPlay muted loop playsInline aria-hidden />
      <motion.p variants={fadeUp} {...inView} custom={0} className="relative z-10 text-sm font-semibold uppercase tracking-widest" style={{ color: "#7342E2" }}>What it does</motion.p>
      <motion.h2 variants={fadeUp} {...inView} custom={1} className="relative z-10 mt-3 max-w-xl" style={h2Style}>
        An AI treasurer that can pay, but can&apos;t go rogue.
      </motion.h2>
      <motion.p variants={fadeUp} {...inView} custom={2} className="relative z-10 mt-5 max-w-xl" style={{ fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)", lineHeight: 1.65, opacity: 0.75 }}>
        Leashed lets an AI agent handle everyday vendor payments from an on-chain vault, while two independent leashes make sure it can only ever do what you allowed.
      </motion.p>

      <div className="relative z-10 mt-14 grid gap-5 md:grid-cols-3">
        {STEPS.map(({ Icon, n, t, d }, i) => (
          <motion.div key={n} variants={fadeUp} {...inView} custom={i} whileHover={{ y: -6 }} className="p-7" style={card}>
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(115,66,226,0.1)", color: "#7342E2" }}><Icon size={22} /></span>
              <span className="font-mono text-sm" style={{ opacity: 0.35 }}>{n}</span>
            </div>
            <h3 className="mt-6" style={{ fontFamily: "var(--font-heading)", fontSize: 22, letterSpacing: "-0.01em" }}>{t}</h3>
            <p className="mt-2 text-[15px] leading-relaxed" style={{ opacity: 0.7 }}>{d}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 mt-5 grid gap-5 md:grid-cols-2">
        {LEASHES.map(({ Icon, tag, t, items }, i) => (
          <motion.div key={tag} variants={fadeUp} {...inView} custom={i} className="relative overflow-hidden p-8"
            style={{ ...card, background: i ? "#192837" : "#fff", color: i ? "#F2F2EE" : "#192837" }}>
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full" style={{ background: "#7342E2", opacity: i ? 0.35 : 0.08, filter: "blur(40px)" }} />
            <span className="relative inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: i ? "#b9a3f5" : "#7342E2" }}><Icon size={16} /> {tag}</span>
            <h3 className="relative mt-4" style={{ fontFamily: "var(--font-heading)", fontSize: 28, letterSpacing: "-0.01em" }}>{t}</h3>
            <ul className="relative mt-5 space-y-3 text-[15px]">
              {items.map((it) => (
                <li key={it} className="flex items-start gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#7342E2" }} /><span style={{ opacity: 0.8 }}>{it}</span></li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const cols: [string, [string, string][]][] = [
    ["Product", [["Dashboard", "/app"], ["AI agent", "/app"], ["What it does", "#what"]]],
    ["Resources", [["GitHub", GITHUB], ["Architecture", `${GITHUB}/blob/main/docs/ARCHITECTURE.md`], ["Build plan", `${GITHUB}/blob/main/docs/PLAN.md`]]],
    ["Network", [["Explorer", "https://explore.qore.network"], ["Vault contract", "https://explore.qore.network/address/0xb4d06cef7bded2122210442bf87d79ec80e13cb8"], ["fUSD token", "https://explore.qore.network/address/0x97143B771D34ddb9130b807b135Ae675A5a963CA"]]],
  ];
  return (
    <footer className="px-5 pb-8 sm:px-8">
      <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[32px] px-7 pb-8 pt-12 sm:px-12" style={{ background: "#192837", color: "#F2F2EE" }}>
        <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <svg width="28" height="28" viewBox="0 0 256 256" fill="none" aria-hidden><path d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z" fill="#F2F2EE" /></svg>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>Leashed<span style={{ color: "#9b7bf0" }}>.</span></span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ opacity: 0.6 }}>Give AI the keys to your treasury. Keep the leash.</p>
            <Link href="/app" className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110" style={{ background: "#7342E2" }}>
              Launch the App <ArrowRightCircle size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map(([title, links]) => (
              <div key={title}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ opacity: 0.45 }}>{title}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {links.map(([l, h]) => (
                    <li key={l}><NavLink href={h} className="inline-flex items-center gap-1 transition-opacity hover:opacity-60">{l}{h.startsWith("http") && <ArrowUpRight size={13} style={{ opacity: 0.5 }} />}</NavLink></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs" style={{ borderColor: "rgba(242,242,238,0.12)", opacity: 0.55 }}>
          <span>{"© 2026 Leashed · Built for the QoreChain hackathon"}</span>
          <span>{"Testnet only · No real funds · MIT licensed"}</span>
        </div>
      </div>
    </footer>
  );
}
