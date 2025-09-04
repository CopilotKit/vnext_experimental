**Goal**
- Support Angular 18 and 19 consumers while developing and building the library with Angular 18 as the base.

**Why**
- Current peers target Angular 19 only, which conflicts with Angular 18 apps at install time. Widening peers and aligning the build toolchain with Angular 18 enables compatibility with both majors.

**Required Changes**
- **Peer ranges**: Widen to allow both majors.
  - `@angular/core`: `^18.0.0 || ^19.0.0`
  - `@angular/common`: `^18.0.0 || ^19.0.0`
  - `@angular/cdk`: `^18.0.0 || ^19.0.0`
  - Keep `rxjs`: `^7.8.0` and `tslib`: `^2.6.0` as peers.
- **Dev toolchain (base on v18)**:
  - `@angular/*` devDependencies: v18.x
  - `ng-packagr`: v18.x
  - `typescript`: version supported by Angular 18 (e.g., 5.5.x; follow Angular’s compatibility matrix)
  - Align `zone.js`/other build tools with Angular 18 guidance.

**package.json Snippet (library)**
```json
{
  "peerDependencies": {
    "@angular/cdk": "^18.0.0 || ^19.0.0",
    "@angular/common": "^18.0.0 || ^19.0.0",
    "@angular/core": "^18.0.0 || ^19.0.0",
    "rxjs": "^7.8.0",
    "tslib": "^2.6.0"
  }
}
```

**Build & Test Strategy (Library)**
- Type‑check and build the library using Angular 18 + ng‑packagr 18 + TS 5.5.x.

**CI**
- One job using the Angular 18 toolchain to lint, type‑check, and build the library.

**Demos**
- Keep the existing Angular demo aligned with the base (v18). A separate v19 demo is optional and can be added later.

**Docs**
- README: Note “Supports Angular 18 and 19” and that `@angular/cdk` should match the consumer app’s Angular major.

**Release**
- Publish a new version (e.g., 0.0.3) with widened peers and the v18 toolchain.

**Pitfalls / Notes**
- **TypeScript compatibility**: Using a TS version unsupported by Angular 18 can cause build failures. Pin to the recommended version for Angular 18 (e.g., 5.5.x).
- **ng‑packagr version**: Must match the Angular major used to build (use 18.x when building on v18).
- **Avoid force installs**: Don’t use `--legacy-peer-deps`/`--force` to override peer conflicts; it can cause runtime DI/token duplication or subtle CDK incompatibilities.
- **Optional CDK features**: If some CDK‑backed features are optional, consider `peerDependenciesMeta` optional or separate entry points for leaner installs, but keep the core peer range wide.

**Outcome**
- Angular 18 consumers resolve `@angular/cdk@^18` and install cleanly; Angular 19 consumers resolve `@angular/cdk@^19`. One published build works for both.
