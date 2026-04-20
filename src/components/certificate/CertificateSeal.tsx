import QRCode from "qrcode";

type Props = {
  verifyUrl: string;
  /** Tailwind text color class for the label (e.g. "text-red", "text-amber"). */
  labelClass: string;
  /** Hex/CSS color used for the QR modules. */
  color: string;
  /** Tailwind border color class (e.g. "border-red/40"). */
  borderClass: string;
};

/**
 * QR-coded verification seal rendered into the top-right of the
 * certificate. Encodes the public verify URL so a recruiter can scan
 * the cert image with their phone and land directly on the issued
 * page on breachlab.org — proves authenticity without us shipping any
 * verification API.
 */
export async function CertificateSeal({
  verifyUrl,
  labelClass,
  color,
  borderClass,
}: Props) {
  const svg = await QRCode.toString(verifyUrl, {
    type: "svg",
    margin: 1,
    width: 96,
    errorCorrectionLevel: "M",
    color: {
      dark: color,
      light: "#00000000",
    },
  });

  return (
    <div
      aria-hidden
      className={`flex flex-col items-center gap-1 border ${borderClass} p-2 select-none`}
    >
      <div
        className="w-24 h-24"
        // qrcode lib output is a static SVG element we control input to,
        // so this is safe — no user-generated HTML lands in here.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className={`text-[8px] tracking-[0.25em] ${labelClass}`}>
        SCAN TO VERIFY
      </div>
    </div>
  );
}
