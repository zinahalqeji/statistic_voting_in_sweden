export function normalizeKommun(name) {

  return (name || "")
    .trim()
    .toLowerCase()
    .replace("strängns", "strängnäs");
}

export function safeNumber(value) {

  const n = Number(
    typeof value === "string"
      ? value.replace(",", ".")
      : value
  );

  return isNaN(n)
    ? 0
    : n;
}