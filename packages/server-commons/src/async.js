export async function delay(duration) {
  // TODO: can accept abort singal
  return new Promise((resolve) => setTimeout(resolve, duration));
}
