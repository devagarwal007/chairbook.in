import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  width?: number | string;
  height?: number | string;
  strokeWidth?: number | string;
};
export const Icons = {
  home: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  calendar: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  users: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
      <circle cx="10" cy="7" r="4"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  ),
  bell: ({ width = 18, height = 18, strokeWidth = 1.8, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>
    </svg>
  ),
  search: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="11" cy="11" r="7"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  chev: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  chevL: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  chevR: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="m9 6 6 6-6 6"/>
    </svg>
  ),
  rupee: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M6 3h12M6 8h12M6 13c8 0 8-10 0-10M6 13l8 8"/>
    </svg>
  ),
  wa: ({ width = 14, height = 14, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} style={style} {...props}>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
    </svg>
  ),
  x: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  plus: ({ width = 14, height = 14, strokeWidth = 2.4, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  minus: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M5 12h14"/>
    </svg>
  ),
  sort: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 6h18M6 12h12M10 18h4"/>
    </svg>
  ),
  download: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
  ),
  upload: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
    </svg>
  ),
  chart: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 21V3M21 21H3"/>
      <rect x="7" y="11" width="3" height="6" rx="0.5"/>
      <rect x="12" y="7" width="3" height="10" rx="0.5"/>
      <rect x="17" y="13" width="3" height="4" rx="0.5"/>
    </svg>
  ),
  bookings: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18M8 15h.01M12 15h.01M16 15h.01"/>
    </svg>
  ),
  newcust: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M19 8v6M22 11h-6"/>
    </svg>
  ),
  alert: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M12 9v4M12 17h.01"/>
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
    </svg>
  ),
  print: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <path d="M6 14h12v8H6z"/>
    </svg>
  ),
  copy: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  arrow: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  ),
  logout: ({ width = 14, height = 14, strokeWidth = 2.5, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  edit: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  ),
  trash: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
    </svg>
  ),
  store: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 9 4 3h16l1 6M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M9 21v-6h6v6"/>
    </svg>
  ),
  scissors: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>
    </svg>
  ),
  team: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  card: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
    </svg>
  ),
  user: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  pin: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  star: ({ width = 13, height = 13, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} style={style} {...props}>
      <path d="m12 2 3 7 7 .6-5.3 4.7L18.5 22 12 18 5.5 22l1.8-7.7L2 9.6 9 9z" />
    </svg>
  ),
  back: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  check: ({ width = 14, height = 14, strokeWidth = 2.5, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  clock: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
  spark: ({ width = 14, height = 14, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} style={style} {...props}>
      <path d="M12 2 13.4 9.1 20.5 10.5 13.4 11.9 12 19 10.6 11.9 3.5 10.5 10.6 9.1z"/>
    </svg>
  ),
  shield: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  lock: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  more: ({ width = 18, height = 18, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
    </svg>
  ),
  phone: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.6a2 2 0 0 1-.5 2L7.9 9.7a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2-.5c.9.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/>
    </svg>
  ),
  checkall: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="m18 7-9 9-3-3M9 7l3 3M2 12l3 3"/>
    </svg>
  ),
  cash: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>
    </svg>
  ),
  cancel: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/>
    </svg>
  ),
  summary: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>
    </svg>
  ),
  insights: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 21V3M21 21H3" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="12" y="7" width="3" height="10" rx="0.5" />
      <rect x="17" y="13" width="3" height="4" rx="0.5" />
    </svg>
  ),
  cal: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  upi: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM14 20h3M20 14v3M20 20h.01M17 14h.01M20 17h.01" />
    </svg>
  ),
  split: ({ width = 20, height = 20, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 6h13l5 6-5 6H3M16 6v12" />
    </svg>
  ),
  coffee: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
    </svg>
  ),
  plane: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 1 0-3-3L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  ),
  party: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M3 21h18l-7-14a2 2 0 0 0-3 0z"/>
      <path d="M9 17h6M11 13h2M12 9V5"/>
    </svg>
  ),
  invoice: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>
    </svg>
  ),
  share: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>
    </svg>
  ),
  clockIn: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M16 3l2 2-2 2"/>
    </svg>
  ),
  clockOut: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M20 3l-2 2 2 2"/>
    </svg>
  ),
  pause: ({ width = 14, height = 14, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  ),
  play: ({ width = 14, height = 14, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} style={style} {...props}>
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  clipboardList: ({ width = 16, height = 16, strokeWidth = 2, style, ...props }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={width} height={height} style={style} {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>
    </svg>
  ),
};
