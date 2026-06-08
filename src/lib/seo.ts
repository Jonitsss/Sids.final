import { siteConfig } from "@/data/content";

export function getChurchSchema() {
  const { url, name, shortName, description, founded, address, social } =
    siteConfig;
  const ogImage = `${url}/assets/logo.png`;

  return {
    "@context": "https://schema.org",
    "@type": "Church",
    name,
    alternateName: shortName,
    description,
    url,
    logo: ogImage,
    image: ogImage,
    foundingDate: String(founded),
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.locality,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Thursday",
        opens: "20:00",
        closes: "22:00",
        description: "Reunión General",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "18:00",
        closes: "20:00",
        description: "Reunión de Jóvenes",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "18:00",
        closes: "20:00",
        description: "Reunión General",
      },
    ],
    sameAs: [social.facebook, social.youtube, social.instagram],
  };
}
