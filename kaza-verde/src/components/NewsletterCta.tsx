import "./NewsletterCta.css";

interface Props {
  overline?: string;
  heading?: React.ReactNode;
  description?: string;
}

export default function NewsletterCta({
  overline = "Monthly Property Index",
  heading = <>Cape Verde <em>market intelligence</em></>,
  description = "Median prices by island, inventory trends, new development alerts, and regulatory changes — one email per month.",
}: Props) {
  return (
    <div className="nl-cta anim-fu delay-4">
      <div className="nl-overline">{overline}</div>
      <h2>{heading}</h2>
      <p>{description}</p>
      <div className="nl-form">
        <input type="email" className="nl-input" placeholder="you@email.com" />
        <button className="nl-submit">SUBSCRIBE</button>
      </div>
      <div className="nl-fine">Free. Unsubscribe anytime. No spam, just data.</div>
    </div>
  );
}
