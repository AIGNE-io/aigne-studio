const ci = !!process.env.CI;

export default async function globalTeardown() {
  if (ci) {
    return;
  }
}
