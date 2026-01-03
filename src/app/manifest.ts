import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "granted.gg",
        short_name: "granted.gg",
        description: "Make money off your PPV content.",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#fff",
        icons: [
            //{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
    }
}