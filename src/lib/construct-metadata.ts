import { Metadata } from "next";

export function constructMetadata({
    title,
    fullTitle,
    description = "granted.gg is a platform that allows you to make money off your PPV content.",
    image = "",
    icons = [
        {
            rel: "apple-touch-icon",
            sizes: "32x32",
            url: "/assets/apple-touch-icon.png"
        },
        {
            rel: "icon",
            type: "image/png",
            sizes: "96x96",
            url: "/assets/favicon-96x96.png"
        },
        {
            rel: "icon",
            type: "image/png",
            sizes: "192x192",
            url: "/assets/favicon-192x192.png"
        },
    ],
    url,
    canonicalUrl,
    noIndex = false,
    manifest
}: {
    title?: string;
    fullTitle?: string;
    description?: string;
    image?: string;
    icons?: Metadata["icons"];
    url?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
    manifest?: string | URL | null;
} = {}): Metadata {
    return {
        title: fullTitle ||
            (title ? `${title} | Granted` : "granted.gg - Make money off your PPV content."),
        description,
        openGraph: {
            title,
            description,
            ...(image && {
                images: image
            }),
            url,
        },
        icons,
        metadataBase: new URL("https://granted.gg"),
        ...((url || canonicalUrl) && {
            alternates: {
                canonical: canonicalUrl || url,
            }
        }),
        ...(noIndex && {
            robots: {
                index: false,
                follow: false,
            }
        }),
        ...(manifest && {
            manifest,
        }),
    }
}