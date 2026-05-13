/* =========================================================================
   Minimal markdown renderer for study guides + reference notes.
   Supported:  # ## ### headings, **bold**, *italic*, `code`, [links](url),
               ![images](url), unordered lists (- or *), numbered lists,
               blockquotes (>), fenced code blocks (```),
               GFM pipe tables, horizontal rules (---), paragraphs.
   Pure DOM construction — no innerHTML, no HTML strings. Safe by default.
   Exposed: mdRender(sourceText, ctx?) -> DocumentFragment.
   Context: { bibId: string } lets the renderer resolve guide-relative paths:
     - `images/foo.png`      ->  data/bibs/<bibId>/study-guides/images/foo.png
     - `references/foo.pdf`  ->  data/bibs/<bibId>/references/foo.pdf
   ========================================================================= */

// Blocked schemes / patterns. Checked first so trimmed input cannot bypass.
const UNSAFE_SCHEME_RE = /^(?:javascript|vbscript|data|file):/i;

/**
 * Resolve a markdown link / image URL into a safe, app-relative or absolute
 * URL. Returns null when the URL is unsafe (caller falls back to plain text).
 */
export function resolveAssetUrl(url, ctx) {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Reject unsafe schemes outright.
  if (UNSAFE_SCHEME_RE.test(trimmed)) return null;
  // Reject protocol-relative URLs (//evil.example/x).
  if (trimmed.startsWith("//")) return null;

  // Safe absolute / cross-origin forms (left untouched).
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed))     return trimmed;
  if (trimmed.startsWith("#"))       return trimmed;
  if (trimmed.startsWith("/"))       return trimmed;
  if (trimmed.startsWith("./") || trimmed.startsWith("../")) return trimmed;
  // Already operator-rooted at the bib data tree.
  if (trimmed.startsWith("data/bibs/")) return trimmed;

  // Guide-relative rewrites. Both fall back to the raw string if no bib
  // context was supplied, so user notes (no bibId) still render predictably.
  if (ctx?.bibId && trimmed.startsWith("images/")) {
    return `data/bibs/${ctx.bibId}/study-guides/${trimmed}`;
  }
  if (ctx?.bibId && trimmed.startsWith("references/")) {
    return `data/bibs/${ctx.bibId}/${trimmed}`;
  }

  // Anything else relative: keep as-is. Same-origin only by construction.
  return trimmed;
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/* Inline matcher.  Order matters: image must precede link because both
   start with a bracket and the image is the `!`-prefixed variant.
     Groups:
       1 image-full,   2 alt,   3 img-url
       4 code-full,    5 code-text
       6 bold-full,    7 bold-text
       8 italic-full,  9 italic-text
      10 link-full,   11 label, 12 link-url
*/
const INLINE_RE = /(!\[([^\]]*)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*?)\*)|(\[([^\]]+)\]\(([^)]+)\))/;

function inlineFrag(text, ctx) {
  const frag = document.createDocumentFragment();
  let remaining = String(text || "");
  while (remaining.length > 0) {
    const m = remaining.match(INLINE_RE);
    if (!m) {
      frag.appendChild(document.createTextNode(remaining));
      break;
    }
    if (m.index > 0) frag.appendChild(document.createTextNode(remaining.slice(0, m.index)));

    if (m[2] !== undefined) {
      // image
      const alt = m[2];
      const resolved = resolveAssetUrl(m[3], ctx);
      if (resolved != null) {
        const img = document.createElement("img");
        img.setAttribute("src", resolved);
        img.setAttribute("alt", alt);
        img.setAttribute("loading", "lazy");
        img.className = "md-img";
        frag.appendChild(img);
      } else {
        frag.appendChild(document.createTextNode(alt));
      }
    } else if (m[5] !== undefined) {
      const code = document.createElement("code");
      code.textContent = m[5];
      frag.appendChild(code);
    } else if (m[7] !== undefined) {
      const strong = document.createElement("strong");
      strong.appendChild(inlineFrag(m[7], ctx));
      frag.appendChild(strong);
    } else if (m[9] !== undefined) {
      const em = document.createElement("em");
      em.appendChild(inlineFrag(m[9], ctx));
      frag.appendChild(em);
    } else if (m[11] !== undefined) {
      const label = m[11];
      const resolved = resolveAssetUrl(m[12], ctx);
      if (resolved != null) {
        const a = document.createElement("a");
        a.setAttribute("href", resolved);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
        a.appendChild(inlineFrag(label, ctx));
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(label));
      }
    }
    remaining = remaining.slice(m.index + m[0].length);
  }
  return frag;
}

/* Parse a pipe-table row into cells. Trims leading/trailing `|` and whitespace. */
function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

/* Is this line a valid GFM table separator row? e.g. `|---|:--|--:|:-:|` */
function isTableSeparator(line) {
  if (!line) return false;
  const s = line.trim();
  if (!s.includes("|")) return false;
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(s);
}

/* Looks like a table row (starts with `|` and contains at least one more `|`). */
function looksLikeTableRow(line) {
  const s = (line || "").trim();
  return s.startsWith("|") && s.indexOf("|", 1) !== -1;
}

export function mdRender(source, ctx) {
  const out = document.createDocumentFragment();
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      i++;
      const buf = [];
      while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++;
      code.textContent = buf.join("\n");
      pre.appendChild(code);
      out.appendChild(pre);
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const m = line.match(/^(#{1,6})\s+(.*?)(?:\s*\{#([a-zA-Z0-9_\-:.]+)\})?\s*$/);
      const level = Math.min(6, Math.max(1, m[1].length));
      const h = document.createElement("h" + level);
      const id = m[3] || slugify(m[2]);
      if (id) h.id = id;
      h.appendChild(inlineFrag(m[2], ctx));
      out.appendChild(h);
      i++;
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      out.appendChild(document.createElement("hr"));
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const ul = document.createElement("ul");
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const li = document.createElement("li");
        li.appendChild(inlineFrag(lines[i].replace(/^\s*[-*]\s+/, ""), ctx));
        ul.appendChild(li);
        i++;
      }
      out.appendChild(ul);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const ol = document.createElement("ol");
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const li = document.createElement("li");
        li.appendChild(inlineFrag(lines[i].replace(/^\s*\d+\.\s+/, ""), ctx));
        ol.appendChild(li);
        i++;
      }
      out.appendChild(ol);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const bq = document.createElement("blockquote");
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      bq.appendChild(inlineFrag(buf.join(" "), ctx));
      out.appendChild(bq);
      continue;
    }

    /* GFM pipe table: header row + separator row (|---|---|) + body rows. */
    if (looksLikeTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((cell) => {
        const t = cell.trim();
        const l = t.startsWith(":");
        const r = t.endsWith(":");
        if (l && r) return "center";
        if (r) return "right";
        if (l) return "left";
        return null;
      });
      i += 2;

      const table = document.createElement("table");
      table.className = "md-table";

      const thead = document.createElement("thead");
      const htr = document.createElement("tr");
      header.forEach((h, idx) => {
        const th = document.createElement("th");
        if (aligns[idx]) th.style.textAlign = aligns[idx];
        th.appendChild(inlineFrag(h, ctx));
        htr.appendChild(th);
      });
      thead.appendChild(htr);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      while (i < lines.length && looksLikeTableRow(lines[i])) {
        const cells = splitRow(lines[i]);
        const tr = document.createElement("tr");
        // Pad/truncate to header width so rows stay aligned.
        for (let c = 0; c < header.length; c++) {
          const td = document.createElement("td");
          if (aligns[c]) td.style.textAlign = aligns[c];
          td.appendChild(inlineFrag(cells[c] ?? "", ctx));
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
        i++;
      }
      table.appendChild(tbody);
      out.appendChild(table);
      continue;
    }

    /* Paragraph: absorb continuation lines until we hit a block boundary. */
    const p = document.createElement("p");
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s+|```|\s*---+\s*$|\s*[-*]\s+|\s*\d+\.\s+|\s*>\s?|\s*\|)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    p.appendChild(inlineFrag(buf.join(" "), ctx));
    out.appendChild(p);
  }

  return out;
}
