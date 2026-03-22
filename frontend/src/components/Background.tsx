export default function Background() {
  return (
    <div className="app-bg" aria-hidden="true">
      {/* Lateral bar — same as landing page */}
      <div className="app-bg-lateral" />

      {/* Warm radial glows */}
      <div className="app-bg-glow app-bg-glow--top" />
      <div className="app-bg-glow app-bg-glow--mid" />
      <div className="app-bg-glow app-bg-glow--bottom" />

      {/* Horizontal dashed lines */}
      <div className="app-bg-dash app-bg-dash--1" />
      <div className="app-bg-dash app-bg-dash--2" />

      {/* Grain overlay */}
      <div className="app-bg-grain" />
    </div>
  );
}
