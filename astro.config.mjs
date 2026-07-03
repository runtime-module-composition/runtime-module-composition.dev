import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://runtime-module-composition.dev",
  integrations: [
    starlight({
      title: "Runtime Module Composition",
      description:
        "A browser-native microfrontend architecture for composing independently deployed ESM modules at runtime.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/runtime-module-composition/runtime-module-composition.dev",
        },
      ],
      sidebar: [
        {
          label: "Architecture",
          items: [
            { label: "Overview", slug: "index" },
            {
              label: "Technical Implementation",
              slug: "technical-implementation",
            },
          ],
        },
      ],
      customCss: ["./src/styles/custom.css"],
    }),
  ],
});
