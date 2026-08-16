import { GATEWAYS, LANES } from "@/content/lanes";
import { MAP_HEIGHT, MAP_WIDTH, WORLD_PATH, project } from "@/content/worldMap";

/**
 * Where Seahive calls, as dots on a dotted world.
 *
 * No arcs, no arrows, no animated planes tracing routes. Every freight site
 * draws those, they say nothing a dot does not, and a page whose one moving
 * element is the ripple cannot afford a second system competing with it. The
 * map is a static picture; the only thing it claims is position.
 *
 * The land is a halftone rather than a solid shape — a dot grid clipped to the
 * coastline, so the continents read as texture and the marks sitting on them
 * are the only solid things in the frame. It costs nothing to draw this way:
 * the pattern is four elements and the clip reuses the same `WORLD_PATH` the
 * solid fill used, so the dots are a rendering decision rather than more data.
 *
 * Every place gets the same mark. Origin and destination were drawn
 * differently once, which invited the reader to decode a key before they could
 * read the picture — and the distinction is not one a visitor needs, because
 * everything on this map is somewhere Seahive works.
 *
 * Rendered on the server. `WORLD_PATH` is 47KB of coordinates, and if this
 * were a client component that string would be shipped twice — once as markup
 * and again inside the hydration payload, which is most of the page's
 * remaining JavaScript budget. Nothing here needs an event handler, so nothing
 * here is client-side.
 */

/**
 * The halftone, at two densities.
 *
 * A pattern is defined in viewBox units, so it scales with the drawing: the
 * fine grid is 180 dots across whatever width the map is given. On a phone
 * that width is around 320px, which puts each dot under a pixel across — and a
 * sub-pixel dot grid does not render as dots, it renders as moiré banding.
 *
 * So the small-screen map uses a coarser grid: fewer, bigger dots, less
 * coastline detail, but unmistakably a dot grid. Two rects and two patterns is
 * the whole cost, and only one of them is ever painted.
 */
const GRIDS = {
  fine: { id: "port-map-halftone", pitch: 5.6, r: 1.6 },
  coarse: { id: "port-map-halftone-coarse", pitch: 10.5, r: 3 },
} as const;
/**
 * Land dots are graphite held well back, not mist.
 *
 * A dot grid covers about a quarter of the area it fills, so it lands roughly
 * a quarter as dark as the same colour laid down solid. Drawn in `mist-deep`,
 * which was right for a solid landmass, the continents came out barely
 * separable from the panel behind them. Graphite at this opacity puts the
 * *perceived* tone back where the solid fill had it while keeping every
 * individual dot visible — and graphite is a true neutral, so nothing here
 * introduces a second hue.
 */
const LAND_OPACITY = 0.45;

/**
 * Places closer together than this share a mark.
 *
 * Delhi airport and ICD Tughlakabad are 17km apart, which at this scale is
 * half a unit — two dots would land on top of each other and read as one
 * slightly wrong blob with only the upper one reachable on hover. Merging them
 * is honest about what the map can actually resolve.
 */
const MERGE_WITHIN = 3;

export default function PortMap() {
  // Everywhere Seahive works: the Indian gateways it ships out of and every
  // port and airport it calls, in one list. Lanes share discharge ports, so
  // this is de-duplicated by code before anything is drawn.
  const places = Array.from(
    new Map(
      [...Object.values(GATEWAYS), ...LANES.map((lane) => lane.destination)].map(
        (place) => [place.code, place],
      ),
    ).values(),
  );

  // Then merged again by position, so two berths in one city are one mark.
  const marks = new Map<string, { x: number; y: number; names: string[] }>();
  for (const place of places) {
    const { x, y } = project(place.lon, place.lat);
    const key = `${Math.round(x / MERGE_WITHIN)},${Math.round(y / MERGE_WITHIN)}`;
    const existing = marks.get(key);
    const label = `${place.name}, ${place.country} — ${place.code}`;
    if (existing) existing.names.push(label);
    else marks.set(key, { x, y, names: [label] });
  }

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`World map showing the ${marks.size} ports and airports Seahive serves.`}
      >
        <defs>
          {Object.values(GRIDS).map((grid) => (
            <pattern
              key={grid.id}
              id={grid.id}
              width={grid.pitch}
              height={grid.pitch}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={grid.pitch / 2}
                cy={grid.pitch / 2}
                r={grid.r}
                fill="var(--color-graphite)"
                opacity={LAND_OPACITY}
              />
            </pattern>
          ))}
          <clipPath id="port-map-land">
            <path d={WORLD_PATH} />
          </clipPath>
        </defs>

        {/* The land, as texture. One rect of dots, cut to the coastline. */}
        <rect
          className="sm:hidden"
          x={0}
          y={0}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          fill={`url(#${GRIDS.coarse.id})`}
          clipPath="url(#port-map-land)"
        />
        <rect
          className="hidden sm:block"
          x={0}
          y={0}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          fill={`url(#${GRIDS.fine.id})`}
          clipPath="url(#port-map-land)"
        />

        {/* Where we work. One mark, one meaning. */}
        {Array.from(marks.entries()).map(([key, mark]) => (
          <circle key={key} cx={mark.x} cy={mark.y} r={3.4} fill="var(--color-marine)">
            <title>{mark.names.join(" · ")}</title>
          </circle>
        ))}
      </svg>

      {/* The label is its own element with nothing but text in it. The swatch
          is a sibling, not a child: the contrast probe hides glyphs and samples
          the pixels behind them, so a marine swatch sharing an element with the
          label makes the label read as 1.05:1 against its own legend key. */}
      <figcaption className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 font-data text-eyebrow uppercase text-graphite">
        <span className="inline-flex items-center gap-2.5">
          <svg width="15" height="15" aria-hidden="true" className="shrink-0">
            <circle cx="7.5" cy="7.5" r="3.4" fill="var(--color-marine)" />
          </svg>
          <span>Ports and airports we serve</span>
        </span>
      </figcaption>
    </figure>
  );
}
