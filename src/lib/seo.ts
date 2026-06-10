import { siteConfig } from "@/data/content";

export function getChurchSchema() {
  const { url, name, shortName, description, founded, address, social } =
    siteConfig;
  const ogImage = `${url}/og-image.png`;
  const logoImage = `${url}/assets/logo.png`;

  const church = {
    "@context": "https://schema.org",
    "@type": "Church",
    name,
    alternateName: shortName,
    description,
    url,
    logo: {
      "@type": "ImageObject",
      url: logoImage,
      width: 512,
      height: 512,
    },
    image: {
      "@type": "ImageObject",
      url: ogImage,
      width: 1200,
      height: 630,
    },
    foundingDate: String(founded),
    priceRange: "Free",
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.locality,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "-34.8575",
      longitude: "-58.3333",
    },
    hasMap:
      "https://www.google.com/maps/search/?api=1&query=Calle+21+y+7,+Ingeniero+Allan,+Buenos+Aires",
    areaServed: {
      "@type": "City",
      name: "Ingeniero Allan",
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: "Buenos Aires",
      },
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
    event: [
      {
        "@type": "Event",
        name: "Reunión General",
        description: "Reunión general de la iglesia",
        startDate: "2026-01-01T20:00:00-03:00",
        endDate: "2026-01-01T22:00:00-03:00",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name,
          address: {
            "@type": "PostalAddress",
            streetAddress: address.street,
            addressLocality: address.locality,
            addressRegion: address.region,
            addressCountry: address.country,
          },
        },
        organizer: {
          "@type": "Organization",
          name,
          url,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "ARS",
          availability: "https://schema.org/InStock",
          url,
        },
        recurrence: {
          "@type": "Schedule",
          repeatFrequency: "P1W",
          byDay: "Thursday",
          startTime: "20:00",
          endTime: "22:00",
        },
      },
      {
        "@type": "Event",
        name: "Reunión de Jóvenes",
        description: "Reunión especial para jóvenes",
        startDate: "2026-01-01T18:00:00-03:00",
        endDate: "2026-01-01T20:00:00-03:00",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name,
          address: {
            "@type": "PostalAddress",
            streetAddress: address.street,
            addressLocality: address.locality,
            addressRegion: address.region,
            addressCountry: address.country,
          },
        },
        organizer: {
          "@type": "Organization",
          name,
          url,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "ARS",
          availability: "https://schema.org/InStock",
          url,
        },
        recurrence: {
          "@type": "Schedule",
          repeatFrequency: "P1W",
          byDay: "Saturday",
          startTime: "18:00",
          endTime: "20:00",
        },
      },
      {
        "@type": "Event",
        name: "Reunión General",
        description: "Reunión general dominical",
        startDate: "2026-01-01T18:00:00-03:00",
        endDate: "2026-01-01T20:00:00-03:00",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name,
          address: {
            "@type": "PostalAddress",
            streetAddress: address.street,
            addressLocality: address.locality,
            addressRegion: address.region,
            addressCountry: address.country,
          },
        },
        organizer: {
          "@type": "Organization",
          name,
          url,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "ARS",
          availability: "https://schema.org/InStock",
          url,
        },
        recurrence: {
          "@type": "Schedule",
          repeatFrequency: "P1W",
          byDay: "Sunday",
          startTime: "18:00",
          endTime: "20:00",
        },
      },
    ],
  };

  return church;
}

export function getOrganizationSchema() {
  const { url, name, shortName, description, social } = siteConfig;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    alternateName: shortName,
    description,
    url,
    logo: `${url}/assets/logo.png`,
    sameAs: [social.facebook, social.youtube, social.instagram],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Información general",
      areaServed: "AR",
      availableLanguage: "Spanish",
    },
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
