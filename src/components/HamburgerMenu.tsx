import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
    { label: 'Home', href: '/' },
    { label: 'Live Map', href: '/live' },
    { label: 'Tagebuch', href: '/#tagebuch' },
    { label: 'Infos', href: '/infos' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
];

export default function HamburgerMenu() {
    const [open, setOpen] = useState(false);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKey);
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, close]);

    return (
        <>
            {/* Hamburger Button */}
            <button
                onClick={() => setOpen(!open)}
                aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
                aria-expanded={open}
                style={{
                    position: 'fixed',
                    top: 'max(1rem, env(safe-area-inset-top, 1rem))',
                    right: '1rem',
                    zIndex: 10001,
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    background: open ? 'transparent' : 'var(--badge-bg)',
                    backdropFilter: open ? 'none' : 'blur(16px)',
                    WebkitBackdropFilter: open ? 'none' : 'blur(16px)',
                    border: open ? 'none' : '1px solid var(--badge-border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'background 0.3s ease',
                }}
            >
                {/* Animated hamburger lines → X */}
                <span style={{
                    display: 'block',
                    width: '20px',
                    height: '2px',
                    background: open ? '#fff' : 'var(--text-primary)',
                    borderRadius: '1px',
                    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
                    transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
                }} />
                <span style={{
                    display: 'block',
                    width: '20px',
                    height: '2px',
                    background: open ? '#fff' : 'var(--text-primary)',
                    borderRadius: '1px',
                    transition: 'opacity 0.2s ease',
                    opacity: open ? 0 : 1,
                }} />
                <span style={{
                    display: 'block',
                    width: '20px',
                    height: '2px',
                    background: open ? '#fff' : 'var(--text-primary)',
                    borderRadius: '1px',
                    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
                    transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
                }} />
            </button>

            {/* Overlay */}
            {open && (
                <div
                    onClick={close}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        animation: 'menuOverlayIn 0.3s ease both',
                    }}
                />
            )}

            {/* Slide-in panel */}
            <nav
                aria-label="Hauptnavigation"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10000,
                    width: '280px',
                    maxWidth: '85vw',
                    background: 'rgba(15, 20, 35, 0.95)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    padding: 'max(5rem, calc(env(safe-area-inset-top, 2rem) + 4rem)) 1.5rem 2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transform: open ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: open ? 'auto' : 'none',
                }}
            >
                {NAV_ITEMS.map((item, i) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={close}
                        style={{
                            display: 'block',
                            padding: '0.875rem 1rem',
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontSize: '1rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            borderRadius: '0.75rem',
                            transition: 'background 0.2s ease, color 0.2s ease',
                            opacity: open ? 1 : 0,
                            transform: open ? 'translateX(0)' : 'translateX(20px)',
                            transitionDelay: open ? `${0.05 + i * 0.04}s` : '0s',
                            transitionProperty: 'opacity, transform, background, color',
                            transitionDuration: '0.3s, 0.3s, 0.2s, 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                            (e.target as HTMLElement).style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.background = 'transparent';
                            (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                        }}
                    >
                        {item.label}
                    </Link>
                ))}

                {/* Bottom branding */}
                <div style={{
                    marginTop: 'auto',
                    paddingTop: '2rem',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.3)',
                    lineHeight: 1.6,
                }}>
                    Neusiedlersee Challenge
                </div>
            </nav>
        </>
    );
}
