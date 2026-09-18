"use client";

export default function Overlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
      style={{ background: "rgba(30,24,38,0.66)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      {children}
    </div>
  );
}
