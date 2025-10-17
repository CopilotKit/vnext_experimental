// vitest.config.mts
import { defineConfig } from "file:///Users/brandonmcconnell/Projects/@CopilotKit/vnext_experimental/node_modules/.pnpm/vite@7.1.4_@types+node@22.15.3_jiti@2.5.1_less@4.4.1_lightningcss@1.30.1_sass@1.90.0_terser@5.43.1_tsx@4.20.5_yaml@2.8.0/node_modules/vite/dist/node/index.js";
import angular from "file:///Users/brandonmcconnell/Projects/@CopilotKit/vnext_experimental/node_modules/.pnpm/@analogjs+vite-plugin-angular@1.20.2_@angular-devkit+build-angular@18.2.20_@angular+compiler-_zmz7jqfl7egy4lkxiiixmc6w5i/node_modules/@analogjs/vite-plugin-angular/src/index.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
var __vite_injected_original_import_meta_url = "file:///Users/brandonmcconnell/Projects/@CopilotKit/vnext_experimental/packages/angular/vitest.config.mts";
var __dirname = dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var r = (...p) => resolve(__dirname, ...p);
var vitest_config_default = defineConfig(({ mode }) => ({
  plugins: [angular()],
  resolve: {
    dedupe: [
      "@angular/core",
      "@angular/common",
      "@angular/platform-browser",
      "@angular/platform-browser-dynamic",
      "@angular/compiler",
      "@angular/core/testing"
    ]
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [r("src/test-setup.ts")],
    // Use absolute path
    include: ["src/**/*.{spec,test}.{ts,tsx}"],
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "*.config.*",
        "src/test-setup.ts",
        "src/index.ts",
        "src/public-api.ts"
      ]
    }
  },
  define: {
    "import.meta.vitest": mode !== "production"
  }
}));
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy5tdHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYnJhbmRvbm1jY29ubmVsbC9Qcm9qZWN0cy9AQ29waWxvdEtpdC92bmV4dF9leHBlcmltZW50YWwvcGFja2FnZXMvYW5ndWxhclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2JyYW5kb25tY2Nvbm5lbGwvUHJvamVjdHMvQENvcGlsb3RLaXQvdm5leHRfZXhwZXJpbWVudGFsL3BhY2thZ2VzL2FuZ3VsYXIvdml0ZXN0LmNvbmZpZy5tdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2JyYW5kb25tY2Nvbm5lbGwvUHJvamVjdHMvQENvcGlsb3RLaXQvdm5leHRfZXhwZXJpbWVudGFsL3BhY2thZ2VzL2FuZ3VsYXIvdml0ZXN0LmNvbmZpZy5tdHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCBhbmd1bGFyIGZyb20gJ0BhbmFsb2dqcy92aXRlLXBsdWdpbi1hbmd1bGFyJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuY29uc3QgX19kaXJuYW1lID0gZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuY29uc3QgciA9ICguLi5wOiBzdHJpbmdbXSkgPT4gcmVzb2x2ZShfX2Rpcm5hbWUsIC4uLnApO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBwbHVnaW5zOiBbYW5ndWxhcigpXSxcbiAgcmVzb2x2ZToge1xuICAgIGRlZHVwZTogW1xuICAgICAgJ0Bhbmd1bGFyL2NvcmUnLFxuICAgICAgJ0Bhbmd1bGFyL2NvbW1vbicsXG4gICAgICAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3NlcicsXG4gICAgICAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlci1keW5hbWljJyxcbiAgICAgICdAYW5ndWxhci9jb21waWxlcicsXG4gICAgICAnQGFuZ3VsYXIvY29yZS90ZXN0aW5nJyxcbiAgICBdLFxuICB9LFxuICB0ZXN0OiB7XG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICBzZXR1cEZpbGVzOiBbcignc3JjL3Rlc3Qtc2V0dXAudHMnKV0sIC8vIFVzZSBhYnNvbHV0ZSBwYXRoXG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57c3BlYyx0ZXN0fS57dHMsdHN4fSddLFxuICAgIHBvb2w6ICd0aHJlYWRzJyxcbiAgICBwb29sT3B0aW9uczogeyB0aHJlYWRzOiB7IHNpbmdsZVRocmVhZDogdHJ1ZSB9IH0sXG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxuICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdqc29uJywgJ2h0bWwnXSxcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ25vZGVfbW9kdWxlcy8nLFxuICAgICAgICAnZGlzdC8nLFxuICAgICAgICAnKi5jb25maWcuKicsXG4gICAgICAgICdzcmMvdGVzdC1zZXR1cC50cycsXG4gICAgICAgICdzcmMvaW5kZXgudHMnLFxuICAgICAgICAnc3JjL3B1YmxpYy1hcGkudHMnLFxuICAgICAgXSxcbiAgICB9LFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICAnaW1wb3J0Lm1ldGEudml0ZXN0JzogbW9kZSAhPT0gJ3Byb2R1Y3Rpb24nLFxuICB9LFxufSkpOyJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLGFBQWE7QUFDcEIsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxTQUFTLGVBQWU7QUFKME8sSUFBTSwyQ0FBMkM7QUFNNVQsSUFBTSxZQUFZLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBQ3hELElBQU0sSUFBSSxJQUFJLE1BQWdCLFFBQVEsV0FBVyxHQUFHLENBQUM7QUFFckQsSUFBTyx3QkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQUEsRUFDbkIsU0FBUztBQUFBLElBQ1AsUUFBUTtBQUFBLE1BQ047QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsRUFBRSxtQkFBbUIsQ0FBQztBQUFBO0FBQUEsSUFDbkMsU0FBUyxDQUFDLCtCQUErQjtBQUFBLElBQ3pDLE1BQU07QUFBQSxJQUNOLGFBQWEsRUFBRSxTQUFTLEVBQUUsY0FBYyxLQUFLLEVBQUU7QUFBQSxJQUMvQyxVQUFVO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNqQyxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixzQkFBc0IsU0FBUztBQUFBLEVBQ2pDO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
