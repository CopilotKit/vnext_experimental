// Minimal ambient declarations so `tsc -p tsconfig.spec.json` is green without @types/jest

declare module "@jest/globals" {
  export const jest: any;
}

declare const describe: any;
declare const it: any;
declare const test: any;
declare const expect: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const beforeAll: any;
declare const afterAll: any;
declare const jest: any;
