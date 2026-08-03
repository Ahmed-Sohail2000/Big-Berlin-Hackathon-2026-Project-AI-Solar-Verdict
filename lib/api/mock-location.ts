/**
 * MOCK_MODE geocode result, shared by forward- and reverse-geocode routes.
 *
 * The cached fixtures (data/fixtures/cached/) only cover one location —
 * Reichstag, Berlin — so mock geocoding always resolves here regardless of
 * the query/coordinates given. This keeps the fixture-backed chain
 * (geocode → getBuildingInsights → roof-facts) actually returning data
 * instead of "no coverage" for whatever address a caller tries.
 */
export const MOCK_GEOCODE_RESULT = {
  address: "Reichstag, Berlin, Germany",
  lat: 52.5186,
  lng: 13.3761,
};
