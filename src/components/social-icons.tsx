/**
 * Footer social/location icons — Facebook, Instagram, TikTok, Google Maps.
 *
 * Hand-written inline SVGs (currentColor) instead of pulling in an icon
 * library: keeps the bundle exactly as-is while still giving each brand
 * a recognizable, professional mark. Sizing/hover states mirror the
 * rest of the footer's link style (ink-500 -> coral-600 on hover).
 */

type SocialLink = {
  key: string;
  href: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
};

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.35c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.4-3.9 3.99v2.18H7.5v3h2.86V21h3.14Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 3h-2.9v12.2a2.9 2.9 0 1 1-2.1-2.79V9.3a5.9 5.9 0 1 0 5 5.83V9.65a7.4 7.4 0 0 0 4.2 1.3V8.05a4.5 4.5 0 0 1-4.2-4.2Z" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden="true">
      <path d="M12 21s-6.5-5.35-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.65 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </svg>
  );
}

const SOCIAL_LINKS: SocialLink[] = [
  { key: "facebook", href: "https://www.facebook.com/share/19isnXaKUR/", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", href: "https://www.instagram.com/freesia30100?stkn=am9vdXNlNWIyNXNs", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", href: "https://www.tiktok.com/@fressia17qena?_r=1&_t=ZS-9A3ZYdAaJPD", label: "TikTok", Icon: TikTokIcon },
  { key: "location", href: "https://maps.app.goo.gl/nruUev9P9YaFV4eq6", label: "Google Maps", Icon: LocationIcon },
];

export default function SocialIcons() {
  return (
    <div className="flex items-center gap-3">
      {SOCIAL_LINKS.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-500 ring-1 ring-blush-100 transition-all duration-300 hover:text-coral-600 hover:shadow-[var(--shadow-soft)]"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
