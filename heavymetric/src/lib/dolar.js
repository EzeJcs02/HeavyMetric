export async function getDolarBNA() {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial')
    return await res.json()
  } catch { return null }
}

export const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export const formatUSD = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(n)

export const pesificar = (usd, tc) => usd * tc
