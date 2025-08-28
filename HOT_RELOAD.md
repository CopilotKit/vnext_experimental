chieving Live Reload for Angular 19 App with Local Workspace Packages
Understanding the Issue
In the current setup, the Angular 19 dev server isn’t detecting changes in your local workspace packages’ built output. Several factors contribute to this:
Angular CLI Watch Limitations: By default, Angular’s dev server (especially in Angular 17+ with the new build system) does not watch files in node*modules or outside the project source. Your library packages are consumed as pre-built distributions (in dist/ or via pnpm symlinks), which Angular treats as external dependencies. The CLI’s default Webpack/Vite config marks node_modules as “managed/immutable”, so it skips watching those files for changes
stackoverflow.com
.
New Build System Prebundling: Angular 18+ introduced a Vite/ESBuild-based dev server that prebundles dependencies for faster reloads. This means libraries from node_modules are bundled once and not re-checked on every change
stackoverflow.com
stackoverflow.com
. In a linked local library scenario, this prevents updates from being picked up. In Angular 17+, an issue was noted where the new application builder wouldn’t live-reload linked libraries at all
github.com
.
Dist Folder Rebuild Behavior: When your packages rebuild, tools like ng-packagr often clean and recreate the dist/ files. This can momentarily remove the library files. The Angular dev server might detect a deletion (causing a compile error) and then not recover when the files reappear
stackoverflow.com
stackoverflow.com
. This can halt live reload until a manual restart.
CSS Files Not Watched: The library’s generated CSS (e.g. Tailwind output) is referenced via node_modules/@copilotkit/angular/dist/styles.css. Angular’s build does not watch for changes in static CSS files under node_modules by default, so style updates in the library go unnoticed.
Result: Even though your packages are rebuilding in watch mode (step 4 of your workflow), the Angular app doesn’t see those changes and thus doesn’t hot-reload. We need to tweak the configuration so that Angular treats those library outputs as watchable sources.
Solution 1: Exclude Local Libraries from Prebundling (Angular 18+)
Angular 18 and 19 use a dev server that pre-bundles dependencies. We can configure the Angular CLI to exclude your local packages from this prebundle step, forcing the dev server to treat them like source files that should be watched and rebuilt on the fly. In your angular.json, add an entry under the serve target’s development configuration:
// angular.json (within the Angular demo project configuration)
{
"projects": {
"your-angular-demo": {
"architect": {
"serve": {
"builder": "@angular-devkit/build-angular:dev-server",
"configurations": {
"development": {
"prebundle": {
"exclude": [
"@copilotkit/angular",
"@copilotkit/core",
"@copilotkit/shared",
"@copilotkit/runtime"
]
}
}
}
}
}
}
}
}
This tells the Angular dev server not to treat those packages as fixed dependencies, but to load them fresh each time. As a result, when your library’s dist files change, the Angular app will pull in the updated code and trigger a rebuild/live-reload. This exact approach was recommended for Angular 18+ and confirmed to resolve the issue of library changes not being detected
stackoverflow.com
stackoverflow.com
:
“You can change the prebundle option for the development server… In the example: "prebundle": { "exclude": ["@myorg/my-ngx-library"] } … Works like a charm.”
stackoverflow.com
stackoverflow.com
Make sure you run ng serve with the development configuration (or set it as default). For example, ng serve -c development. This ensures the prebundle exclusion is active during your dev watch. With this change, edits to your library’s TypeScript code (and templates) should be picked up automatically by the dev server, without needing to restart it.
Solution 2: Use Path Mapping to Library Source for Live Reload
An alternative approach is to leverage TypeScript path mappings to point directly at your libraries’ source code (or an intermediate source entry) during development. This way, the Angular app actually compiles the library code as part of its own build, enabling full HMR/live-reload on changes – essentially treating the library like an in-project module in dev mode
stackoverflow.com
stackoverflow.com
. How to implement:
Create a Dev Entry Point: In each library (e.g. packages/angular), create an index.ts (if not existing) that re-exports everything from the public API. Update the library’s public-api.ts to export from this new index.ts
stackoverflow.com
. This index.ts will serve as a single entry to all your library’s components/services for the app to compile.
Adjust TS Config Paths: In the Angular demo app’s tsconfig.json (or tsconfig.app.json), change the path mappings for your packages to point to the library source instead of the dist output. For example:
"compilerOptions": {
"paths": {
"@copilotkit/angular": ["../../packages/angular/src/index.ts"],
"@copilotkit/angular/*": ["../../packages/angular/src/_"],
"@copilotkit/core": ["../../packages/core/src/index.ts"],
// ... (and so on for shared, runtime if needed)
}
}
(The exact paths depend on your folder structure; the key is to reference the src files or the new index.ts aggregator in the library.)
Re-run your dev servers: With these mappings, when you import @copilotkit/angular in the app, it will resolve to the library’s source files. The Angular CLI will compile those files along with the app. Any changes you make in the library’s src/ will now trigger the app’s build to reload, as if you were editing the app itself. This technique has been shown to enable smooth live reload without special tools
stackoverflow.com
stackoverflow.com
:
“Library updates trigger and live reload my app fast and smoothly… dev-server is watching raw files for a change. Once you’re ready to publish, you use the standard production build process which will compile the library to dist.”
stackoverflow.com
stackoverflow.com
Crucially, this approach preserves your ability to do a proper library build for production. You’re not modifying the library code itself – just the app’s view of it during development. When it’s time to build or publish the library, you still run ng-packagr/tsup to produce the final APF-compliant package from src. (The Angular team historically cautioned that compiling libraries from source in an app might hide library-specific build issues
stackoverflow.com
, but in practice many developers use this workflow for faster iteration and then do a library build before release
stackoverflow.com
.) If you use this method, you might temporarily disable the separate “watch” build for the Angular library (since the app is now compiling it). However, you may still want to run the Tailwind CLI in watch mode for the library’s CSS (more on handling CSS below). After development, revert the tsconfig paths to the dist files for consistency, or use separate tsconfig profiles for “dev” vs “prod” if desired.
Solution 3: Use the Legacy Webpack Dev Server (Angular 17 and earlier behavior)
If the above options are not viable, Angular still supports the older Webpack-based builder which has slightly different watching behavior. In Angular 19, the default builder for applications is @angular-devkit/build-angular:application (with the new system). You can opt out of this by editing the Angular app’s project config in angular.json:
Change the "builder" for the build target from …:application back to @angular-devkit/build-angular:browser (the classic Webpack builder), and similarly use @angular-devkit/build-angular:dev-server for the serve target if not already in use. This effectively reverts to the Angular 16 build system.
With the Webpack dev server, you may need to tweak a couple of settings:
Enable "preserveSymlinks": true in the Angular build options if you rely on pnpm’s symlinks. This prevents Webpack from resolving the symlink to the real path, which can sometimes confuse watch behavior. By preserving symlinks, the library is seen at node_modules/@copilotkit/..., and then you can explicitly tell Webpack to watch it (next point)
stackoverflow.com
.
Remove or override Webpack’s default ignore of node_modules for your libs. For example, using a custom webpack config to set snapshot.managedPaths = [] (so no paths are treated as immutable) will force it to check all files including those in node_modules on each rebuild
stackoverflow.com
. There are community solutions using @angular-builders/custom-webpack to achieve this for linked libraries
stackoverflow.com
stackoverflow.com
. In lieu of that, you can also disable the Angular build cache during dev (export NG_BUILD_CACHE=0) to avoid cached copies of library modules
stackoverflow.com
.
Using the old builder is a bit of a heavy-handed approach, but it can restore live-reload functionality for linked libraries. Essentially, it trades some of the new builder’s speed optimizations for more lenient file watching. (Note: Angular may fully move to the new system in the future, so consider this a temporary workaround if you must use it.)
Handling CSS Changes from Libraries
Getting TypeScript/HTML changes to live-reload is half the battle – you also need style changes (Tailwind CSS in your Angular library) to reflect without manual steps. By default, the Angular dev server won’t watch a CSS file in node_modules (or outside the project). Here are ways to solve that:
Import Library CSS in the App’s Styles: Instead of listing the library’s CSS file directly in angular.json under the styles array (which the CLI treats as a one-time import), include it in a global stylesheet that Angular already watches. For example, if your Angular demo has a src/styles.scss, add:
@import "~@copilotkit/angular/dist/styles.css";
Ensure the path is correct (the ~ tells the Sass processor to resolve via node_modules). Now the library’s styles become part of the app’s global styles. The Angular dev build (webpack or Vite) will pull in that CSS content. On changes, it should trigger a rebuild of the global styles bundle. Because Angular’s HMR does support swapping out stylesheets live
angular.dev
, you can see the style updates without a full page refresh, as long as the dev server knows the CSS changed.
Use Style Include Paths (if needed): If the direct import above doesn’t work (say you’re not using Sass), another way is to configure the Angular builder’s stylePreprocessorOptions.includePaths to include packages/angular/dist so it can find the CSS. Then you could @import "styles.css"; from a file in that include path. The effect is the same – bringing the CSS into the app’s build pipeline.
Have the Library Inject Styles (advanced): In some cases, library developers have the library itself inject its styles during development. For instance, your Angular library (built with ng-packagr) could be structured to import its own compiled CSS in the entry module when in development mode. If the CSS is imported in a TypeScript file, the Angular/Webpack dev server will treat it as a module dependency and reload it when changed. This is a bit hacky and not typical for published libraries, but could be done behind a dev-only flag.
Polling as Last Resort: If file-watcher issues still prevent style updates from being noticed, you can run ng serve with the polling option (--poll=2000 for example) to force periodic checking of files
stackoverflow.com
. Polling is heavier on resources but can catch changes in files that weren’t watched, such as a CSS file in dist. Usually, the above methods make this unnecessary.
With the CSS wired into the app’s own build, you satisfy the requirement that both TS and CSS changes trigger a reload. The Tailwind CLI watcher will rebuild the CSS file in dist/; the Angular dev server will see the file change (via the import) and refresh the styles.
Putting It All Together with Turbo & pnpm
Importantly, these solutions work within your existing Turbo+pnpn workflow:
Keep running pnpm dev in one terminal to watch/rebuild the packages. They will output updated files to dist/ as before.
Run pnpm demo:angular (which triggers ng serve for the demo app) in another terminal. Ensure this uses the adjusted config (e.g. the development configuration with prebundle excludes, or the tsconfig path overrides depending on which solution you choose). You may need to adjust the Turbo pipeline if it was using a different config; for example, add --configuration development to the serve command.
Now, when you edit a package:
The package’s watcher rebuilds the files in dist/ (JS and/or CSS).
Angular’s dev server detects the change:
If using Solution 1 (Prebundle exclude), the updated library JS is no longer treated as cached — Webpack/Vite will include the new code and trigger live reload. The page refreshes (or HMR updates the module) automatically
stackoverflow.com
.
If using Solution 2 (Path mapping to source), the change to library source triggers the TypeScript compilation in the app, just as if you edited the app. Webpack rebuilds the bundle and reloads the app live
stackoverflow.com
.
In both cases, the CSS changes will also apply if you implemented one of the import methods – the global styles bundle is regenerated and HMR swaps the styles in the browser.
No manual intervention is needed. You should see the Angular app reflect the library changes within seconds, closing the loop on the expected workflow.
Finally, you can maintain your current build architecture: the libraries still output to dist/ (necessary for the Angular library APF format and for the Node/React apps), and you’re not introducing new build tools like Nx – we’re just configuring Angular CLI and TypeScript to be aware of those local packages. When it’s time to do a production build or publish the library, simply ensure the app uses the normal paths (if you changed them) and that you’ve built the latest library version via ng-packagr/tsup. By implementing these adjustments, your Angular 19 app will reload automatically on any library changes, for both code and styles. This achieves the seamless developer workflow you expected
stackoverflow.com
, all while respecting the pnpm/Turbo workspace setup and without needing to manually restart or use proprietary monorepo tools. Sources:
Stack Overflow – Issue with ng build --watch and npm link in Angular 18 (solution for Angular 18+ live reload via prebundle.exclude)
stackoverflow.com
Stack Overflow – Angular library and live reload (technique to map library source in tsconfig for live reloading)
stackoverflow.com
stackoverflow.com
Angular CLI Documentation – notes on HMR support for styles and live reload behavior
angular.dev
Trevor Karjanis, Stack Overflow answer – details on Angular library linking, preserveSymlinks, and Webpack watch config for libraries
stackoverflow.com
