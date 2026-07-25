// Ilustraciones simples para estados vacíos (usan el color primary y tonos
// suaves que se adaptan a claro/oscuro).

export function IlluOrders() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-28" fill="none" aria-hidden>
      <ellipse cx="60" cy="86" rx="40" ry="6" className="fill-muted" />
      <rect x="30" y="34" width="60" height="42" rx="8" className="fill-muted" />
      <rect
        x="30"
        y="34"
        width="60"
        height="16"
        rx="8"
        className="fill-primary/20"
      />
      <path
        d="M54 34v-6a6 6 0 0 1 12 0v6"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="60" cy="57" r="9" className="fill-primary/20" />
      <path
        d="M56 57l3 3 5-6"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IlluPoints() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-28" fill="none" aria-hidden>
      <ellipse cx="60" cy="86" rx="38" ry="6" className="fill-muted" />
      <circle cx="60" cy="46" r="30" className="fill-primary/15" />
      <path
        d="M60 30l5.3 10.8 11.9 1.7-8.6 8.4 2 11.9L60 57.6 49.4 63.2l2-11.9-8.6-8.4 11.9-1.7z"
        className="fill-primary"
      />
    </svg>
  );
}

export function IlluStore() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-28" fill="none" aria-hidden>
      <ellipse cx="60" cy="86" rx="40" ry="6" className="fill-muted" />
      <rect x="32" y="40" width="56" height="38" rx="6" className="fill-muted" />
      <rect x="32" y="40" width="56" height="12" rx="6" className="fill-primary/25" />
      <rect x="54" y="40" width="12" height="38" className="fill-primary/15" />
      <path
        d="M40 40l4-12h32l4 12"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IlluContacts() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-28" fill="none" aria-hidden>
      <ellipse cx="60" cy="86" rx="40" ry="6" className="fill-muted" />
      {/* Persona de atrás */}
      <circle cx="78" cy="42" r="11" className="fill-primary/15" />
      <path
        d="M60 80c0-11 8-19 18-19s18 8 18 19z"
        className="fill-primary/15"
      />
      {/* Persona de frente */}
      <circle cx="46" cy="38" r="13" className="fill-primary/25" />
      <path
        d="M24 82c0-13 10-22 22-22s22 9 22 22z"
        className="fill-primary/25"
      />
    </svg>
  );
}
