import TiltedCard, { TiltedCardLayer } from './bits/TiltedCard'

function Chip() {
  return (
    <svg width="44" height="34" viewBox="0 0 44 34" aria-hidden="true">
      <rect width="44" height="34" rx="6" fill="#e8c872" />
      <rect x="1.2" y="1.2" width="41.6" height="31.6" rx="5" fill="none" stroke="#c9a24a" />
      <path d="M0 12.5h44M0 21.5h44M16 0v34M28 0v34" stroke="#c9a24a" strokeWidth="1" />
      <rect x="16" y="12.5" width="12" height="9" fill="#dfb65a" />
    </svg>
  )
}

function Contactless() {
  return (
    <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true" className="text-white/80">
      <path
        d="M6 8c4 3.2 4 8.8 0 12M11 5c5.4 4.2 5.4 13.6 0 18M16 2c6.8 5.2 6.8 18.6 0 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function WalletFileCard() {
  return (
    <TiltedCard
      containerWidth="100%"
      containerHeight="230px"
      imageWidth="100%"
      imageHeight="230px"
      radius={22}
      scaleOnHover={1.04}
      rotateAmplitude={14}
      glare={0}
      shadow={0.45}
      floating
      intro={false}
      captionText="Flip for the fine print"
      showTooltip
      flipOnClick
      altText="Wallet file card"
      backContent={
        <div className="wallet-plastic wallet-plastic-back flex h-full flex-col justify-between p-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Magnetic strip? Nope.</p>
          <p className="text-lg font-semibold leading-snug">
            Income, accounts, and spending live in this JSON — not a browser profile, not our servers.
          </p>
          <p className="font-mono text-xs tracking-wide text-white/75">Documents/bluxit/bluxit.json</p>
        </div>
      }
    >
      <TiltedCardLayer
        depth={18}
        className="wallet-plastic flex h-full flex-col justify-between p-6 text-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">bluxit</p>
            <p className="mt-1 text-sm font-medium">Wallet debit</p>
          </div>
          <Contactless />
        </div>
        <Chip />
        <div>
          <p className="font-mono text-[15px] tracking-[0.18em] sm:text-lg">
            DOCS · BLUXIT · JSON
          </p>
          <div className="mt-3 flex items-end justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-white/75">
            <span>Your file</span>
            <span>On device</span>
          </div>
        </div>
      </TiltedCardLayer>
    </TiltedCard>
  )
}
