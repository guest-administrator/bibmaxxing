# Plan 3: ScrollView + MarkdownView + Library Mode

> **For agentic workers:** subagent-driven-development. Skip git steps (user has no git).

**Goal:** ship a Library mode that renders the 63 existing JCAC-*.md / BOOK-*.md study guides — paragraphs, headings, lists, code blocks, tables, inline images. Press `g s` from anywhere to jump to it; `Esc` returns to flashcards.

**Tech additions:** none — uses existing `markdown-it-py`, `pygments`, `Pillow`. ScrollView + MarkdownView are pure-Python widgets.

**Spec ref:** §8 (MarkdownView), §5.4 (mode-pack tween), §7 (widget protocol).

**At end:** `g s` opens a Library view listing all guides on disk; arrow keys/Enter pick a guide; arrow/PgUp/PgDn scroll; aurora dims to library mode; `Esc` returns to flashcards. **No search/TOC sidebar yet — Plan 6.**

---

## Files

```
src/bibmaxxing/widgets/scroll_view.py        ← NEW
src/bibmaxxing/markdown_render.py            ← NEW (token tree → primitives)
src/bibmaxxing/widgets/markdown_view.py      ← NEW (renders primitives in ScrollView)
src/bibmaxxing/views/library.py              ← NEW
src/bibmaxxing/app.py                        ← MODIFIED (g s leader, library view registration)
src/bibmaxxing/state.py                      ← MODIFIED (mode-pack tween)
tests/unit/test_scroll_view.py               ← NEW
tests/unit/test_markdown_render.py           ← NEW
```

---

## Task 1 — ScrollView widget

**Files:** `src/bibmaxxing/widgets/scroll_view.py`, `tests/unit/test_scroll_view.py`

ScrollView is a viewport with a content-height-larger-than-viewport. Wheel scrolls; arrows scroll; PgUp/Dn page; Home/End jump.

### Test (`test_scroll_view.py`)

```python
from bibmaxxing.widgets.scroll_view import ScrollView

def test_initial_scroll_zero():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=1000)
    assert sv.scroll_y == 0

def test_scroll_clamps_at_top():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=1000)
    sv.scroll_by(-100)
    assert sv.scroll_y == 0

def test_scroll_down_advances():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=1000)
    sv.scroll_by(50)
    assert sv.scroll_y == 50

def test_scroll_clamps_at_bottom():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=1000)
    sv.scroll_by(10000)
    # max scroll = content_h - h = 700
    assert sv.scroll_y == 700

def test_no_scroll_when_content_fits():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=200)
    sv.scroll_by(100)
    assert sv.scroll_y == 0

def test_set_content_height_resets_max():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=1000)
    sv.scroll_by(500)
    sv.set_content_height(400)  # now max is 100
    assert sv.scroll_y <= 100

def test_page_down_advances_by_viewport():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=2000)
    sv.page_down()
    assert sv.scroll_y == 300

def test_home_resets_to_top():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=2000)
    sv.scroll_by(500)
    sv.home()
    assert sv.scroll_y == 0

def test_end_jumps_to_max():
    sv = ScrollView(x=0, y=0, w=400, h=300, content_h=2000)
    sv.end()
    assert sv.scroll_y == 1700
```

### Implementation (`scroll_view.py`)

```python
"""ScrollView - vertical viewport with clamped scroll position."""
from __future__ import annotations


class ScrollView:
    """A logical scroll container. Doesn't render anything itself; tracks
    scroll position. The owning view renders content offset by self.scroll_y.

    Args:
        x, y: bottom-left of viewport (window pixels)
        w, h: viewport size
        content_h: total content height (>= h means scrollable)
    """
    def __init__(self, *, x: int, y: int, w: int, h: int, content_h: int = 0):
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self._content_h = max(0, content_h)
        self.scroll_y = 0  # 0 = top; max = content_h - h

    @property
    def max_scroll(self) -> int:
        return max(0, self._content_h - self.h)

    def set_content_height(self, ch: int) -> None:
        self._content_h = max(0, ch)
        if self.scroll_y > self.max_scroll:
            self.scroll_y = self.max_scroll

    def scroll_by(self, delta_y: int) -> None:
        self.scroll_y = max(0, min(self.max_scroll, self.scroll_y + delta_y))

    def page_down(self) -> None:
        self.scroll_by(self.h)

    def page_up(self) -> None:
        self.scroll_by(-self.h)

    def home(self) -> None:
        self.scroll_y = 0

    def end(self) -> None:
        self.scroll_y = self.max_scroll

    def on_resize(self, w: int, h: int) -> None:
        self.w = w
        self.h = h
        if self.scroll_y > self.max_scroll:
            self.scroll_y = self.max_scroll
```

### Steps
1. Write test file. Run pytest, see ImportError.
2. Write `scroll_view.py`. Run pytest, see 9 passing.
3. Verify suite: `pytest tests/ -v` → 88/88.

---

## Task 2 — Markdown render: paragraphs, headings, lists, hr, blockquotes

**Files:** `src/bibmaxxing/markdown_render.py`, `tests/unit/test_markdown_render.py`

Parse MD via `markdown-it-py` → walk token stream → emit list of `LayoutNode` objects with method `height(width: int) -> int` and method `render(scroll_offset: int, viewport_y_top: int) -> None`.

### Test

```python
from bibmaxxing.markdown_render import parse_markdown, ParagraphNode, HeadingNode, ListNode, HRNode, BlockquoteNode

def test_simple_paragraph():
    nodes = parse_markdown("Hello world.")
    assert len(nodes) == 1
    assert isinstance(nodes[0], ParagraphNode)
    assert "Hello world" in nodes[0].text

def test_heading_levels():
    nodes = parse_markdown("# H1\n## H2\n### H3")
    assert len(nodes) == 3
    assert all(isinstance(n, HeadingNode) for n in nodes)
    assert nodes[0].level == 1
    assert nodes[1].level == 2
    assert nodes[2].level == 3

def test_unordered_list():
    md = "- one\n- two\n- three"
    nodes = parse_markdown(md)
    assert len(nodes) == 1
    assert isinstance(nodes[0], ListNode)
    assert nodes[0].ordered is False
    assert len(nodes[0].items) == 3

def test_ordered_list():
    md = "1. first\n2. second"
    nodes = parse_markdown(md)
    assert len(nodes) == 1
    assert isinstance(nodes[0], ListNode)
    assert nodes[0].ordered is True

def test_horizontal_rule():
    nodes = parse_markdown("Para 1\n\n---\n\nPara 2")
    types = [type(n).__name__ for n in nodes]
    assert "HRNode" in types
    assert types.count("ParagraphNode") == 2

def test_blockquote():
    nodes = parse_markdown("> Quoted text here.")
    assert len(nodes) == 1
    assert isinstance(nodes[0], BlockquoteNode)
    assert "Quoted text" in nodes[0].text

def test_height_returns_positive_int():
    nodes = parse_markdown("# Heading\n\nParagraph.")
    for n in nodes:
        h = n.height(width=600)
        assert isinstance(h, int)
        assert h > 0

def test_empty_input_returns_empty_list():
    assert parse_markdown("") == []
```

### Implementation (`markdown_render.py`)

```python
"""Markdown -> primitive layout nodes. See spec section 8."""
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from markdown_it import MarkdownIt

log = logging.getLogger(__name__)

# Approximate vertical metrics in pixels at FONT_BODY=16. Refined later.
LINE_H = 22
H_LINE_H = {1: 38, 2: 32, 3: 28, 4: 24, 5: 22, 6: 20}
PARA_GAP = 12
LIST_BULLET_INDENT = 24
HR_HEIGHT = 16


@dataclass
class LayoutNode:
    def height(self, width: int) -> int:  # noqa: ARG002
        return LINE_H


@dataclass
class ParagraphNode(LayoutNode):
    text: str = ""

    def height(self, width: int) -> int:
        # Crude estimate: chars-per-line ~ width / 8
        cpl = max(1, width // 8)
        lines = max(1, -(-len(self.text) // cpl))  # ceil division
        return lines * LINE_H + PARA_GAP


@dataclass
class HeadingNode(LayoutNode):
    text: str = ""
    level: int = 1

    def height(self, width: int) -> int:
        return H_LINE_H.get(self.level, LINE_H) + PARA_GAP


@dataclass
class ListNode(LayoutNode):
    items: list[str] = field(default_factory=list)
    ordered: bool = False

    def height(self, width: int) -> int:
        return len(self.items) * LINE_H + PARA_GAP


@dataclass
class HRNode(LayoutNode):
    def height(self, width: int) -> int:
        return HR_HEIGHT


@dataclass
class BlockquoteNode(LayoutNode):
    text: str = ""

    def height(self, width: int) -> int:
        cpl = max(1, (width - 30) // 8)
        lines = max(1, -(-len(self.text) // cpl))
        return lines * LINE_H + PARA_GAP


def parse_markdown(text: str) -> list[LayoutNode]:
    """Tokenize MD, walk, emit a flat list of layout nodes."""
    if not text.strip():
        return []
    md = MarkdownIt("commonmark", {"html": False})
    tokens = md.parse(text)
    return _walk(tokens)


def _walk(tokens) -> list[LayoutNode]:
    nodes: list[LayoutNode] = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t.type == "heading_open":
            level = int(t.tag[1])  # 'h1' -> 1
            content = tokens[i + 1].content if i + 1 < len(tokens) else ""
            nodes.append(HeadingNode(text=content, level=level))
            i += 3  # heading_open, inline, heading_close
            continue
        if t.type == "paragraph_open":
            content = tokens[i + 1].content if i + 1 < len(tokens) else ""
            nodes.append(ParagraphNode(text=content))
            i += 3
            continue
        if t.type == "hr":
            nodes.append(HRNode())
            i += 1
            continue
        if t.type == "blockquote_open":
            # collect till blockquote_close
            inner_text_parts: list[str] = []
            j = i + 1
            while j < len(tokens) and tokens[j].type != "blockquote_close":
                if tokens[j].type == "inline":
                    inner_text_parts.append(tokens[j].content)
                j += 1
            nodes.append(BlockquoteNode(text=" ".join(inner_text_parts)))
            i = j + 1
            continue
        if t.type == "bullet_list_open" or t.type == "ordered_list_open":
            ordered = (t.type == "ordered_list_open")
            close_type = "bullet_list_close" if not ordered else "ordered_list_close"
            items: list[str] = []
            j = i + 1
            while j < len(tokens) and tokens[j].type != close_type:
                if tokens[j].type == "inline":
                    items.append(tokens[j].content)
                j += 1
            nodes.append(ListNode(items=items, ordered=ordered))
            i = j + 1
            continue
        i += 1
    return nodes
```

### Steps
1. Write test file. Run pytest, see ImportError.
2. Write markdown_render.py. Run pytest, see 8 passing.
3. Verify suite: `pytest tests/ -v` → 96/96.

---

## Task 3 — Markdown render: code blocks (with pygments)

**Files:** add `CodeBlockNode` to `markdown_render.py`, extend tests.

A fenced code block becomes a `CodeBlockNode` with `lang` and `code`. Height = (line count + 2) × LINE_H_MONO + PARA_GAP. Render uses pygments to lex the code into colored spans (Plan 5 actually wires colors; for Plan 3, lex but render plain).

### New tests added to `test_markdown_render.py`

```python
from bibmaxxing.markdown_render import CodeBlockNode

def test_fenced_code_block():
    md = "Some text\n\n```python\nprint('hi')\n```\n\nMore text"
    nodes = parse_markdown(md)
    code_nodes = [n for n in nodes if isinstance(n, CodeBlockNode)]
    assert len(code_nodes) == 1
    assert code_nodes[0].lang == "python"
    assert "print('hi')" in code_nodes[0].code

def test_code_block_height_scales_with_lines():
    md = "```\nA\nB\nC\nD\n```"
    nodes = parse_markdown(md)
    h = nodes[0].height(width=600)
    assert h > 60  # 4 lines + padding
```

### Implementation additions

In `markdown_render.py` add:

```python
LINE_H_MONO = 19


@dataclass
class CodeBlockNode(LayoutNode):
    code: str = ""
    lang: str = ""

    def height(self, width: int) -> int:  # noqa: ARG002
        n_lines = self.code.count("\n") + 1
        return (n_lines + 2) * LINE_H_MONO + PARA_GAP
```

In `_walk` add handler:

```python
        if t.type == "fence":
            nodes.append(CodeBlockNode(code=t.content.rstrip("\n"), lang=t.info or ""))
            i += 1
            continue
        if t.type == "code_block":  # indented code blocks
            nodes.append(CodeBlockNode(code=t.content.rstrip("\n"), lang=""))
            i += 1
            continue
```

### Steps
1. Add tests + run → fails.
2. Add CodeBlockNode + handler.
3. Run → 10 passing in test_markdown_render.py. Suite total 98/98.

---

## Task 4 — Markdown render: tables (the hardest)

**Files:** extend `markdown_render.py`, extend tests.

A GFM table becomes a `TableNode` with `headers: list[str]` and `rows: list[list[str]]`. Height is `(1 + len(rows)) * LINE_H + PARA_GAP`.

### markdown-it config

`markdown-it-py` doesn't enable tables by default. Add the `table` plugin.

### New tests

```python
from bibmaxxing.markdown_render import TableNode

def test_simple_table():
    md = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |"
    nodes = parse_markdown(md)
    tables = [n for n in nodes if isinstance(n, TableNode)]
    assert len(tables) == 1
    t = tables[0]
    assert t.headers == ["A", "B"]
    assert t.rows == [["1", "2"], ["3", "4"]]

def test_table_height_grows_with_rows():
    md = "| A |\n|---|\n| x |\n| y |\n| z |"
    nodes = parse_markdown(md)
    t = nodes[0]
    assert t.height(width=600) > (3 * 22)  # 3 rows + 1 header
```

### Implementation

```python
@dataclass
class TableNode(LayoutNode):
    headers: list[str] = field(default_factory=list)
    rows: list[list[str]] = field(default_factory=list)

    def height(self, width: int) -> int:  # noqa: ARG002
        return (1 + len(self.rows)) * LINE_H + PARA_GAP
```

In `parse_markdown` change the parser to enable tables:

```python
md = MarkdownIt("commonmark", {"html": False}).enable("table")
```

In `_walk` add handler for table tokens. The token stream for a table is:
- `table_open`
- `thead_open`
- `tr_open` `th_open` `inline` `th_close` ... `tr_close`
- `thead_close`
- `tbody_open`
- `tr_open` `td_open` `inline` `td_close` ... `tr_close` (per row)
- `tbody_close`
- `table_close`

Parser:

```python
        if t.type == "table_open":
            headers: list[str] = []
            rows: list[list[str]] = []
            current_row: list[str] = []
            in_head = False
            in_body = False
            j = i + 1
            while j < len(tokens) and tokens[j].type != "table_close":
                tok = tokens[j]
                if tok.type == "thead_open":
                    in_head = True
                elif tok.type == "thead_close":
                    in_head = False
                elif tok.type == "tbody_open":
                    in_body = True
                elif tok.type == "tbody_close":
                    in_body = False
                elif tok.type == "tr_close":
                    if in_body:
                        rows.append(current_row)
                    current_row = []
                elif tok.type == "inline":
                    if in_head:
                        headers.append(tok.content)
                    elif in_body:
                        current_row.append(tok.content)
                j += 1
            nodes.append(TableNode(headers=headers, rows=rows))
            i = j + 1
            continue
```

### Steps
1. Add tests + run → fails (TableNode missing or no tables in output).
2. Add TableNode dataclass.
3. Enable table plugin + add walker.
4. Run → 12 passing in test_markdown_render.py. Suite total 100/100.

---

## Task 5 — Markdown render: inline images

**Files:** extend `markdown_render.py`, extend tests.

`![alt](images/foo.png)` becomes an `ImageNode` with `path` and `alt`. Height defaults to a reasonable image-block height (e.g. 200 px) — the actual rendered size is computed at draw time when the image is loaded.

### New tests

```python
from bibmaxxing.markdown_render import ImageNode

def test_inline_image():
    md = "![Process states](images/os-concepts/ch3-process-state.jpeg)"
    nodes = parse_markdown(md)
    imgs = [n for n in nodes if isinstance(n, ImageNode)]
    assert len(imgs) == 1
    assert imgs[0].alt == "Process states"
    assert imgs[0].path.endswith("ch3-process-state.jpeg")

def test_image_alone_in_paragraph():
    md = "![alt](path/x.png)\n\nNext para"
    nodes = parse_markdown(md)
    types = [type(n).__name__ for n in nodes]
    assert "ImageNode" in types
```

### Implementation

```python
@dataclass
class ImageNode(LayoutNode):
    path: str = ""
    alt: str = ""

    def height(self, width: int) -> int:  # noqa: ARG002
        return 220  # placeholder; actual scaled height computed at render time
```

A bare image inline-token gets handled by detecting paragraphs whose only child is an image. After `paragraph_open` token, before emitting `ParagraphNode`, scan its `inline` token's children for a single `image` token:

In `_walk`, replace the paragraph branch with:

```python
        if t.type == "paragraph_open":
            inline = tokens[i + 1] if i + 1 < len(tokens) else None
            # If the paragraph is just an image, emit ImageNode instead
            if inline is not None and inline.children:
                non_softbreak = [c for c in inline.children if c.type != "softbreak"]
                if len(non_softbreak) == 1 and non_softbreak[0].type == "image":
                    img_tok = non_softbreak[0]
                    src = ""
                    for k, v in img_tok.attrs.items() if isinstance(img_tok.attrs, dict) else img_tok.attrs:
                        if k == "src":
                            src = v
                    alt = img_tok.content
                    nodes.append(ImageNode(path=src, alt=alt))
                    i += 3
                    continue
            content = inline.content if inline is not None else ""
            nodes.append(ParagraphNode(text=content))
            i += 3
            continue
```

NOTE: in markdown-it-py, `tok.attrs` is a list of `[key, value]` pairs (in older versions) or a dict (newer). The defensive iteration handles both.

### Steps
1. Add tests + run → fails.
2. Add ImageNode + paragraph-with-image detection.
3. Run → 14 passing in test_markdown_render. Suite 102/102.

---

## Task 6 — MarkdownView widget

**Files:** `src/bibmaxxing/widgets/markdown_view.py` (no separate test file — render-side; smoke-tested via library view).

MarkdownView wraps a list of layout nodes plus a ScrollView. It positions each node by accumulating `node.height(width)` and renders only nodes whose y-extent intersects the viewport.

### Implementation

```python
"""MarkdownView - renders a list of LayoutNodes inside a ScrollView."""
from __future__ import annotations
import logging
from pathlib import Path
import pyglet
from .. import theme
from ..markdown_render import (
    LayoutNode, ParagraphNode, HeadingNode, ListNode, CodeBlockNode,
    TableNode, ImageNode, BlockquoteNode, HRNode,
    LINE_H, H_LINE_H, LINE_H_MONO, PARA_GAP,
)
from .scroll_view import ScrollView

log = logging.getLogger(__name__)


class MarkdownView:
    """Renders parsed Markdown nodes as scrollable text + images.

    Args:
        x, y, w, h: viewport bounds (window pixels)
        nodes: output of markdown_render.parse_markdown(text)
        image_base: directory paths in ImageNodes are resolved relative to this
    """

    def __init__(self, *, x: int, y: int, w: int, h: int,
                 nodes: list[LayoutNode], image_base: Path | None = None):
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.nodes = nodes
        self.image_base = image_base
        self.scroll = ScrollView(x=x, y=y, w=w, h=h, content_h=0)
        self._labels: list[pyglet.text.Label] = []
        self._images: dict[str, pyglet.image.AbstractImage] = {}
        self._compute_layout()

    def _compute_layout(self) -> None:
        # Dispose old labels
        for lbl in self._labels:
            lbl.delete()
        self._labels.clear()

        font_default = theme.resolve_font(theme.FONT_DEFAULT)
        font_mono = theme.resolve_font(theme.FONT_MONO)
        text_color = theme.rgba_to_pyglet(theme.TEXT_PRIMARY)
        dim_color = theme.rgba_to_pyglet(theme.TEXT_DIM)
        accent = theme.rgba_to_pyglet(theme.GOLDEN_PALE)

        text_w = self.w - 40  # margin
        cursor_y_from_top = 0

        # Layout pass: assign each node a y_offset (distance from top of content)
        self._positioned: list[tuple[int, LayoutNode]] = []
        for n in self.nodes:
            self._positioned.append((cursor_y_from_top, n))
            cursor_y_from_top += n.height(text_w)
        self.scroll.set_content_height(cursor_y_from_top)

        # Build label objects (one per text-emitting node) — positioned later
        for y_off, n in self._positioned:
            if isinstance(n, HeadingNode):
                size = {1: 32, 2: 26, 3: 22, 4: 18, 5: 16, 6: 15}.get(n.level, 16)
                lbl = pyglet.text.Label(
                    n.text, font_name=font_default, font_size=size,
                    x=self.x + 20, y=0,  # y set during render
                    anchor_x="left", anchor_y="top",
                    color=accent if n.level <= 2 else text_color,
                    multiline=True, width=text_w,
                )
                self._labels.append(lbl)
            elif isinstance(n, ParagraphNode):
                lbl = pyglet.text.Label(
                    n.text, font_name=font_default, font_size=theme.FONT_BODY,
                    x=self.x + 20, y=0,
                    anchor_x="left", anchor_y="top",
                    color=text_color,
                    multiline=True, width=text_w,
                )
                self._labels.append(lbl)
            elif isinstance(n, ListNode):
                lines = []
                for idx, item in enumerate(n.items):
                    bullet = f"{idx+1}." if n.ordered else "-"
                    lines.append(f"  {bullet} {item}")
                lbl = pyglet.text.Label(
                    "\n".join(lines), font_name=font_default, font_size=theme.FONT_BODY,
                    x=self.x + 20, y=0,
                    anchor_x="left", anchor_y="top",
                    color=text_color,
                    multiline=True, width=text_w,
                )
                self._labels.append(lbl)
            elif isinstance(n, CodeBlockNode):
                lbl = pyglet.text.Label(
                    n.code, font_name=font_mono, font_size=theme.FONT_MONO_CODE,
                    x=self.x + 30, y=0,
                    anchor_x="left", anchor_y="top",
                    color=dim_color,
                    multiline=True, width=text_w - 20,
                )
                self._labels.append(lbl)
            elif isinstance(n, TableNode):
                # Render as monospaced columnar text — quick + readable
                if n.headers:
                    col_widths = [max(len(h), max((len(r[i]) for r in n.rows if i < len(r)), default=0))
                                  for i, h in enumerate(n.headers)]
                    fmt_row = lambda r: "  ".join(  # noqa: E731
                        (r[i] if i < len(r) else "").ljust(col_widths[i])
                        for i in range(len(n.headers))
                    )
                    lines = [fmt_row(n.headers), "-" * (sum(col_widths) + 2 * (len(col_widths) - 1))]
                    for r in n.rows:
                        lines.append(fmt_row(r))
                else:
                    lines = ["  ".join(r) for r in n.rows]
                lbl = pyglet.text.Label(
                    "\n".join(lines), font_name=font_mono, font_size=theme.FONT_MONO_CODE,
                    x=self.x + 20, y=0,
                    anchor_x="left", anchor_y="top",
                    color=text_color,
                    multiline=True, width=text_w,
                )
                self._labels.append(lbl)
            elif isinstance(n, BlockquoteNode):
                lbl = pyglet.text.Label(
                    n.text, font_name=font_default, font_size=theme.FONT_BODY,
                    x=self.x + 40, y=0,
                    anchor_x="left", anchor_y="top",
                    color=dim_color, italic=True,
                    multiline=True, width=text_w - 30,
                )
                self._labels.append(lbl)
            else:
                # HRNode / ImageNode handled at render time
                self._labels.append(None)  # type: ignore

    def _load_image(self, rel_path: str) -> pyglet.image.AbstractImage | None:
        if rel_path in self._images:
            return self._images[rel_path]
        if self.image_base is None:
            return None
        full = (self.image_base / rel_path).resolve()
        if not full.exists():
            log.warning("md_image missing path=%s", full)
            return None
        try:
            img = pyglet.image.load(str(full))
            self._images[rel_path] = img
            return img
        except Exception as e:
            log.warning("md_image load failed path=%s err=%s", full, e)
            return None

    def render(self) -> None:
        viewport_top = self.y + self.h
        viewport_bottom = self.y
        for (y_off, n), lbl in zip(self._positioned, self._labels):
            # Convert top-anchored y_off into window y
            screen_y_top = viewport_top + self.scroll.scroll_y - y_off
            node_h = n.height(self.w - 40)
            screen_y_bottom = screen_y_top - node_h
            # Cull anything entirely above or below the viewport
            if screen_y_bottom > viewport_top + 20:
                continue
            if screen_y_top < viewport_bottom - 20:
                continue
            if isinstance(n, HRNode):
                # Could draw a thin shape; skip rendering for Plan 3 simplicity
                continue
            if isinstance(n, ImageNode):
                img = self._load_image(n.path)
                if img is None:
                    continue
                aspect = img.height / img.width if img.width else 1
                draw_w = min(self.w - 80, img.width)
                draw_h = int(draw_w * aspect)
                # Simple draw via blit
                img.blit(self.x + (self.w - draw_w) // 2,
                         screen_y_top - draw_h,
                         width=draw_w, height=draw_h)
                continue
            if lbl is None:
                continue
            lbl.x = self.x + 20
            lbl.y = screen_y_top
            lbl.draw()

    def on_key_press(self, symbol: int, modifiers: int) -> bool:
        from pyglet.window import key
        if symbol in (key.UP, key.K):
            self.scroll.scroll_by(-LINE_H * 2)
            return True
        if symbol in (key.DOWN, key.J):
            self.scroll.scroll_by(LINE_H * 2)
            return True
        if symbol == key.PAGEUP:
            self.scroll.page_up()
            return True
        if symbol == key.PAGEDOWN or symbol == key.SPACE:
            self.scroll.page_down()
            return True
        if symbol == key.HOME:
            self.scroll.home()
            return True
        if symbol == key.END:
            self.scroll.end()
            return True
        return False

    def on_mouse_scroll(self, x: int, y: int, scroll_x: int, scroll_y: int) -> None:
        # pyglet wheel: scroll_y > 0 means wheel up; we want wheel-up to scroll content up
        self.scroll.scroll_by(int(-scroll_y * LINE_H * 3))

    def on_resize(self, w: int, h: int, x: int = 0, y: int = 0) -> None:
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.scroll.on_resize(w, h)
        self._compute_layout()

    def dispose(self) -> None:
        for lbl in self._labels:
            if lbl is not None:
                lbl.delete()
        self._labels.clear()
```

### Steps
1. Write the file (no test file — render-side).
2. Smoke import: `python -c "from bibmaxxing.widgets.markdown_view import MarkdownView; print('OK')"` → `OK`.
3. Suite still 102/102.

---

## Task 7 — LibraryView

**Files:** `src/bibmaxxing/views/library.py`, modify `app.py` to register and switch to it via `g s`.

LibraryView shows a list of available `.md` files at the top, lets the user pick one with arrow keys + Enter, then displays its content via MarkdownView. `Esc` returns to flashcards.

### Implementation (`library.py`)

```python
"""Library view - markdown study guide reader."""
from __future__ import annotations
import logging
from pathlib import Path
import pyglet
from pyglet.window import key

from .. import theme, keybindings, paths
from ..keybindings import BindingContext
from ..markdown_render import parse_markdown
from ..widgets.markdown_view import MarkdownView
from ..widgets.status_bar import StatusBar

log = logging.getLogger(__name__)

PICKER_W = 380


class LibraryView:
    def __init__(self, window: pyglet.window.Window, bib_id: str = "CWT-E7"):
        self.window = window
        self.bib_id = bib_id
        self.guides_dir = paths.data_root() / "bibs" / bib_id / "study-guides"
        self.guide_paths: list[Path] = sorted(self.guides_dir.glob("*.md"))
        self.selected_idx: int = 0
        self.markdown_view: MarkdownView | None = None

        font_default = theme.resolve_font(theme.FONT_DEFAULT)
        text_color = theme.rgba_to_pyglet(theme.TEXT_PRIMARY)
        dim_color = theme.rgba_to_pyglet(theme.TEXT_DIM)
        accent = theme.rgba_to_pyglet(theme.GOLDEN_PALE)

        self.title_label = pyglet.text.Label(
            "Library - press Enter to open, Esc to exit",
            font_name=font_default, font_size=theme.FONT_HEADING,
            x=window.width // 2, y=window.height - 30,
            anchor_x="center", anchor_y="top",
            color=accent,
        )
        self.picker_label = pyglet.text.Label(
            "", font_name=font_default, font_size=theme.FONT_BODY,
            x=20, y=window.height - 80,
            anchor_x="left", anchor_y="top",
            color=text_color,
            multiline=True, width=PICKER_W,
        )
        self._refresh_picker_text()

        self.status_bar = StatusBar(window_w=window.width, window_h=window.height,
                                    context=BindingContext.LIBRARY)

    def _refresh_picker_text(self) -> None:
        lines = []
        for i, p in enumerate(self.guide_paths):
            marker = ">" if i == self.selected_idx else " "
            lines.append(f"{marker} {p.stem}")
        self.picker_label.text = "\n".join(lines) if lines else "No study guides found."

    def _open_selected(self) -> None:
        if not self.guide_paths:
            return
        path = self.guide_paths[self.selected_idx]
        try:
            text = path.read_text(encoding="utf-8")
        except Exception as e:
            log.error("library read_failed path=%s err=%s", path, e)
            return
        nodes = parse_markdown(text)
        if self.markdown_view is not None:
            self.markdown_view.dispose()
        x = PICKER_W + 20
        y = 40
        w = self.window.width - x - 10
        h = self.window.height - y - 80
        self.markdown_view = MarkdownView(
            x=x, y=y, w=w, h=h, nodes=nodes,
            image_base=path.parent,
        )
        log.info("library opened guide=%s nodes=%d", path.name, len(nodes))

    def render(self) -> None:
        self.title_label.draw()
        self.picker_label.draw()
        if self.markdown_view is not None:
            self.markdown_view.render()
        self.status_bar.render()

    def on_key_press(self, symbol: int, modifiers: int) -> bool:
        # If a markdown view is open, give it scroll keys first
        if self.markdown_view is not None and symbol in (
            key.UP, key.DOWN, key.K, key.J, key.PAGEUP, key.PAGEDOWN,
            key.HOME, key.END, key.SPACE
        ) and not (symbol in (key.UP, key.DOWN) and modifiers & key.MOD_ALT):
            if self.markdown_view.on_key_press(symbol, modifiers):
                return True
        # Picker navigation
        if symbol in (key.UP, key.K):
            self.selected_idx = max(0, self.selected_idx - 1)
            self._refresh_picker_text()
            return True
        if symbol in (key.DOWN, key.J):
            self.selected_idx = min(len(self.guide_paths) - 1, self.selected_idx + 1)
            self._refresh_picker_text()
            return True
        if symbol == key.ENTER:
            self._open_selected()
            return True
        return False

    def on_mouse_scroll(self, x: int, y: int, scroll_x: int, scroll_y: int) -> None:
        if self.markdown_view is not None:
            self.markdown_view.on_mouse_scroll(x, y, scroll_x, scroll_y)

    def on_resize(self, w: int, h: int) -> None:
        self.title_label.x = w // 2
        self.title_label.y = h - 30
        self.picker_label.y = h - 80
        self.status_bar.on_resize(w, h)
        if self.markdown_view is not None:
            x = PICKER_W + 20
            y = 40
            mw = w - x - 10
            mh = h - y - 80
            self.markdown_view.on_resize(mw, mh, x=x, y=y)

    def dispose(self) -> None:
        self.title_label.delete()
        self.picker_label.delete()
        self.status_bar.dispose()
        if self.markdown_view is not None:
            self.markdown_view.dispose()
```

### Modifications to `app.py`

1. Import LibraryView at top.
2. Register it in `self.views` after FlashcardsView creation:
   ```python
   self.views["library"] = LibraryView(self, bib_id)
   ```
3. Add `g s` leader key handling. The leader pattern needs a small state machine. Add to `__init__`:
   ```python
   self._leader_pending = False
   ```
4. Modify `on_key_press` after the `?` block, before the active_view dispatch:

   ```python
        if self._leader_pending:
            self._leader_pending = False
            mapping = {
                pyglet.window.key.F: "flashcards",
                pyglet.window.key.S: "library",
            }
            target = mapping.get(symbol)
            if target:
                self.switch_view(target)
            return
        if symbol == pyglet.window.key.G and not (modifiers & (
            pyglet.window.key.MOD_CTRL | pyglet.window.key.MOD_ALT
        )):
            self._leader_pending = True
            return
   ```

5. Add mouse scroll forward:

```python
    def on_mouse_scroll(self, x: int, y: int, scroll_x: int, scroll_y: int) -> None:
        av = self.active_view
        if hasattr(av, "on_mouse_scroll"):
            av.on_mouse_scroll(x, y, scroll_x, scroll_y)
```

### Steps
1. Write library.py.
2. Modify app.py per Step 5.
3. Smoke: `python -c "from bibmaxxing.views.library import LibraryView; print('OK')"`.
4. End-to-end auto-close run.
5. Suite still 102/102.

---

## Task 8 — Mode-pack tween + verification

**Files:** modify `src/bibmaxxing/state.py` and `src/bibmaxxing/app.py`.

When user enters library, intensity should tween toward 0.4 over 600ms; entering flashcards goes back toward 1.0. Plan 5 will use this for FBO bloom; for now we just animate `state.intensity`.

### Modifications to `state.py`

Add at the bottom:

```python
INTENSITY_LERP_K = 1.6  # per second; ~430ms half-time

def lerp_intensity(state: AppState, dt: float, target: float) -> None:
    factor = 1.0 - pow(2.718281828, -INTENSITY_LERP_K * dt)
    state.intensity += (target - state.intensity) * factor
    if abs(state.intensity - target) < 1e-4:
        state.intensity = target
```

### Modifications to `app.py`

In `__init__` add:
```python
self._intensity_target = 1.0
```

In `switch_view` add at the bottom:
```python
        from . import theme as theme_mod
        if name == "library":
            self._intensity_target = theme_mod.MODE_LIBRARY.intensity
        else:
            self._intensity_target = theme_mod.MODE_DRILLING.intensity
```

In `on_tick` add after `lerp_mood`:
```python
        from .state import lerp_intensity
        lerp_intensity(self.state, dt, self._intensity_target)
```

### Steps
1. Apply edits.
2. Run end-to-end smoke (window opens; aurora visibly dims when entering library — but auto-close harness can't verify this, just confirm exit 0).
3. Suite still 102/102.

---

## Plan 3 verification

```bash
pytest tests/ -v
```
Expected: 102/102 passing.

Manual interactive test (user runs):
```bash
python -m bibmaxxing --verbose
```
- See flashcards
- Press `g` then `s` → switches to library, aurora dims
- Arrow keys move selector through guide list
- Press Enter → selected guide renders on the right
- Arrow Down/PageDown scrolls the markdown
- Press `g` then `f` → back to flashcards, aurora brightens
- `Esc` → exit
