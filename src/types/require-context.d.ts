/** Typage de `require.context` (fourni par le bundler Next.js : Turbopack / webpack). */
interface BundlerRequireContext {
  keys(): string[];
  (id: string): unknown;
}

declare namespace NodeJS {
  interface Require {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): BundlerRequireContext;
  }
}
