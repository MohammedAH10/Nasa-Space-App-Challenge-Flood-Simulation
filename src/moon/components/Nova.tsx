interface NovaProps {
  message: string;
  mood?: "happy" | "thinking" | "warn";
  compact?: boolean;
}

export default function Nova({ message, mood = "happy", compact = false }: NovaProps) {
  return (
    <div className={`moon-nova ${mood} ${compact ? "compact" : ""}`}>
      <div className="moon-nova-avatar" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="nova-helmet" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#eaf8ff" />
              <stop offset="1" stopColor="#8ab6da" />
            </linearGradient>
            <linearGradient id="nova-visor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#123456" />
              <stop offset="1" stopColor="#071226" />
            </linearGradient>
          </defs>
          <line x1="32" y1="4" x2="32" y2="12" stroke="#4cc9f0" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="4" r="3" fill="#ffd166" />
          <circle cx="32" cy="32" r="22" fill="url(#nova-helmet)" stroke="#4cc9f0" strokeWidth="2" />
          <rect x="13" y="24" width="38" height="20" rx="10" fill="url(#nova-visor)" />
          <circle cx="24" cy="33" r="3" fill="#8be9ff" />
          <circle cx="40" cy="33" r="3" fill="#8be9ff" />
          <circle cx="24.8" cy="32" r="1" fill="#ffffff" />
          <circle cx="40.8" cy="32" r="1" fill="#ffffff" />
          <path d="M27 40 Q32 43 37 40" stroke="#70e000" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="18" cy="22" r="2" fill="#ffffff" opacity="0.8" />
          <circle cx="46" cy="27" r="1.6" fill="#ffffff" opacity="0.7" />
          <rect x="27" y="51" width="10" height="7" rx="3" fill="#ffd166" />
        </svg>
      </div>
      <div className="moon-nova-bubble">
        <span className="moon-nova-name">Nova · Mission guide</span>
        <p>{message}</p>
      </div>
    </div>
  );
}
