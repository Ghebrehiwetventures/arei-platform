import "./SectionHeader.css";

interface Props {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ children, action, className = "" }: Props) {
  return (
    <div className={`sh anim-fu delay-3 ${className}`}>
      <h2>{children}</h2>
      {action}
    </div>
  );
}
