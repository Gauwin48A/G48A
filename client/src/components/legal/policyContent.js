const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizePoints = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
};

export const normalizePolicySections = (content, fallbackSections = []) => {
  const source =
    content && typeof content === "object" && !Array.isArray(content)
      ? content
      : {};
  const rawSections =
    source.sections ||
    source.blocks ||
    source.items ||
    source.content?.sections ||
    source.content?.blocks ||
    source.content?.items ||
    [];

  const sections = asArray(rawSections)
    .map((section, index) => {
      if (!section || typeof section !== "object") return null;
      const heading =
        section.heading ||
        section.title ||
        section.label ||
        section.name ||
        `Section ${index + 1}`;
      const points = normalizePoints(
        section.points ||
          section.bullets ||
          section.items ||
          section.content ||
          section.body ||
          ""
      );
      if (!points.length) return null;
      return {
        heading: String(heading || "").trim() || `Section ${index + 1}`,
        points,
      };
    })
    .filter(Boolean);

  if (sections.length) {
    return sections;
  }

  const rawBody =
    source.body || source.text || source.content || source.description || "";
  const fallbackPoints = normalizePoints(rawBody);
  if (fallbackPoints.length) {
    return [
      {
        heading: String(source.heading || source.title || "Policy").trim(),
        points: fallbackPoints,
      },
    ];
  }

  return fallbackSections;
};

export const resolvePolicyUpdatedOn = (content, fallback) => {
  const source =
    content && typeof content === "object" && !Array.isArray(content)
      ? content
      : {};
  return (
    source.updatedOn ||
    source.updated_on ||
    source.updatedAt ||
    source.updated_at ||
    fallback
  );
};

export const resolvePolicyTitle = (content, fallback) => {
  const source =
    content && typeof content === "object" && !Array.isArray(content)
      ? content
      : {};
  return source.title || source.heading || fallback;
};

export const resolvePolicySubtitle = (content, fallback) => {
  const source =
    content && typeof content === "object" && !Array.isArray(content)
      ? content
      : {};
  return source.subtitle || source.description || fallback;
};

export default {
  normalizePolicySections,
  resolvePolicyUpdatedOn,
  resolvePolicyTitle,
  resolvePolicySubtitle,
};
