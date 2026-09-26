"""Split geoBoundaries CHN ADM3 simplified GeoJSON into province-sized files.

Input: scripts/source/china-adm3.geojson and public/data/china-adm1.geojson.
Output: public/data/china-counties/<ADM1 shapeID>.geojson.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "data"
provinces = json.loads((ROOT / "china-adm1.geojson").read_text(encoding="utf-8"))["features"]
counties = json.loads((Path(__file__).resolve().parent / "source" / "china-adm3.geojson").read_text(encoding="utf-8"))["features"]
output = ROOT / "china-counties"
output.mkdir(exist_ok=True)


def polygons(feature):
    geometry = feature["geometry"]
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return geometry["coordinates"]
    return []


def ring_contains(point, ring):
    x, y = point
    inside = False
    for i in range(len(ring)):
        x1, y1 = ring[i - 1]
        x2, y2 = ring[i]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def contains(feature, point):
    return any(
        ring_contains(point, polygon[0])
        and not any(ring_contains(point, hole) for hole in polygon[1:])
        for polygon in polygons(feature)
    )


def center(feature):
    best = None
    for polygon in polygons(feature):
        ring = polygon[0]
        twice_area = cx = cy = 0.0
        for i in range(len(ring)):
            x1, y1 = ring[i - 1]
            x2, y2 = ring[i]
            cross = x1 * y2 - x2 * y1
            twice_area += cross
            cx += (x1 + x2) * cross
            cy += (y1 + y2) * cross
        if abs(twice_area) > 1e-9 and (best is None or abs(twice_area) > best[0]):
            best = (abs(twice_area), (cx / (3 * twice_area), cy / (3 * twice_area)))
    if best:
        return best[1]
    return polygons(feature)[0][0][0]


groups = {province["properties"]["shapeID"]: [] for province in provinces}
unmatched = []
overlap = []
for county in counties:
    point = center(county)
    matches = [p for p in provinces if contains(p, point)]
    if not matches:
        unmatched.append(county["properties"].get("shapeName"))
        matches = [min(
            provinces,
            key=lambda p: min(
                (vertex[0] - point[0]) ** 2 + (vertex[1] - point[1]) ** 2
                for polygon in polygons(p) for vertex in polygon[0]
            ),
        )]
    if len(matches) > 1:
        overlap.append(county["properties"].get("shapeName"))
    if county["properties"].get("shapeName") == "Dachang Hui Autonomous County":
        province = next(p for p in provinces if p["properties"]["shapeName"] == "Hebei Province")
    else:
        province = min(matches, key=lambda p: abs(center(p)[0] - point[0]) + abs(center(p)[1] - point[1]))
    groups[province["properties"]["shapeID"]].append(county)

for province in provinces:
    shape_id = province["properties"]["shapeID"]
    payload = {"type": "FeatureCollection", "features": groups[shape_id]}
    (output / f"{shape_id}.geojson").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

print(f"assigned={sum(map(len, groups.values()))} unmatched={len(unmatched)} overlaps={len(overlap)}")
print("unmatched samples:", unmatched[:15])
print("Beijing:", [len(groups[p["properties"]["shapeID"]]) for p in provinces if p["properties"]["shapeName"] == "Beijing Municipality"])
