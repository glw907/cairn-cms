// The engine ships the App.Locals.editor augmentation; one import applies it.
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    // The platform env a site's bindings ride under. The showcase reads it structurally (the upload
    // action and the /media route read `platform.env[binding]`), so a bare record types it without
    // pulling @cloudflare/workers-types into the showcase.
    interface Platform {
      env: Record<string, unknown>;
    }
  }
}

export {};
