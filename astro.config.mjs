import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://runtime-module-composition.dev",
  integrations: [
    starlight({
      title: "Runtime Module Composition",
      description:
        "A browser-native microfrontend architecture for composing independently deployed ESM modules at runtime.",
      logo: {
        src: "./src/assets/logo.png",
        replacesTitle: true,
      },
      favicon: "/favicon.png",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/runtime-module-composition/rmc-toolkit",
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
            { label: "Architecture Diagrams", slug: "architecture-diagrams" },
            { label: "Glossary", slug: "glossary" },
          ],
        },
        {
          label: "Quick Start",
          items: [
            { label: "Overview", slug: "quick-start" },
            { label: "React", slug: "quick-start/react" },
            { label: "Vue", slug: "quick-start/vue" },
          ],
        },
        {
          label: "Library",
          items: [
            { label: "Multi-Framework Demo", slug: "demo" },
            { label: "API Reference", slug: "api-reference" },
          ],
        },
      ],
      customCss: ["./src/styles/custom.css"],
      components: {
        Footer: "./src/components/Footer.astro",
      },
    }),
  ],
});
