let s = "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  const re = /<node ([^>]+)\/>/g;
  let m;
  const nodes = [];
  while ((m = re.exec(s))) {
    const attrs = {};
    const ar = /([a-z-]+)="([^"]*)"/g;
    let a;
    while ((a = ar.exec(m[1]))) attrs[a[1]] = a[2];
    const b = attrs.bounds || "";
    const bm = b.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (bm) {
      nodes.push({
        x1: +bm[1], y1: +bm[2], x2: +bm[3], y2: +bm[4],
        cls: attrs.class, text: attrs.text, desc: attrs["content-desc"],
        clickable: attrs.clickable, selected: attrs.selected,
      });
    }
  }
  // Only nodes in the bottom 300px
  const bottom = nodes.filter((n) => n.y1 >= 2100 && n.y2 <= 2400);
  bottom.sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1);
  for (const n of bottom) {
    console.log(
      `[${n.x1},${n.y1}][${n.x2},${n.y2}] ${n.cls.split(".").pop()} text="${n.text}" desc="${n.desc}" sel=${n.selected}`
    );
  }
});
