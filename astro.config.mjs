import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://runtime-module-composition.dev",
  redirects: {
    "/quick-start/react": "/quick-start/module-boundary/direct",
    "/quick-start/vue": "/quick-start/independent-mount/vue",
    "/quick-start/existing-app": "/quick-start/module-boundary/existing-app",
  },
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
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://runtime-module-composition.dev/og.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:width",
            content: "1200",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:height",
            content: "630",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://runtime-module-composition.dev/og.png",
          },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/runtime-module-composition/rmc-toolkit",
        },
      ],
      sidebar: [
        {
          label: "Start Here",
          items: [{ label: "Choose a Pattern", slug: "choose-a-pattern" }],
        },
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
            {
              label: "Module Boundary",
              items: [
                { label: "Overview", slug: "quick-start/module-boundary" },
                { label: "Direct (React)", slug: "quick-start/module-boundary/direct" },
                { label: "Injected", slug: "quick-start/module-boundary/injected" },
                { label: "Existing App", slug: "quick-start/module-boundary/existing-app" },
              ],
            },
            {
              label: "Independent Mount",
              items: [
                { label: "Overview", slug: "quick-start/independent-mount" },
                { label: "React", slug: "quick-start/independent-mount/react" },
                { label: "Vue", slug: "quick-start/independent-mount/vue" },
              ],
            },
            {
              label: "Advanced",
              items: [{ label: "No Manifest Host", slug: "quick-start/advanced/no-manifest-host" }],
            },
          ],
        },
        {
          label: "Library",
          items: [
            { label: "Multi-Framework Demo", slug: "demo" },
            { label: "API Reference", slug: "api-reference" },
          ],
        },
        {
          label: "Articles",
          items: [{ autogenerate: { directory: "articles" } }],
        },
      ],
      customCss: ["./src/styles/custom.css"],
      components: {
        Footer: "./src/components/Footer.astro",
      },
    }),
  ],
});
