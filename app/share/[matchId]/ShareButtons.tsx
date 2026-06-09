"use client";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const buttons = [
    {
      label: "Twitter / X",
      href: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encoded}`,
      bg: "bg-black hover:bg-gray-900 border border-white/20",
      icon: "𝕏",
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encoded}`,
      bg: "bg-green-600 hover:bg-green-500",
      icon: "💬",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      bg: "bg-blue-700 hover:bg-blue-600",
      icon: "in",
    },
  ];

  function copyLink() {
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="flex flex-wrap gap-3">
      {buttons.map(({ label, href, bg, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition ${bg}`}
        >
          <span className="text-base leading-none">{icon}</span>
          {label}
        </a>
      ))}
      <button
        onClick={copyLink}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-white/20 text-slate-300 hover:border-white/40 hover:text-white transition"
      >
        <span>🔗</span>
        Copy link
      </button>
    </div>
  );
}
