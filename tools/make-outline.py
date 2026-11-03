from PIL import Image, ImageDraw
import json, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, 'src', 'data', 'hainan-province.json')
data = json.load(open(src, encoding='utf-8'))

# Hainan main island bounds (exclude Sansha islands in the south)
LON_MIN, LON_MAX = 108.4, 111.2
LAT_MIN, LAT_MAX = 18.0, 20.3
W, H = 1800, 2200
PAD = 60

feats = data.get('features', [data])
polys = []
for f in feats:
    g = f.get('geometry') or {}
    coords = g.get('coordinates') or []
    if g.get('type') == 'Polygon':
        coords = [coords]
    for poly in coords:
        ring = poly[0] if poly else []
        if not ring:
            continue
        # keep polygons whose centroid is in main island bounds
        lon = sum(p[0] for p in ring) / len(ring)
        lat = sum(p[1] for p in ring) / len(ring)
        if LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX:
            polys.append(ring)

if not polys:
    sys.exit('no main island polygons')

def project(lon, lat):
    x = (lon - LON_MIN) / (LON_MAX - LON_MIN)
    y = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN)
    return (PAD + x * (W - 2 * PAD), PAD + y * (H - 2 * PAD))

img = Image.new('1', (W, H), 0)
draw = ImageDraw.Draw(img)
for ring in polys:
    pts = [project(lon, lat) for lon, lat in ring]
    if len(pts) >= 3:
        draw.polygon(pts, fill=1)

# Find largest connected component via flood fill (4-neighbour), keep main island only.
px = img.load()
seen = bytearray(W * H)
best = []
from collections import deque
for yy in range(H):
    for xx in range(W):
        idx = yy * W + xx
        if px[xx, yy] and not seen[idx]:
            q = deque([(xx, yy)])
            seen[idx] = 1
            comp = []
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0 <= nx < W and 0 <= ny < H:
                        ni = ny * W + nx
                        if px[nx, ny] and not seen[ni]:
                            seen[ni] = 1
                            q.append((nx, ny))
            if len(comp) > len(best):
                best = comp
if not best:
    sys.exit('no component')

main = Image.new('1', (W, H), 0)
mp = main.load()
for x, y in best:
    mp[x, y] = 1

# Moore-neighbour contour tracing on the largest component.
# Find top-most, then left-most foreground pixel.
start = min(best, key=lambda p: (p[1], p[0]))
dirs = [(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1),(0,-1),(1,-1)]

def fg(x, y):
    return 0 <= x < W and 0 <= y < H and mp[x, y] == 1

# Find a boundary start: top-most pixel, then scan left-to-right for first foreground.
start = None
for y in range(H):
    for x in range(W):
        if mp[x, y]:
            start = (x, y)
            break
    if start:
        break

contour = []
cur = start
prev_dir = 6  # coming from below? start moving left/up
# Simple Moore tracing with backtracking.
b = start
c = (start[0] - 1, start[1])  # previous (left) assumed background
contour.append(b)
for step in range(W * H):
    found = False
    # start looking from the direction of previous point, clockwise
    base = None
    dx, dy = c[0] - b[0], c[1] - b[1]
    for i, d in enumerate(dirs):
        if d == (dx, dy):
            base = i
            break
    if base is None:
        base = 0
    for k in range(8):
        i = (base + k + 1) % 8
        nx, ny = b[0] + dirs[i][0], b[1] + dirs[i][1]
        if fg(nx, ny):
            c = b
            b = (nx, ny)
            contour.append(b)
            found = True
            break
    if not found:
        break
    if b == start and len(contour) > 10:
        break

# Remove duplicate consecutive points.
clean = []
for p in contour:
    if not clean or p != clean[-1]:
        clean.append(p)

# RDP simplify
def rdp(points, eps):
    if len(points) < 3:
        return points
    def perp(p, a, b):
        if a == b:
            return math.hypot(p[0]-a[0], p[1]-a[1])
        x1, y1 = a; x2, y2 = b; x0, y0 = p
        dx, dy = x2-x1, y2-y1
        t = ((x0-x1)*dx + (y0-y1)*dy) / (dx*dx + dy*dy)
        t = max(0, min(1, t))
        px, py = x1 + t*dx, y1 + t*dy
        return math.hypot(x0-px, y0-py)
    dmax, index = 0, 0
    for i in range(1, len(points)-1):
        d = perp(points[i], points[0], points[-1])
        if d > dmax:
            dmax, index = d, i
    if dmax > eps:
        left = rdp(points[:index+1], eps)
        right = rdp(points[index:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]

simp = rdp(clean, 2.2)
if simp[0] == simp[-1]:
    simp = simp[:-1]

# Normalize into 0..1000 viewBox, preserve aspect.
xs = [p[0] for p in simp]; ys = [p[1] for p in simp]
minx, maxx = min(xs), max(xs); miny, maxy = min(ys), max(ys)
w, h = maxx-minx, maxy-miny
scale = 1000.0 / max(w, h)
ox = (1000 - w*scale)/2
oy = (1000 - h*scale)/2
norm = [((x-minx)*scale+ox, (y-miny)*scale+oy) for x, y in simp]

out = {
    'viewBox': [0, 0, 1000, 1000],
    'points': [[round(x, 2), round(y, 2)] for x, y in norm],
    'source': 'DataV Hainan GeoJSON (main island, dissolved by raster)',
    'pointCount': len(norm),
}
os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
with open(os.path.join(ROOT, 'src', 'data', 'hainan-outline.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

path = 'M ' + ' L '.join(f'{x:.2f} {y:.2f}' for x, y in norm) + ' Z'
with open(os.path.join(ROOT, 'src', 'data', 'hainan-outline.svg'), 'w', encoding='utf-8') as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000"><rect width="1000" height="1000" fill="#061311"/><path d="{path}" fill="none" stroke="#E4552F" stroke-width="3"/></svg>')
with open(os.path.join(ROOT, 'src', 'data', 'hainan-path.txt'), 'w', encoding='utf-8') as f:
    f.write(path)

print('polygons', len(polys))
print('component px', len(best))
print('raw contour', len(contour), 'clean', len(clean), 'simplified', len(simp))
print('bbox', minx, miny, maxx, maxy)
print('wrote src/data/hainan-outline.json/.svg/.txt')
