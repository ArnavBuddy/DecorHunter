export default function UnsubscribeSuccess() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        textAlign: "center",
        padding: 40,
      }}
    >
      <div style={{ fontSize: 48 }}>✅</div>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>You've been unsubscribed</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Your email has been added to our suppression list. You will not receive
        any further emails from us.
      </p>
    </div>
  );
}
