import { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'barChart'
  | 'box'
  | 'calendar'
  | 'cart'
  | 'check'
  | 'chevronDown'
  | 'clock'
  | 'download'
  | 'edit'
  | 'eye'
  | 'grid'
  | 'mail'
  | 'phone'
  | 'plus'
  | 'search'
  | 'trash'
  | 'trend'
  | 'users'
  | 'wallet'
  | 'warning'
  | 'x';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

const paths: Record<IconName, ReactNode> = {
  barChart: (
    <>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M3 19h18" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 4.5 7.8" />
      <path d="m12 12 7.5-4.2" />
      <path d="M12 12v8.5" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3v3" />
      <path d="M17 3v3" />
      <path d="M4 8h16" />
      <path d="M5 5h14v15H5z" />
    </>
  ),
  cart: (
    <>
      <path d="M4 5h2l2 10h9l2-7H8" />
      <path d="M10 20h.01" />
      <path d="M17 20h.01" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  chevronDown: (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16v4Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  grid: (
    <>
      <path d="M5 5h5v5H5z" />
      <path d="M14 5h5v5h-5z" />
      <path d="M5 14h5v5H5z" />
      <path d="M14 14h5v5h-5z" />
    </>
  ),
  mail: (
    <>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: (
    <>
      <path d="M7 4h3l1.5 4-2 1.2a10 10 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A14 14 0 0 1 5 6a2 2 0 0 1 2-2Z" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7v13h8V7" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </>
  ),
  trend: (
    <>
      <path d="m4 15 5-5 4 4 7-8" />
      <path d="M15 6h5v5" />
    </>
  ),
  users: (
    <>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="8" r="3" />
      <path d="M22 19a3.5 3.5 0 0 0-5-3.2" />
      <path d="M17 5.2a3 3 0 0 1 0 5.6" />
      <path d="M2 19a3.5 3.5 0 0 1 5-3.2" />
      <path d="M7 5.2a3 3 0 0 0 0 5.6" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h15v12H4z" />
      <path d="M16 12h4v4h-4z" />
      <path d="M7 7V5h10v2" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 2 20h20L12 4Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

export function Icon({ name, className = '', ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
