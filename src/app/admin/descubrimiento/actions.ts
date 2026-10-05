'use server'

/** The editorial OfferMatrix is source-controlled and seeded; no parallel M2M editor exists. */
function retired() { throw new Error('Actualizá la matriz editorial y ejecutá el seed audit para cambiar el descubrimiento.') }
export async function saveSituation() { retired() }
export async function saveNeed() { retired() }
export async function deleteSituation() { retired() }
export async function deleteNeed() { retired() }
