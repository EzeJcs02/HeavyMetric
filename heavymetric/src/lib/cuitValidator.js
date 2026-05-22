export function formatCuit(cuitStr) {
  // Elimina todo lo que no sea número
  const digits = String(cuitStr || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`;
}

export function isValidCuit(cuitStr) {
  const cuit = String(cuitStr || '').replace(/[-_]/g, '');

  if (cuit.length !== 11) return false;

  const validTypes = ['20', '23', '24', '27', '30', '33', '34'];
  const prefix = cuit.substring(0, 2);

  if (!validTypes.includes(prefix)) return false;

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cuit[i]) * multipliers[i];
  }

  let mod = 11 - (sum % 11);
  if (mod === 11) mod = 0;
  if (mod === 10) mod = 9;

  return mod === parseInt(cuit[10]);
}
