import { type MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AltaFoto",
    short_name: "AltaFoto",
    description: "Encontrá y descargá tus fotos deportivas en alta resolución",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0057A8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
