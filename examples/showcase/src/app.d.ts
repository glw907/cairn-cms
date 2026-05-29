import type { Editor } from '@glw907/cairn-cms';

declare global {
  namespace App {
    interface Locals {
      editor: Editor | null;
    }
  }
}

export {};
