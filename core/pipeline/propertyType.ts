// Canonical land/plot type regex — shared across pipeline and UI.
// extractPropertyType currently differs between path A and path B; unification
// is handled in a later commit (see generic-pipeline-refactor-plan.md Phase A).
export const LAND_TYPES = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;
