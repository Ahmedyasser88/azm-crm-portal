export const formatDateTime = (isoString: string) => {
  return new Date(isoString).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
// → "04/06/2026, 09:46"
