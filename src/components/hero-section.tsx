import Image from "next/image";

/**
 * Freesia — reusable full-bleed Hero / banner section.
 *
 * These source photos are portrait product shots where the product
 * fills most of the frame height. Full page width + a short fixed
 * height + zero cropping of the product are mutually exclusive for a
 * photo shaped like this — geometrically, one of the three has to
 * give. We pick "zero cropping" every time: the photo is shown whole
 * (object-contain) at a generous, comfortable size, centered on a
 * brand-colored gradient (not a flat dead backdrop, not a second
 * blurred copy of the photo) so the band still reads as full-width,
 * intentional design rather than a photo floating in empty space.
 */
export default function HeroSection({
  image,
  alt,
  eyebrow,
  title,
  subtitle,
  naturalWidth,
  naturalHeight,
  priority = true,
}: {
  image: string;
  alt: string;
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  /** The image's real pixel width/height, so it renders at its true ratio. */
  naturalWidth: number;
  naturalHeight: number;
  priority?: boolean;
}) {
  return (
    <section className="relative flex w-full justify-center overflow-hidden bg-gradient-to-b from-ink-900 via-[#4a3226] to-ink-900">
      <Image
        src={image}
        alt={alt}
        width={naturalWidth}
        height={naturalHeight}
        sizes="100vw"
        priority={priority}
        className="animate-scale-reveal w-auto max-w-full object-contain transition-transform duration-[1200ms] ease-out will-change-transform hover:scale-[1.02]"
        style={{ height: "clamp(18rem, 42vw, 32rem)" }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 px-4 pb-8 text-center">
        {eyebrow && (
          <span
            className="section-eyebrow animate-fade-up rounded-full border border-gold-500/50 bg-ink-900/30 px-4 py-1 text-[11px] uppercase backdrop-blur"
            style={{ animationDelay: "450ms" }}
          >
            {eyebrow}
          </span>
        )}
        <h1
          className="display-heading animate-fade-up text-3xl text-white md:text-5xl [text-shadow:0_2px_12px_rgb(0_0_0_/_0.5)]"
          style={{ animationDelay: "650ms" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="animate-fade-up max-w-xl text-sm text-blush-100 md:text-base [text-shadow:0_1px_8px_rgb(0_0_0_/_0.5)]"
            style={{ animationDelay: "850ms" }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
