const CATEGORY_GROUP_SQL = `
  COALESCE(
    NULLIF(to_jsonb(c)->>'category_group', ''),
    CASE
      WHEN LOWER(c.name) LIKE '%electronics%' OR LOWER(c.name) IN ('mobiles', 'mobile') THEN 'electronics'
      WHEN LOWER(c.name) LIKE '%fashion%' THEN 'fashion'
      WHEN LOWER(c.name) LIKE '%vehicle%' THEN 'vehicles'
      ELSE 'others'
    END
  )
`;

const CATEGORY_GROUP_VALUES = new Set(["electronics", "fashion", "vehicles", "others"]);

module.exports = {
  CATEGORY_GROUP_SQL,
  CATEGORY_GROUP_VALUES,
};
