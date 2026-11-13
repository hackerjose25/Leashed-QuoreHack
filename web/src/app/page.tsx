"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowRightCircle, Zap, LockKeyhole, Fingerprint, Menu, X } from "lucide-react";

const VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_003132_8b7edcb6-c64d-4a52-a9ca-879942e122ad.mp4";
const EASE = [0.22, 1, 0.36, 1] as const;
const GITHUB = "https://github.com/hackerjose25/QuoreHack";

const NAV: { label: string; href: string }[] = [
  { label: "Vault", href: "/app" },
  { label: "Agent", href: "/app" },
  { label: "Leashes", href: `${GITHUB}/blob/main/docs/ARCHITECTURE.md` },
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
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="mt-auto flex flex-wrap gap-3 pt-12">
      {items.map(([v, l]) => (
        <div key={l} className="rounded-2xl px-5 py-3.5" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(25,40,55,0.08)", backdropFilter: "blur(10px)" }}>
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
    <div className="relative min-h-screen w-full overflow-hidden" style={{ fontFamily: "var(--font-body)", color: "var(--color-text)" }}>
      <video className="absolute inset-0 h-full w-full object-cover" src={VIDEO} autoPlay muted loop playsInline />

      {/* Navbar */}
      <nav className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
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
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-[1280px] flex-col px-5 pb-8 sm:px-8">
        <div style={{ maxWidth: 640, paddingTop: "clamp(40px, 9vh, 96px)" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(25,40,55,0.08)", backdropFilter: "blur(8px)" }}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#22c55e" }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#22c55e" }} /></span>
            Live on QoreChain testnet · Post-Quantum AI Agents
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(3.5rem, 10vw, 7rem)", lineHeight: 0.95, letterSpacing: "-0.04em", color: "#192837" }}>
            Leashed<span style={{ color: "#7342E2" }}>.</span>
          </motion.h1>

          <motion.h2 variants={fadeUp} initial="hidden" animate="visible" custom={2}
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem, 3.2vw, 2.25rem)", lineHeight: 1.15, letterSpacing: "-0.01em", color: "#192837", marginTop: 20, marginBottom: 20, textWrap: "balance" }}>
            <Zap style={iconStyle} /> Let AI run your treasury<br className="hidden sm:block" />{" "}
            on a post-quantum leash <LockKeyhole style={iconStyle} />
          </motion.h2>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={3}
            style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)", lineHeight: 1.65, opacity: 0.8, maxWidth: 520 }}>
            Zero blind trust, total control. An AI agent pays your vendors on-chain, bounded by a smart contract and an ML-DSA key it can never touch.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="mt-9 flex flex-wrap items-center gap-3">
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
  );
}
