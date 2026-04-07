'use client';

import { cn } from '@/lib/utils/cn';

interface AssistantAvatarProps {
  isSpeaking?: boolean;
  isListening?: boolean;
  status?: 'idle' | 'success' | 'warning' | 'error';
  className?: string;
}

export { type AssistantAvatarProps };

const STATUS_COLORS = {
  idle:    { stroke: '#3b82f6', glow: 'rgba(59,130,246,0.3)',  glowStrong: 'rgba(59,130,246,0.5)'  },
  success: { stroke: '#22c55e', glow: 'rgba(34,197,94,0.3)',   glowStrong: 'rgba(34,197,94,0.5)'   },
  warning: { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.3)',  glowStrong: 'rgba(245,158,11,0.5)'  },
  error:   { stroke: '#ef4444', glow: 'rgba(239,68,68,0.3)',   glowStrong: 'rgba(239,68,68,0.5)'   },
};

export function AssistantAvatar({ isSpeaking = false, isListening = false, status = 'idle', className }: AssistantAvatarProps) {
  const colors = STATUS_COLORS[status];
  const strokeColor = colors.stroke;
  const pupilOpacity = isSpeaking ? 0.9 : 0.7;

  // Il dot è attivo (pulse) quando sta ascoltando, elaborando o parlando
  const dotActive = isSpeaking || isListening || status !== 'idle';

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer glow ring — visible when speaking */}
      <div
        className={cn(
          'absolute inset-0 rounded-full transition-all duration-500',
          isSpeaking ? 'animate-pulse opacity-100' : 'opacity-0',
        )}
        style={{
          background: `radial-gradient(circle, ${colors.glowStrong} 0%, transparent 70%)`,
        }}
      />

      {/* Listening ripple */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute h-full w-full animate-ping rounded-full" style={{ backgroundColor: colors.glow }} />
        </div>
      )}

      <svg
        viewBox="0 0 200 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 h-full w-full drop-shadow-2xl transition-all duration-700"
        style={{ filter: `drop-shadow(0 0 ${isSpeaking ? '24px' : '15px'} ${colors.glow})` }}
      >
        <defs>
          <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.05" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.15" />
          </linearGradient>
          <filter id="glassFilter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>

        {/* Head */}
        <ellipse
          cx="100"
          cy="55"
          rx="32"
          ry="38"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="url(#avatarGradient)"
          style={{ transition: 'stroke 0.5s ease, fill 0.5s ease' }}
        />

        {/* Neck */}
        <line
          x1="100" y1="93" x2="100" y2="115"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'stroke 0.5s ease' }}
        />

        {/* Shoulders & torso */}
        <path
          d="M100 115 C100 115, 60 120, 45 145 L45 230 C45 238, 52 245, 60 245 L140 245 C148 245, 155 238, 155 230 L155 145 C140 120, 100 115, 100 115Z"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="url(#avatarGradient)"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.5s ease, fill 0.5s ease' }}
        />

        {/* Left arm — animated when speaking */}
        <path
          d="M45 150 C30 165, 25 200, 30 235"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          style={{
            transition: 'stroke 0.5s ease',
            animation: isSpeaking ? 'arm-swing-left 0.8s ease-in-out infinite' : undefined,
            transformOrigin: '45px 150px',
          }}
        />

        {/* Right arm — animated when speaking */}
        <path
          d="M155 150 C170 165, 175 200, 170 235"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          style={{
            transition: 'stroke 0.5s ease',
            animation: isSpeaking ? 'arm-swing-right 0.8s ease-in-out infinite' : undefined,
            transformOrigin: '155px 150px',
          }}
        />

        {/* Left leg */}
        <path
          d="M75 245 L68 310"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'stroke 0.5s ease' }}
        />

        {/* Right leg */}
        <path
          d="M125 245 L132 310"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'stroke 0.5s ease' }}
        />

        {/* Left eye — expressive with pupil */}
        <ellipse
          cx="87" cy="50" rx="5.5" ry="6"
          fill="white"
          fillOpacity="0.2"
          stroke={strokeColor}
          strokeWidth="1.2"
          style={{ transition: 'stroke 0.5s ease' }}
        />
        <circle
          cx="88" cy="51" r="2.2"
          fill={strokeColor}
          opacity={pupilOpacity}
          style={{ transition: 'fill 0.5s ease, opacity 0.3s ease' }}
        />

        {/* Right eye — expressive with pupil */}
        <ellipse
          cx="113" cy="50" rx="5.5" ry="6"
          fill="white"
          fillOpacity="0.2"
          stroke={strokeColor}
          strokeWidth="1.2"
          style={{ transition: 'stroke 0.5s ease' }}
        />
        <circle
          cx="114" cy="51" r="2.2"
          fill={strokeColor}
          opacity={pupilOpacity}
          style={{ transition: 'fill 0.5s ease, opacity 0.3s ease' }}
        />

        {/* Status indicator — bottom-right of head */}
        <g style={{ filter: `drop-shadow(0 0 5px ${colors.glow})` }}>
          <circle
            cx="128"
            cy="84"
            r="10"
            fill="white"
            fillOpacity="0.9"
            className="transition-all duration-500"
          />
          <circle
            cx="128"
            cy="84"
            r="7.5"
            fill={strokeColor}
            className={cn(
              "transition-all duration-500",
              dotActive ? "animate-[dot-pulse_1.5s_ease-in-out_infinite]" : ""
            )}
          />
        </g>

        {/* Mouth — animated when speaking */}
        {isSpeaking ? (
          <ellipse
            cx="100"
            cy="68"
            rx="6"
            ry="3.5"
            stroke={strokeColor}
            strokeWidth="1.8"
            fill={strokeColor}
            fillOpacity="0.1"
            className="animate-pulse"
          />
        ) : (
          <path
            d="M94 68 Q100 70 106 68"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{ transition: 'stroke 0.5s ease', opacity: 0.6 }}
          />
        )}
      </svg>
    </div>
  );
}
