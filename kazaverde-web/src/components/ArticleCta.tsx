import { Link } from "react-router-dom";
import "./ArticleCta.css";

interface Props {
  heading: string;
  body?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export default function ArticleCta({
  heading,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: Props) {
  return (
    <div className="acta">
      <div className="acta-content">
        <p className="acta-heading">{heading}</p>
        {body && <p className="acta-body">{body}</p>}
      </div>
      <div className="acta-actions">
        <Link to={primaryHref} className="bp">{primaryLabel}</Link>
        {secondaryHref && secondaryLabel && (
          <Link to={secondaryHref} className="bo">{secondaryLabel}</Link>
        )}
      </div>
    </div>
  );
}
