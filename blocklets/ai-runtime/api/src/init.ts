export default async function init() {
  await import('./store/migrate').then((m) => m.default());
}
