"use client";
import Link from "next/link";
import { useState } from "react";
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

const iconStyle: React.CSSProperties = { display: "inline-block", verticalAlign: "middle", position: "relative", top: -2, color: "#192837" };

export default function Landing() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ fontFamily: "var(--font-body)", color: "var(--color-text)" }}>
      <video className="absolute inset-0 h-full w-full object-cover" src={VIDEO} autoPlay muted loop playsInline />

      {/* Navbar */}
      <nav className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <Link href="/" aria-label="Leashed home"><Logo /></Link>
        <div className="hidden items-center gap-8 md:flex">
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
                <Logo />
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
      <main className="relative z-10 mx-auto max-w-[1280px] px-5 sm:px-8" style={{ paddingTop: "clamp(40px, 8vw, 72px)" }}>
        <div style={{ maxWidth: 560 }}>
          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0}
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.65rem, 5vw, 3rem)", lineHeight: 1.05, letterSpacing: "-0.01em", color: "#192837", marginBottom: 24 }}>
            <Zap size={24} style={iconStyle} /> Let AI Run Your Treasury <LockKeyhole size={24} style={iconStyle} /> on a Post-Quantum Leash <Fingerprint size={24} style={iconStyle} />
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={1}
            style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)", lineHeight: 1.65, opacity: 0.8, maxWidth: 560 }}>
            Zero blind trust, total control. Leashed&apos;s AI agent pays your vendors on-chain, bounded by a smart contract and an ML-DSA key it can never touch.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="mt-8">
            <motion.div whileHover={{ scale: 1.04, filter: "brightness(1.1)" }} whileTap={{ scale: 0.96 }} className="inline-block">
              <Link href="/app" className="flex items-center justify-between font-semibold text-white"
                style={{ background: "#7342E2", borderRadius: 50, padding: "17px 24px", fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2vw, 1rem)", boxShadow: "0 4px 24px rgba(115,66,226,0.28)", minWidth: 210, gap: 32 }}>
                Launch the App <ArrowRightCircle size={20} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
