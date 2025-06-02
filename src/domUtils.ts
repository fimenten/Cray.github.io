export function isElementInDocument(element: Element | null): boolean {
  return !!element && element.isConnected;
}
