export {};
declare global {
  interface Window {
    cspViolations: { directive: string; blocked: string; disposition: string }[];
  }
}
