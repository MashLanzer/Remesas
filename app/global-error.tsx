"use client";

// Solo se usa si falla el propio layout raíz. Debe traer <html>/<body>.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#0a1310",
          color: "#e6f2ec",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Algo salió mal</h1>
        <p style={{ fontSize: "0.9rem", opacity: 0.8, maxWidth: "20rem" }}>
          Ocurrió un error inesperado. Reintenta en un momento.
        </p>
        <button
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "1rem",
            padding: "0.75rem 1.25rem",
            fontWeight: 700,
            background: "#14b877",
            color: "#04140d",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
