import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="empty">
      <h1>Nothing here</h1>
      <p>That component doesn&rsquo;t exist, or it moved.</p>
      <Link to="/" className="empty__link">
        Browse all components
      </Link>
    </section>
  );
}
