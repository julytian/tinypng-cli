import pkg from "../../package.json" assert { type: "json" };

export function getRandomIp() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(
    "."
  );
}
export function toPercent(num: number) {
  var str = Number(num * 100).toFixed(2);
  str += "%";
  return str;
}
function pow1024(num: number) {
  return Math.pow(1024, num);
}
export function filterSize(size: number) {
  if (!size) return "";
  if (size < pow1024(1)) return size + " B";
  if (size < pow1024(2)) return (size / pow1024(1)).toFixed(2) + " KB";
  if (size < pow1024(3)) return (size / pow1024(2)).toFixed(2) + " MB";
  if (size < pow1024(4)) return (size / pow1024(3)).toFixed(2) + " GB";
  return (size / pow1024(4)).toFixed(2) + " TB";
}
export function getVersion() {
  return pkg.version;
}