export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function truncate(text: string, length = 36) {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 3)}...`;
}
