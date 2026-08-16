/**
 * Turns world land geometry into one static SVG path string.
 *
 *   node scripts/build-world-map.mjs
 *
 * Writes `content/worldMap.ts`. Run it only when the map itself needs
 * changing; the output is committed, so a build never reaches the network.
 *
 * Why this exists rather than a mapping library: the page has a hard budget of
 * 200KB of JavaScript and is already at 190. Shipping topojson plus a
 * projection to draw a shape that never changes would spend that budget on
 * arithmetic the build can do once. What reaches the browser is a `d`
 * attribute — markup, not script — which gzips well and costs nothing to
 * execute.
 *
 * Source: world-atlas land-110m (Natural Earth, public domain).
 */

import { readFile, writeFile } from "node:fs/promises";

const SOURCE = process.argv[2];
const OUT = "content/worldMap.ts";

/* The frame. Equirectangular, cropped at the bottom only: Antarctica is a
   third of the globe's height and Seahive's southernmost call is Cape Town at
   33.9S, so -56 loses nothing and buys a lot of width.

   The top sits just clear of the northernmost land instead. Cropping into the
   Arctic — 78N, as this did — cuts Greenland, Siberia and the Canadian
   archipelago off flat, and a straight edge running the full width of the map
   reads as a drawn rule rather than as coastline. That was invisible when the
   land was a solid shape and obvious the moment it became a dot grid. */
const LAT_TOP = 85;
const LAT_BOTTOM = -56;
const WIDTH = 1000;
const HEIGHT = Math.round(
  (WIDTH * (LAT_TOP - LAT_BOTTOM)) / 360,
);

/** Coordinate precision in output units. One decimal is ~0.4km at this scale. */
const PRECISION = 1;
/** Rings smaller than this in output units are dropped — specks, not islands. */
const MIN_RING_EXTENT = 2.4;
/**
 * Points closer together than this are dropped.
 *
 * The source carries coastline detail far finer than a 1000-unit-wide map can
 * show — fjords and estuaries that land inside a single pixel. At the size
 * this is drawn, thinning to 1.4 units is invisible and roughly halves the
 * bytes, which matters because this string is served on every page load.
 */
const MIN_POINT_GAP = 1.4;

/** Distance-based thinning. Keeps the last point so rings still close. */
function thin(points, gap) {
  const kept = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i];
    const [px, py] = kept[kept.length - 1];
    if (Math.hypot(x - px, y - py) >= gap) kept.push(points[i]);
  }
  kept.push(points[points.length - 1]);
  return kept;
}

export function project(lon, lat) {
  return [
    ((lon + 180) / 360) * WIDTH,
    ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * HEIGHT,
  ];
}

/** TopoJSON stores arcs delta-encoded against a quantised grid. */
function decodeArcs(topology) {
  const { scale, translate } = topology.transform;
  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
}

/** A negative index means "this arc, reversed" — encoded as ~i. */
function ringFrom(indexes, arcs) {
  const points = [];
  for (const index of indexes) {
    const arc = index < 0 ? [...arcs[~index]].reverse() : arcs[index];
    // The last point of one arc is the first of the next; drop the duplicate.
    points.push(...(points.length ? arc.slice(1) : arc));
  }
  return points;
}

async function main() {
  if (!SOURCE) throw new Error("usage: node scripts/build-world-map.mjs <land-110m.json>");
  const topology = JSON.parse(await readFile(SOURCE, "utf8"));
  const arcs = decodeArcs(topology);
  const land = topology.objects.land;

  // land-110m wraps its geometry in a GeometryCollection, and each member is
  // either a Polygon (arcs = rings) or a MultiPolygon (arcs = polygons of
  // rings). Flatten both down to a flat list of rings.
  const members =
    land.type === "GeometryCollection" ? land.geometries : [land];
  const polygons = [];
  for (const member of members) {
    if (member.type === "MultiPolygon") polygons.push(...member.arcs);
    else if (member.type === "Polygon") polygons.push(member.arcs);
  }

  const paths = [];
  let dropped = 0;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      const points = ringFrom(ring, arcs).map(([lon, lat]) =>
        project(lon, lat),
      );
      if (points.length < 4) {
        dropped += 1;
        continue;
      }

      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const extent = Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      );
      if (extent < MIN_RING_EXTENT) {
        dropped += 1;
        continue;
      }

      // Round first, then drop consecutive duplicates — rounding is what
      // creates them, and they are pure bytes.
      const rounded = points.map(
        ([x, y]) => [
          Number(x.toFixed(PRECISION)),
          Number(y.toFixed(PRECISION)),
        ],
      );
      const deduped = rounded.filter(
        (p, i) => i === 0 || p[0] !== rounded[i - 1][0] || p[1] !== rounded[i - 1][1],
      );
      const kept = deduped.length > 4 ? thin(deduped, MIN_POINT_GAP) : deduped;
      if (kept.length < 4) {
        dropped += 1;
        continue;
      }

      paths.push(
        `M${kept.map(([x, y]) => `${x} ${y}`).join("L")}Z`,
      );
    }
  }

  const d = paths.join("");

  const file = `/**
 * The world, as one SVG path.
 *
 * GENERATED by scripts/build-world-map.mjs from world-atlas land-110m
 * (Natural Earth, public domain). Do not edit by hand — regenerate.
 *
 * Equirectangular, cropped to ${LAT_TOP}N–${Math.abs(LAT_BOTTOM)}S. The bottom is cut
 * because Antarctica is a third of the globe's height and the southernmost
 * port on this page is Cape Town at 33.9S. The top is NOT cut into the land:
 * it clears the northernmost coast, so the map's top edge is a real shoreline
 * rather than a straight rule running the full width.
 *
 * It is a path string rather than a map library because it never changes, and
 * markup does not count against the page's JavaScript budget.
 */

/** viewBox width. Longitude -180..180 maps across this. */
export const MAP_WIDTH = ${WIDTH};
/** viewBox height. Latitude ${LAT_TOP}..${LAT_BOTTOM} maps down this. */
export const MAP_HEIGHT = ${HEIGHT};

const LAT_TOP = ${LAT_TOP};
const LAT_BOTTOM = ${LAT_BOTTOM};

/**
 * Longitude and latitude to viewBox coordinates. The same projection the path
 * was generated with — if one changes the other has to.
 */
export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * MAP_WIDTH,
    y: ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * MAP_HEIGHT,
  };
}

export const WORLD_PATH =
  "${d}";
`;

  await writeFile(OUT, file, "utf8");
  console.log(
    `${paths.length} rings kept, ${dropped} dropped — ${(d.length / 1024).toFixed(0)} KB of path data, viewBox ${WIDTH}x${HEIGHT}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
