// SPDX-License-Identifier: MIT
/** A product's document, as `documents-plugin.ts` makes it a module. */
declare module 'virtual:document/*' {
  const value: {
    readonly document: import('./document').DocumentTree;
    /** The address of each picture, by the index a figure gives. */
    readonly pictures: readonly string[];
  };
  export default value;
}
