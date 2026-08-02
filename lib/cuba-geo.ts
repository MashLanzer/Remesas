// Centroides aproximados (lat, lng) de las provincias de Cuba, para centrar el
// mapa en el destino cuando aún no hay ubicación en vivo del repartidor.
export const PROVINCE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "Pinar del Río": { lat: 22.42, lng: -83.7 },
  Artemisa: { lat: 22.83, lng: -82.76 },
  "La Habana": { lat: 23.11, lng: -82.37 },
  Mayabeque: { lat: 22.87, lng: -81.95 },
  Matanzas: { lat: 22.9, lng: -81.3 },
  Cienfuegos: { lat: 22.24, lng: -80.44 },
  "Villa Clara": { lat: 22.5, lng: -79.96 },
  "Sancti Spíritus": { lat: 21.93, lng: -79.44 },
  "Ciego de Ávila": { lat: 21.84, lng: -78.76 },
  Camagüey: { lat: 21.38, lng: -77.92 },
  "Las Tunas": { lat: 20.96, lng: -76.95 },
  Holguín: { lat: 20.89, lng: -76.26 },
  Granma: { lat: 20.38, lng: -76.64 },
  "Santiago de Cuba": { lat: 20.02, lng: -75.82 },
  Guantánamo: { lat: 20.14, lng: -75.21 },
  "Isla de la Juventud": { lat: 21.7, lng: -82.8 },
};

// Centro de Cuba (fallback si no hay provincia).
export const CUBA_CENTER = { lat: 21.8, lng: -79.5 };
