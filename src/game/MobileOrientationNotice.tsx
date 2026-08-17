export function MobileOrientationNotice() {
  return (
    <div className="orientation-lock" role="status" aria-live="polite">
      <div className="orientation-lock__phone" aria-hidden="true" />
      <h2>Поверни телефон</h2>
      <p>Играть можно только в горизонтальном режиме.</p>
    </div>
  );
}
