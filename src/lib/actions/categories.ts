'use server'

/** Category was retired from the commercial domain. */
function retired() {
  throw new Error('Las categorías fueron reemplazadas por Product.modality y Product.engine.')
}

export async function createCategory() { retired() }
export async function updateCategory() { retired() }
export async function setCategoryServiceFlag() { retired() }
export async function deleteCategory() { retired() }
