/* AREI D·Layers mark — canonical geometry mirrored from
   docs/brand/assets/d-layers-mark.svg.
   Source: AREI Brand Guidelines v1.0. Do not redraw from memory.
   Sister implementations: arei-admin/app.tsx (DLayersMark). */
export default function DLayersMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      aria-label="AREI D·Layers mark"
    >
      <rect x="3" y="3" width="14" height="14" />
      <rect x="6.5" y="6.5" width="14" height="14" />
      <rect x="10" y="10" width="9" height="9" fill="currentColor" stroke="none" />
    </svg>
  );
}
