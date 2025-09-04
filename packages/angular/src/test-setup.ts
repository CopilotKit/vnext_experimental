// Setup Angular testing environment for Vitest
import 'reflect-metadata';
import 'zone.js';
import 'zone.js/testing';

// Setup TestBed to work with Vitest
import { TestBed } from '@angular/core/testing';
import { 
  BrowserDynamicTestingModule, 
  platformBrowserDynamicTesting 
} from '@angular/platform-browser-dynamic/testing';
import { beforeAll, afterEach } from 'vitest';

// Initialize the Angular testing environment before all tests
beforeAll(() => {
  try {
    TestBed.initTestEnvironment(
      BrowserDynamicTestingModule,
      platformBrowserDynamicTesting(),
      { teardown: { destroyAfterEach: false } }
    );
  } catch (e) {
    // Already initialized
  }
});

// Reset TestBed after each test
afterEach(() => {
  TestBed.resetTestingModule();
});