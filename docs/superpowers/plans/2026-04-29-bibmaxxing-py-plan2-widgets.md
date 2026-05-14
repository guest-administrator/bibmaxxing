# Bibmaxxing-Py — Plan 2: Widget Toolkit & Refactored Flashcards View

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the keyboard-first widget primitives (FocusManager, Button, Modal, StatusBar) and refactor the FlashcardsView to use them; ship a working `?` keybindings overlay; clean up the `self.view`/`self.active_view` collision flagged in Plan 1.

**Architecture:** Pure-Python widgets built on top of `pyglet.shapes.RoundedRectangle` + `pyglet.text.Label`. No new shaders. Widgets own their hit-rect and dirty flag; render only when state changes. FocusManager is a single per-window object that tracks an ordered list of focusable widgets and dispatches Tab/Shift-Tab/Enter/Space to the focused one.

**Tech Stack:** Pyglet 2.0+ (already installed). No new deps.

**Spec reference:** `docs/superpowers/specs/2026-04-29-bibmaxxing-py-design.md` §7

**Plan scope:** Plan 2 of 7. Following plans:
- Plan 3: ScrollView + MarkdownView + library mode
- Plan 4: Quiz + Mock Exam + References + Add views (TextInput widget)
- Plan 5: Tier-C polish (particles + FBO chain + post + audio + card tilt)
- Plan 6: Settings + import/export + crash dump + golden tests
- Plan 7: PyInstaller + low-power + docs

**At end of Plan 2 you will have:**
- A working keyboard focus system (Tab/Shift-Tab cycles between focusable widgets, focused widget renders a ring)
- Button widgets the FlashcardsView uses for grade actions (Space/Enter activate when focused; clicking still works)
- A Modal widget with focus trap + Esc dismiss
- A `?` overlay that pops up from any view showing all keybindings grouped by context
- A real StatusBar widget pulling from `keybindings.status_bar_for(context)` with inline `[Key]` glyphs
- Cleaned-up `self.flashcards` → `self.active_view` plus `views` dict for future view-switching
- F11 fullscreen toggle
- Window-X close handler that disposes the active view and closes the DB

Deferred to later plans:
- **ScrollView** → Plan 3 (used by MarkdownView for library mode)
- **TextInput** → Plan 4 (used by Add-Question view)
- **Library mode + MarkdownView** → Plan 3
- **Particles + post-processing + audio** → Plan 5

YAGNI: don't build ScrollView/TextInput here because Plan 2 has no view that uses them. Plan 3/4 will build them when they're actually needed.

---

## File Structure (Plan 2 Scope)

**Created:**

```
src/bibmaxxing/
├── widgets/
│   ├── __init__.py                 ← NEW
│   ├── focus.py                    ← FocusManager
│   ├── button.py                   ← Button widget
│   ├── modal.py                    ← Modal overlay
│   └── status_bar.py               ← StatusBar widget
└── views/
    ├── help_overlay.py             ← `?` overlay (built on Modal)
    └── flashcards.py               ← MODIFIED to use widgets
```

**Modified:**
- `src/bibmaxxing/app.py` — adds FocusManager, view registry, F11 handler, ? key handler, on_close X-button handling
- `src/bibmaxxing/views/flashcards.py` — full refactor to use Button + StatusBar widgets

**New tests:**
```
tests/unit/
├── test_focus.py
├── test_button.py
├── test_modal.py
└── test_status_bar.py
```

---

## Task 1: active_view rename + views registry

**Files:**
- Modify: `src/bibmaxxing/app.py` (rename `self.flashcards` → `self.active_view`, add `self.views` dict)

This addresses the Plan 1 known issue: `pyglet.window.Window.view` collides with our naming. Plan 1 used `self.flashcards`, but as views proliferate (quiz, exam, library, add) we need a dispatcher. A `self.views: dict[str, BaseView]` plus `self.active_view_name` is the abstraction.

- [ ] **Step 1: Read the current `app.py` to remember its shape**

```bash
cd C:/Users/Creator/Documents/FIRSTDIMENSION/bibmaxxing-py
cat src/bibmaxxing/app.py
```

- [ ] **Step 2: Rewrite `app.py` to use a views dict**

Replace the entire file:

```python
"""Pyglet window + main loop. See spec §4.3 and §5."""
from __future__ import annotations
import logging
import time
import pyglet
import moderngl
from .render.aurora import Aurora
from .state import AppState, lerp_mood
from . import theme
from . import paths, db as db_mod, bibs as bibs_mod
from .views.flashcards import FlashcardsView

log = logging.getLogger(__name__)

DEFAULT_W, DEFAULT_H = 1280, 800


class BibmaxxingWindow(pyglet.window.Window):
    def __init__(self, state: AppState, *, low_power: bool = False, bib_id: str = "CWT-E7"):
        config = pyglet.gl.Config(double_buffer=True, depth_size=24, major_version=3, minor_version=3)
        super().__init__(width=DEFAULT_W, height=DEFAULT_H, caption="Bibmaxxing",
                         resizable=True, config=config)
        self.state = state
        self.low_power = low_power
        self.bib_id = bib_id

        self.ctx = moderngl.create_context()
        self.ctx.enable(moderngl.BLEND)
        self.ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA
        self.aurora = Aurora(self.ctx)
        self.t0 = time.monotonic()

        self.conn = db_mod.connect(paths.db_path())
        self.cards = bibs_mod.load_bib(bib_id)

        # Views are registered by name; switch via switch_view(name).
        # NOTE: Do NOT use `self.view` — pyglet.window.Window.view is a 4x4 matrix property.
        self.views: dict[str, object] = {
            "flashcards": FlashcardsView(self, state, self.conn, self.cards, bib_id),
        }
        self.active_view_name: str = "flashcards"

        # Optional FPS / mood overlay (debug)
        font_default = theme.resolve_font(theme.FONT_DEFAULT)
        self.fps_label = pyglet.text.Label(
            "", font_name=font_default, font_size=theme.FONT_SMALL,
            x=12, y=12, color=theme.rgba_to_pyglet(theme.TEXT_DIM),
        )

        pyglet.clock.schedule_interval(self.on_tick, 1.0 / 60.0)
        log.info("window_open bib=%s cards=%d low_power=%s", bib_id, len(self.cards), low_power)

    @property
    def active_view(self):
        return self.views[self.active_view_name]

    def switch_view(self, name: str) -> None:
        if name not in self.views:
            log.warning("switch_view unknown view=%s", name)
            return
        if name == self.active_view_name:
            return
        log.info("view_change from=%s to=%s", self.active_view_name, name)
        self.active_view_name = name
        # State.current_view drives mode-pack uniforms (Plan 5 wires the actual swap)
        self.state.current_view = name

    def on_tick(self, dt: float) -> None:
        lerp_mood(self.state, dt)

    def on_draw(self) -> None:
        self.clear()
        self.ctx.viewport = (0, 0, self.width, self.height)
        t = time.monotonic() - self.t0
        self.aurora.render(time_s=t, mood=self.state.mood, intensity=self.state.intensity)
        self.active_view.render()
        self.fps_label.text = f"mood={self.state.mood:.2f} streak={self.state.streak}"
        self.fps_label.draw()

    def on_resize(self, w: int, h: int) -> None:
        super().on_resize(w, h)
        self.ctx.viewport = (0, 0, w, h)
        for v in self.views.values():
            if hasattr(v, "on_resize"):
                v.on_resize(w, h)

    def on_key_press(self, symbol: int, modifiers: int) -> None:
        if symbol == pyglet.window.key.ESCAPE:
            self.dispatch_event("on_close")
            return
        if self.active_view.on_key_press(symbol, modifiers):
            return

    def on_close(self) -> None:
        log.info("window_close")
        for v in self.views.values():
            if hasattr(v, "dispose"):
                v.dispose()
        if hasattr(self, "conn"):
            self.conn.close()
        super().on_close()


def run(state: AppState, *, low_power: bool = False, bib_id: str = "CWT-E7") -> None:
    BibmaxxingWindow(state, low_power=low_power, bib_id=bib_id)
    pyglet.app.run()
```

- [ ] **Step 3: Verify import + smoke run**

```bash
python -c "from bibmaxxing.app import BibmaxxingWindow; print('OK')"
```

Expected: `OK`.

```bash
python -c "
import sys, threading, time, pyglet
from bibmaxxing.__main__ import main

def auto_close():
    time.sleep(2)
    pyglet.app.exit()

threading.Thread(target=auto_close, daemon=True).start()
sys.exit(main(['--verbose']))
"
```

Expected: window opens with the same content as Plan 1, closes after 2s, exit 0. The behavior is identical to before — we just renamed internal state.

- [ ] **Step 4: Verify suite still 49/49**

```bash
pytest tests/ -v
```

- [ ] **Step 5: SKIP — no git**

---

## Task 2: F11 fullscreen toggle

**Files:**
- Modify: `src/bibmaxxing/app.py` (add F11 case in `on_key_press`)

Spec §4.3 mentions F11. Trivial.

- [ ] **Step 1: Add F11 handler to `on_key_press`**

In `app.py`, modify the `on_key_press` method:

```python
def on_key_press(self, symbol: int, modifiers: int) -> None:
    if symbol == pyglet.window.key.ESCAPE:
        self.dispatch_event("on_close")
        return
    if symbol == pyglet.window.key.F11:
        self.set_fullscreen(not self.fullscreen)
        log.info("fullscreen toggled to=%s", self.fullscreen)
        return
    if self.active_view.on_key_press(symbol, modifiers):
        return
```

- [ ] **Step 2: Smoke test**

Use the auto-close harness as in Task 1 — confirm app still launches. Manual verification of F11 requires the user to run interactively; the implementer cannot fully test this. Report DONE_WITH_CONCERNS noting "F11 added but not interactively verified."

- [ ] **Step 3: Verify suite still 49/49**

- [ ] **Step 4: SKIP — no git**

---

## Task 3: FocusManager

**Files:**
- Create: `src/bibmaxxing/widgets/__init__.py` (with module docstring)
- Create: `src/bibmaxxing/widgets/focus.py`
- Create: `tests/unit/test_focus.py`

FocusManager is the keyboard-focus arbiter: holds an ordered list of focusable widgets, knows which is currently focused, advances/retracts on Tab/Shift-Tab, dispatches Enter/Space activation to the focused widget.

A "focusable widget" is any object with these methods:
- `bounds() -> tuple[int, int, int, int]` — (x, y, w, h) in window pixels
- `is_focusable() -> bool` — return False to skip in cycling
- `set_focused(focused: bool) -> None` — gets called on focus change
- (optional) `activate() -> None` — called on Enter/Space when focused

- [ ] **Step 1: Write `tests/unit/test_focus.py`**

```python
from bibmaxxing.widgets.focus import FocusManager


class FakeWidget:
    """Minimal stand-in matching the focusable-widget protocol."""
    def __init__(self, name: str, focusable: bool = True):
        self.name = name
        self._focusable = focusable
        self.focused = False
        self.activated = 0

    def bounds(self):
        return (0, 0, 100, 30)

    def is_focusable(self) -> bool:
        return self._focusable

    def set_focused(self, focused: bool) -> None:
        self.focused = focused

    def activate(self) -> None:
        self.activated += 1


def test_focus_starts_unfocused():
    fm = FocusManager()
    fm.register(FakeWidget("a"))
    fm.register(FakeWidget("b"))
    assert fm.focused() is None


def test_focus_next_picks_first_focusable():
    a, b = FakeWidget("a"), FakeWidget("b")
    fm = FocusManager()
    fm.register(a)
    fm.register(b)
    fm.focus_next()
    assert fm.focused() is a
    assert a.focused is True
    assert b.focused is False


def test_focus_next_cycles():
    a, b = FakeWidget("a"), FakeWidget("b")
    fm = FocusManager()
    fm.register(a)
    fm.register(b)
    fm.focus_next()  # a
    fm.focus_next()  # b
    assert fm.focused() is b
    fm.focus_next()  # wraps to a
    assert fm.focused() is a


def test_focus_prev_cycles_backward():
    a, b = FakeWidget("a"), FakeWidget("b")
    fm = FocusManager()
    fm.register(a)
    fm.register(b)
    fm.focus_next()  # a
    fm.focus_prev()  # wraps backward to b
    assert fm.focused() is b


def test_skip_non_focusable_widgets():
    a = FakeWidget("a", focusable=False)
    b = FakeWidget("b")
    c = FakeWidget("c", focusable=False)
    d = FakeWidget("d")
    fm = FocusManager()
    for w in (a, b, c, d):
        fm.register(w)
    fm.focus_next()
    assert fm.focused() is b
    fm.focus_next()
    assert fm.focused() is d
    fm.focus_next()  # wraps; skips c, a
    assert fm.focused() is b


def test_activate_calls_focused_widget():
    a = FakeWidget("a")
    fm = FocusManager()
    fm.register(a)
    fm.focus_next()
    fm.activate()
    assert a.activated == 1


def test_activate_with_no_focus_is_noop():
    a = FakeWidget("a")
    fm = FocusManager()
    fm.register(a)
    fm.activate()
    assert a.activated == 0


def test_clear_focus():
    a = FakeWidget("a")
    fm = FocusManager()
    fm.register(a)
    fm.focus_next()
    assert fm.focused() is a
    fm.clear()
    assert fm.focused() is None
    assert a.focused is False


def test_register_returns_widget_for_chaining():
    a = FakeWidget("a")
    fm = FocusManager()
    out = fm.register(a)
    assert out is a


def test_no_focusable_widgets_is_safe():
    fm = FocusManager()
    fm.register(FakeWidget("a", focusable=False))
    fm.focus_next()
    assert fm.focused() is None
    fm.activate()  # no-op
    fm.focus_prev()
    assert fm.focused() is None
```

- [ ] **Step 2: Run to verify failure**

```bash
cd C:/Users/Creator/Documents/FIRSTDIMENSION/bibmaxxing-py
pytest tests/unit/test_focus.py -v
```

Expected: ImportError.

- [ ] **Step 3: Create `src/bibmaxxing/widgets/__init__.py`**

```python
"""Keyboard-first widget primitives. See spec §7."""
```

- [ ] **Step 4: Implement `src/bibmaxxing/widgets/focus.py`**

```python
"""FocusManager — central keyboard focus arbiter for a window.

A focusable widget exposes:
  - bounds() -> (x, y, w, h)
  - is_focusable() -> bool
  - set_focused(focused: bool) -> None
  - activate() -> None     (optional; called on Enter/Space when focused)
"""
from __future__ import annotations
import logging
from typing import Protocol, runtime_checkable

log = logging.getLogger(__name__)


@runtime_checkable
class Focusable(Protocol):
    def bounds(self) -> tuple[int, int, int, int]: ...
    def is_focusable(self) -> bool: ...
    def set_focused(self, focused: bool) -> None: ...


class FocusManager:
    """Owns the ordered list of focusable widgets and the current focus index.

    Use FocusManager once per window (or per modal). Register widgets in the
    order you want Tab to walk them. Non-focusable widgets are silently skipped
    by focus_next/focus_prev.
    """

    def __init__(self) -> None:
        self._widgets: list[Focusable] = []
        self._idx: int | None = None  # index into self._widgets, or None for "no focus"

    def register(self, widget: Focusable):
        """Append widget to the focus order. Returns the widget for chaining."""
        self._widgets.append(widget)
        return widget

    def focused(self) -> Focusable | None:
        if self._idx is None:
            return None
        return self._widgets[self._idx]

    def clear(self) -> None:
        if self._idx is not None:
            self._widgets[self._idx].set_focused(False)
        self._idx = None

    def focus_next(self) -> None:
        self._move(+1)

    def focus_prev(self) -> None:
        self._move(-1)

    def _move(self, direction: int) -> None:
        n = len(self._widgets)
        if n == 0:
            return
        # All non-focusable? bail.
        if not any(w.is_focusable() for w in self._widgets):
            return
        start = self._idx if self._idx is not None else (-1 if direction > 0 else 0)
        i = start
        for _ in range(n):
            i = (i + direction) % n
            if self._widgets[i].is_focusable():
                if self._idx is not None:
                    self._widgets[self._idx].set_focused(False)
                self._idx = i
                self._widgets[i].set_focused(True)
                return

    def activate(self) -> None:
        """Call activate() on the focused widget if it has one."""
        w = self.focused()
        if w is None:
            return
        if hasattr(w, "activate"):
            w.activate()
```

- [ ] **Step 5: Run tests to verify pass**

```bash
pytest tests/unit/test_focus.py -v
```

Expected: 10 passed.

- [ ] **Step 6: Verify total suite**

```bash
pytest tests/ -v
```

Expected: 59/59 passing (49 + 10).

- [ ] **Step 7: SKIP — no git**

---

## Task 4: Button widget

**Files:**
- Create: `src/bibmaxxing/widgets/button.py`
- Create: `tests/unit/test_button.py`

A `Button` is a labeled rectangle with focus + click + keyboard activation. It implements the Focusable protocol so FocusManager can drive it. Visually: rounded rectangle background + centered label + optional inline `[Key]` glyph.

- [ ] **Step 1: Write `tests/unit/test_button.py`**

```python
"""Tests for Button widget. We mock pyglet to avoid creating a window in unit tests."""
from unittest.mock import MagicMock, patch
from bibmaxxing.widgets.button import Button


def make_button(text="OK", x=10, y=20, w=100, h=30, on_click=None, key_label=None):
    # Patch pyglet.shapes / text / Label so we don't need a GL context
    with patch("bibmaxxing.widgets.button.pyglet") as fake_pyglet:
        fake_pyglet.shapes.RoundedRectangle = MagicMock()
        fake_pyglet.text.Label = MagicMock()
        b = Button(text=text, x=x, y=y, w=w, h=h, on_click=on_click, key_label=key_label)
    return b


def test_default_state_unfocused_unhovered():
    b = make_button()
    assert b.focused is False
    assert b.hovered is False
    assert b.is_focusable() is True


def test_bounds_returns_xywh():
    b = make_button(x=5, y=10, w=200, h=40)
    assert b.bounds() == (5, 10, 200, 40)


def test_set_focused_updates_state():
    b = make_button()
    b.set_focused(True)
    assert b.focused is True
    b.set_focused(False)
    assert b.focused is False


def test_activate_calls_on_click():
    fired = []
    b = make_button(on_click=lambda: fired.append(1))
    b.activate()
    assert fired == [1]


def test_activate_with_no_callback_is_noop():
    b = make_button(on_click=None)
    b.activate()  # should not raise


def test_hit_test_inside_returns_true():
    b = make_button(x=10, y=20, w=100, h=30)
    assert b.hit_test(50, 30) is True


def test_hit_test_outside_returns_false():
    b = make_button(x=10, y=20, w=100, h=30)
    assert b.hit_test(0, 0) is False
    assert b.hit_test(120, 30) is False
    assert b.hit_test(50, 5) is False


def test_on_mouse_press_inside_fires_click():
    fired = []
    b = make_button(x=10, y=20, w=100, h=30, on_click=lambda: fired.append(1))
    b.on_mouse_press(50, 30, button=1)
    assert fired == [1]


def test_on_mouse_press_outside_does_not_fire():
    fired = []
    b = make_button(x=10, y=20, w=100, h=30, on_click=lambda: fired.append(1))
    b.on_mouse_press(0, 0, button=1)
    assert fired == []


def test_button_with_key_label_stores_it():
    b = make_button(text="Reveal", key_label="Space")
    assert b.text == "Reveal"
    assert b.key_label == "Space"
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/unit/test_button.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `src/bibmaxxing/widgets/button.py`**

```python
"""Button widget — labeled rectangle, focusable, keyboard-activatable."""
from __future__ import annotations
import logging
from typing import Callable
import pyglet
from .. import theme

log = logging.getLogger(__name__)


class Button:
    """A focusable, click+keyboard-activatable button.

    Implements the Focusable protocol (bounds, is_focusable, set_focused),
    plus activate() for FocusManager dispatch and on_mouse_press for clicks.

    Constructor args:
      text:      label text
      x, y:      bottom-left corner in window pixels
      w, h:      width, height
      on_click:  optional callback (no args) fired on activate or click
      key_label: optional inline key glyph (e.g. "Space", "1") rendered after label
      enabled:   if False, button is_focusable() returns False and grays out
    """

    def __init__(self, *, text: str, x: int, y: int, w: int, h: int,
                 on_click: Callable[[], None] | None = None,
                 key_label: str | None = None,
                 enabled: bool = True):
        self.text = text
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.on_click = on_click
        self.key_label = key_label
        self.enabled = enabled
        self.focused = False
        self.hovered = False
        self._dirty = True

        # Visual primitives — built lazily so unit tests can mock pyglet
        self._bg = pyglet.shapes.RoundedRectangle(
            x=x, y=y, width=w, height=h, radius=6,
            color=theme.rgba_to_pyglet(theme.NAVY_MID)[:3],  # 3-tuple for shape
        )
        self._bg.opacity = 200
        font_default = theme.resolve_font(theme.FONT_DEFAULT)
        label_text = text if key_label is None else f"{text} [{key_label}]"
        self._label = pyglet.text.Label(
            label_text, font_name=font_default, font_size=theme.FONT_BODY,
            x=x + w // 2, y=y + h // 2,
            anchor_x="center", anchor_y="center",
            color=theme.rgba_to_pyglet(theme.TEXT_PRIMARY),
        )

    # --- Focusable protocol ---

    def bounds(self) -> tuple[int, int, int, int]:
        return (self.x, self.y, self.w, self.h)

    def is_focusable(self) -> bool:
        return self.enabled

    def set_focused(self, focused: bool) -> None:
        if self.focused == focused:
            return
        self.focused = focused
        self._dirty = True
        self._refresh()

    def activate(self) -> None:
        if self.on_click is not None:
            self.on_click()

    # --- Mouse ---

    def hit_test(self, x: int, y: int) -> bool:
        return self.x <= x <= self.x + self.w and self.y <= y <= self.y + self.h

    def on_mouse_press(self, x: int, y: int, button: int) -> bool:
        """Return True if click consumed."""
        if self.enabled and self.hit_test(x, y):
            self.activate()
            return True
        return False

    def on_mouse_motion(self, x: int, y: int) -> None:
        new = self.hit_test(x, y)
        if new != self.hovered:
            self.hovered = new
            self._dirty = True
            self._refresh()

    # --- Render ---

    def render(self) -> None:
        self._bg.draw()
        self._label.draw()

    def _refresh(self) -> None:
        # Update bg color based on state
        if not self.enabled:
            col = theme.NAVY_DEEP
            self._bg.opacity = 130
        elif self.focused:
            col = theme.GOLDENROD
            self._bg.opacity = 230
        elif self.hovered:
            col = theme.NAVY_MID
            self._bg.opacity = 230
        else:
            col = theme.NAVY_MID
            self._bg.opacity = 200
        self._bg.color = theme.rgba_to_pyglet(col)[:3]

    def dispose(self) -> None:
        self._label.delete()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/unit/test_button.py -v
```

Expected: 10 passed.

- [ ] **Step 5: Verify suite**

```bash
pytest tests/ -v
```

Expected: 69/69 passing.

- [ ] **Step 6: SKIP — no git**

---

## Task 5: Modal widget

**Files:**
- Create: `src/bibmaxxing/widgets/modal.py`
- Create: `tests/unit/test_modal.py`

Modal is an overlay panel that traps focus, dims the background, and dismisses on Esc.

- [ ] **Step 1: Write `tests/unit/test_modal.py`**

```python
"""Tests for Modal — focus trap + dismiss on Esc."""
from unittest.mock import MagicMock, patch
from bibmaxxing.widgets.modal import Modal


def make_modal(*, on_dismiss=None, content_render=None):
    with patch("bibmaxxing.widgets.modal.pyglet") as fake_pyglet:
        fake_pyglet.shapes.Rectangle = MagicMock()
        m = Modal(
            window_w=1280, window_h=800,
            content_render=content_render or (lambda: None),
            on_dismiss=on_dismiss,
        )
    return m


def test_modal_starts_open():
    m = make_modal()
    assert m.is_open() is True


def test_dismiss_closes_and_calls_callback():
    fired = []
    m = make_modal(on_dismiss=lambda: fired.append(1))
    m.dismiss()
    assert m.is_open() is False
    assert fired == [1]


def test_dismiss_is_idempotent():
    fired = []
    m = make_modal(on_dismiss=lambda: fired.append(1))
    m.dismiss()
    m.dismiss()
    assert fired == [1]


def test_on_key_press_esc_dismisses():
    import pyglet
    m = make_modal()
    # Use the real key code value — pyglet.window.key.ESCAPE = 65307
    # Importing key at top-level here is safe.
    from pyglet.window import key
    consumed = m.on_key_press(key.ESCAPE, 0)
    assert consumed is True
    assert m.is_open() is False


def test_on_key_press_other_keys_consumed_but_no_dismiss():
    from pyglet.window import key
    m = make_modal()
    consumed = m.on_key_press(key.A, 0)
    # Modal traps ALL keys when open — returns True (consumed) but doesn't dismiss
    assert consumed is True
    assert m.is_open() is True


def test_closed_modal_does_not_consume_keys():
    from pyglet.window import key
    m = make_modal()
    m.dismiss()
    consumed = m.on_key_press(key.A, 0)
    assert consumed is False
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/unit/test_modal.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `src/bibmaxxing/widgets/modal.py`**

```python
"""Modal — focus-trapping overlay with Esc-to-dismiss."""
from __future__ import annotations
import logging
from typing import Callable
import pyglet
from pyglet.window import key
from .. import theme

log = logging.getLogger(__name__)


class Modal:
    """A focus-trapping overlay that dims the background.

    Args:
        window_w, window_h: parent window dimensions for sizing the dim rect
        content_render: callable invoked each frame to draw modal contents
                        (panel background, text, buttons — caller's choice)
        on_dismiss: optional callback fired exactly once on first dismiss
    """

    def __init__(self, *, window_w: int, window_h: int,
                 content_render: Callable[[], None],
                 on_dismiss: Callable[[], None] | None = None):
        self._open = True
        self._content_render = content_render
        self._on_dismiss = on_dismiss

        # Translucent dim background
        self._dim = pyglet.shapes.Rectangle(
            x=0, y=0, width=window_w, height=window_h,
            color=(0, 0, 0),
        )
        self._dim.opacity = 140  # ~55% black

    def is_open(self) -> bool:
        return self._open

    def dismiss(self) -> None:
        if not self._open:
            return
        self._open = False
        if self._on_dismiss is not None:
            self._on_dismiss()
        log.info("modal dismissed")

    def on_key_press(self, symbol: int, modifiers: int) -> bool:
        """Return True if consumed (always True while open)."""
        if not self._open:
            return False
        if symbol == key.ESCAPE:
            self.dismiss()
        return True  # all other keys are swallowed while modal is up

    def on_resize(self, w: int, h: int) -> None:
        self._dim.width = w
        self._dim.height = h

    def render(self) -> None:
        if not self._open:
            return
        self._dim.draw()
        self._content_render()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/unit/test_modal.py -v
```

Expected: 6 passed.

- [ ] **Step 5: Verify suite**

```bash
pytest tests/ -v
```

Expected: 75/75 passing.

- [ ] **Step 6: SKIP — no git**

---

## Task 6: StatusBar widget

**Files:**
- Create: `src/bibmaxxing/widgets/status_bar.py`
- Create: `tests/unit/test_status_bar.py`

Real status bar: pulls from `keybindings.status_bar_for(context)`, exposes `set_context()` to swap the line.

- [ ] **Step 1: Write `tests/unit/test_status_bar.py`**

```python
"""Tests for StatusBar — context-driven bottom status line."""
from unittest.mock import MagicMock, patch
from bibmaxxing.widgets.status_bar import StatusBar
from bibmaxxing.keybindings import BindingContext


def make_bar():
    with patch("bibmaxxing.widgets.status_bar.pyglet") as fake_pyglet:
        fake_pyglet.text.Label = MagicMock()
        bar = StatusBar(window_w=1280, window_h=800)
    return bar


def test_default_context_is_global():
    bar = make_bar()
    assert bar.context == BindingContext.GLOBAL


def test_set_context_updates_text():
    bar = make_bar()
    bar.set_context(BindingContext.DRILLING_REVEALED)
    assert bar.context == BindingContext.DRILLING_REVEALED
    assert "1" in bar.text  # grade keys
    assert "Again" in bar.text


def test_set_context_idempotent_for_same_context():
    bar = make_bar()
    bar.set_context(BindingContext.LIBRARY)
    text1 = bar.text
    bar.set_context(BindingContext.LIBRARY)
    assert bar.text == text1


def test_text_property_returns_current_line():
    bar = make_bar()
    bar.set_context(BindingContext.DRILLING_HIDDEN)
    assert isinstance(bar.text, str)
    assert len(bar.text) > 0
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/unit/test_status_bar.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `src/bibmaxxing/widgets/status_bar.py`**

```python
"""StatusBar — bottom-of-window context-driven keybinding hint line."""
from __future__ import annotations
import pyglet
from .. import theme, keybindings
from ..keybindings import BindingContext

BAR_HEIGHT = 24
PADDING_Y = 4


class StatusBar:
    """A single text label pinned to the bottom of the window, showing
    context-sensitive keybindings (spec §7.3 layer 1).

    Call set_context(ctx) when the active view changes the user's available
    actions. The label re-renders only when context actually changes.
    """

    def __init__(self, *, window_w: int, window_h: int,
                 context: BindingContext = BindingContext.GLOBAL):
        self._w = window_w
        self._h = window_h
        self._context = context
        self._text = keybindings.status_bar_for(context)

        font_default = theme.resolve_font(theme.FONT_DEFAULT)
        self._label = pyglet.text.Label(
            self._text, font_name=font_default, font_size=theme.FONT_SMALL,
            x=window_w // 2, y=PADDING_Y,
            anchor_x="center", anchor_y="bottom",
            color=theme.rgba_to_pyglet(theme.TEXT_DIM),
        )

    @property
    def context(self) -> BindingContext:
        return self._context

    @property
    def text(self) -> str:
        return self._text

    def set_context(self, ctx: BindingContext) -> None:
        if ctx == self._context:
            return
        self._context = ctx
        self._text = keybindings.status_bar_for(ctx)
        self._label.text = self._text

    def on_resize(self, w: int, h: int) -> None:
        self._w = w
        self._h = h
        self._label.x = w // 2

    def render(self) -> None:
        self._label.draw()

    def dispose(self) -> None:
        self._label.delete()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/unit/test_status_bar.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Verify suite**

```bash
pytest tests/ -v
```

Expected: 79/79 passing.

- [ ] **Step 6: SKIP — no git**

---

## Task 7: `?` keybindings overlay

**Files:**
- Create: `src/bibmaxxing/views/help_overlay.py`
- Modify: `src/bibmaxxing/app.py` (intercept `?` key press, show overlay)

The overlay groups bindings by context. Plain text rendering — no widgets needed beyond Modal.

- [ ] **Step 1: Implement `src/bibmaxxing/views/help_overlay.py`**

```python
"""? keybindings overlay. Spec §7.3 layer 3."""
from __future__ import annotations
import logging
import pyglet
from .. import theme, keybindings
from ..keybindings import BindingContext, KEYBINDINGS
from ..widgets.modal import Modal

log = logging.getLogger(__name__)

CONTEXT_TITLES = {
    BindingContext.GLOBAL:           "Global",
    BindingContext.DRILLING_HIDDEN:  "Drilling — Card Hidden",
    BindingContext.DRILLING_REVEALED: "Drilling — Answer Revealed",
    BindingContext.LIBRARY:          "Library Mode",
    BindingContext.DASHBOARD:        "Dashboard",
    BindingContext.ADD:              "Add Question",
    BindingContext.REFERENCES:       "References",
}


class HelpOverlay:
    """Owns a Modal + the rendered keybinding panel.

    Lifecycle: instantiate when user hits '?'; render() each frame until
    is_open() returns False; then dispose().
    """

    def __init__(self, *, window_w: int, window_h: int):
        self._w = window_w
        self._h = window_h
        font_default = theme.resolve_font(theme.FONT_DEFAULT)

        # Build the multi-section text body
        lines: list[str] = []
        for ctx, title in CONTEXT_TITLES.items():
            section_bindings = [b for b in KEYBINDINGS if ctx in b.contexts]
            if not section_bindings:
                continue
            lines.append(f"━━ {title} ━━")
            for b in section_bindings:
                lines.append(f"  {b.key:<14} {b.description}")
            lines.append("")
        body = "\n".join(lines).rstrip()

        self._title_label = pyglet.text.Label(
            "Keybindings — press Esc to close",
            font_name=font_default, font_size=theme.FONT_HEADING,
            x=window_w // 2, y=window_h - 80,
            anchor_x="center", anchor_y="top",
            color=theme.rgba_to_pyglet(theme.GOLDEN_PALE),
        )
        self._body_label = pyglet.text.Label(
            body, font_name=font_default, font_size=theme.FONT_BODY,
            x=window_w // 2, y=window_h - 140,
            anchor_x="center", anchor_y="top",
            color=theme.rgba_to_pyglet(theme.TEXT_PRIMARY),
            multiline=True, width=int(window_w * 0.7),
        )

        self.modal = Modal(
            window_w=window_w, window_h=window_h,
            content_render=self._render_panel,
            on_dismiss=lambda: log.info("help_overlay dismissed"),
        )
        log.info("help_overlay opened")

    def _render_panel(self) -> None:
        self._title_label.draw()
        self._body_label.draw()

    def is_open(self) -> bool:
        return self.modal.is_open()

    def render(self) -> None:
        self.modal.render()

    def on_key_press(self, symbol: int, modifiers: int) -> bool:
        return self.modal.on_key_press(symbol, modifiers)

    def on_resize(self, w: int, h: int) -> None:
        self._w = w
        self._h = h
        self.modal.on_resize(w, h)
        self._title_label.x = w // 2
        self._title_label.y = h - 80
        self._body_label.x = w // 2
        self._body_label.y = h - 140
        self._body_label.width = int(w * 0.7)

    def dispose(self) -> None:
        self._title_label.delete()
        self._body_label.delete()
```

- [ ] **Step 2: Modify `src/bibmaxxing/app.py` to handle `?` key**

In the `BibmaxxingWindow` class:

1. Add to `__init__`:
   ```python
   self.help_overlay = None  # type: HelpOverlay | None
   ```

2. Modify `on_key_press`:
   ```python
   def on_key_press(self, symbol: int, modifiers: int) -> None:
       # Help overlay first — eats all keys while open
       if self.help_overlay is not None and self.help_overlay.is_open():
           self.help_overlay.on_key_press(symbol, modifiers)
           if not self.help_overlay.is_open():
               self.help_overlay.dispose()
               self.help_overlay = None
           return

       if symbol == pyglet.window.key.ESCAPE:
           self.dispatch_event("on_close")
           return
       if symbol == pyglet.window.key.F11:
           self.set_fullscreen(not self.fullscreen)
           log.info("fullscreen toggled to=%s", self.fullscreen)
           return
       if symbol == pyglet.window.key.QUESTION or symbol == pyglet.window.key.SLASH and (modifiers & pyglet.window.key.MOD_SHIFT):
           # ? is Shift+/ on US layouts
           from .views.help_overlay import HelpOverlay
           self.help_overlay = HelpOverlay(window_w=self.width, window_h=self.height)
           return
       if self.active_view.on_key_press(symbol, modifiers):
           return
   ```

   Note: `pyglet.window.key.QUESTION` may not exist as a constant on all keyboards — `?` on US layout is `Shift+/` (SLASH). The fallback handles both.

3. Modify `on_draw`:
   ```python
   def on_draw(self) -> None:
       self.clear()
       self.ctx.viewport = (0, 0, self.width, self.height)
       t = time.monotonic() - self.t0
       self.aurora.render(time_s=t, mood=self.state.mood, intensity=self.state.intensity)
       self.active_view.render()
       self.fps_label.text = f"mood={self.state.mood:.2f} streak={self.state.streak}"
       self.fps_label.draw()
       if self.help_overlay is not None:
           self.help_overlay.render()
   ```

4. Modify `on_resize`:
   ```python
   def on_resize(self, w: int, h: int) -> None:
       super().on_resize(w, h)
       self.ctx.viewport = (0, 0, w, h)
       for v in self.views.values():
           if hasattr(v, "on_resize"):
               v.on_resize(w, h)
       if self.help_overlay is not None:
           self.help_overlay.on_resize(w, h)
   ```

5. Modify `on_close`:
   ```python
   def on_close(self) -> None:
       log.info("window_close")
       if self.help_overlay is not None:
           self.help_overlay.dispose()
       for v in self.views.values():
           if hasattr(v, "dispose"):
               v.dispose()
       if hasattr(self, "conn"):
           self.conn.close()
       super().on_close()
   ```

- [ ] **Step 3: Smoke run with auto-close**

```bash
python -c "
import sys, threading, time, pyglet
from bibmaxxing.__main__ import main

def auto_close():
    time.sleep(2)
    pyglet.app.exit()

threading.Thread(target=auto_close, daemon=True).start()
sys.exit(main(['--verbose']))
"
```

Expected: window opens with flashcards, runs 2 seconds, closes. Manual interactive testing of `?` requires the user — implementer reports DONE_WITH_CONCERNS noting "? overlay code shipped but not interactively triggered."

- [ ] **Step 4: Verify suite**

```bash
pytest tests/ -v
```

Expected: 79/79 (no new tests for help_overlay — render-side).

- [ ] **Step 5: SKIP — no git**

---

## Task 8: Refactor FlashcardsView to use Button + StatusBar

**Files:**
- Modify: `src/bibmaxxing/views/flashcards.py` (replace raw labels with widgets)

Plan 1's FlashcardsView used 4 raw `pyglet.text.Label`s. Refactor: keep stem/choices/message as labels, but replace status_label with `StatusBar`, and add 5 grade Button widgets visible when revealed (still keyboard-activated, but now mouse-clickable too).

- [ ] **Step 1: Read current flashcards.py to remember the shape**

```bash
cat C:/Users/Creator/Documents/FIRSTDIMENSION/bibmaxxing-py/src/bibmaxxing/views/flashcards.py
```

- [ ] **Step 2: Rewrite `src/bibmaxxing/views/flashcards.py`**

```python
"""Flashcards view — Plan 2 widget-based version. Spec §7.

Replaces Plan 1's raw-label version. Stem, choices, and message are still
text labels; status bar is now a real StatusBar widget; grade buttons are
real Button widgets so the user can click as well as type 1-5.
"""
from __future__ import annotations
import logging
import time
from sqlite3 import Connection
import pyglet
from pyglet.window import key

from .. import theme, queue, keybindings
from ..keybindings import BindingContext
from ..state import AppState, apply_event
from ..widgets.button import Button
from ..widgets.focus import FocusManager
from ..widgets.status_bar import StatusBar

log = logging.getLogger(__name__)

# Layout constants
BUTTON_W = 120
BUTTON_H = 44
BUTTON_GAP = 12
BUTTON_BAND_Y = 100   # distance from bottom to button row
GRADE_LABELS = ("Again", "Hard", "Good", "Easy", "Perfect")


class FlashcardsView:
    def __init__(self, window: pyglet.window.Window, state: AppState,
                 conn: Connection, cards: list[dict], bib_id: str):
        self.window = window
        self.state = state
        self.conn = conn
        self.cards = cards
        self.bib_id = bib_id
        self.current: dict | None = None
        self.revealed: bool = False
        self.message: str = ""

        text_color = theme.rgba_to_pyglet(theme.TEXT_PRIMARY)
        dim_color = theme.rgba_to_pyglet(theme.TEXT_DIM)
        font_default = theme.resolve_font(theme.FONT_DEFAULT)

        # Text labels (stem, choices, message)
        self.stem_label = pyglet.text.Label(
            "", font_name=font_default, font_size=theme.FONT_HEADING,
            x=window.width // 2, y=window.height // 2 + 60,
            anchor_x="center", anchor_y="center", color=text_color,
            multiline=True, width=int(window.width * 0.7), align="center",
        )
        self.choices_label = pyglet.text.Label(
            "", font_name=font_default, font_size=theme.FONT_BODY,
            x=window.width // 2, y=window.height // 2 - 40,
            anchor_x="center", anchor_y="top", color=text_color,
            multiline=True, width=int(window.width * 0.7), align="center",
        )
        self.message_label = pyglet.text.Label(
            "", font_name=font_default, font_size=theme.FONT_SMALL,
            x=window.width // 2, y=window.height - 40,
            anchor_x="center", anchor_y="top", color=dim_color,
        )

        # Status bar — pulled from keybindings module
        self.status_bar = StatusBar(window_w=window.width, window_h=window.height,
                                    context=BindingContext.DRILLING_HIDDEN)

        # Grade buttons (visible only when revealed)
        self.grade_buttons: list[Button] = []
        self.focus_mgr = FocusManager()
        self._build_grade_buttons()

        self._next_card()

    def _build_grade_buttons(self) -> None:
        for b in self.grade_buttons:
            b.dispose()
        self.grade_buttons.clear()
        # Clear focus manager — rebuild since widgets disposed
        self.focus_mgr = FocusManager()

        # Center 5 buttons horizontally
        total_w = 5 * BUTTON_W + 4 * BUTTON_GAP
        start_x = (self.window.width - total_w) // 2
        y = BUTTON_BAND_Y
        for i, label in enumerate(GRADE_LABELS):
            grade = i + 1
            btn = Button(
                text=label,
                x=start_x + i * (BUTTON_W + BUTTON_GAP),
                y=y, w=BUTTON_W, h=BUTTON_H,
                key_label=str(grade),
                on_click=lambda g=grade: self._grade(g),
                enabled=False,  # disabled until reveal
            )
            self.grade_buttons.append(btn)
            self.focus_mgr.register(btn)

    def _set_buttons_enabled(self, enabled: bool) -> None:
        for b in self.grade_buttons:
            b.enabled = enabled
            b._refresh()

    def dispose(self) -> None:
        self.stem_label.delete()
        self.choices_label.delete()
        self.message_label.delete()
        self.status_bar.dispose()
        for b in self.grade_buttons:
            b.dispose()

    def _next_card(self) -> None:
        now = int(time.time() * 1000)
        self.current = queue.next_card(self.conn, bib=self.bib_id, cards=self.cards, now_ms=now)
        self.revealed = False
        self._set_buttons_enabled(False)
        self.focus_mgr.clear()
        self.status_bar.set_context(BindingContext.DRILLING_HIDDEN)
        if self.current is None:
            self.stem_label.text = "Nothing due. Come back later, Chief."
            self.choices_label.text = ""
            self.message = ""
            self._update_message()
            return
        self.stem_label.text = self.current["stem"]
        self.choices_label.text = ""
        self._update_message()
        log.info("card_shown bib=%s q=%s", self.bib_id, self.current["id"])

    def _reveal(self) -> None:
        if self.current is None or self.revealed:
            return
        self.revealed = True
        choices = self.current.get("choices", [])
        answer_idx = self.current.get("answer", 0)
        lines = []
        for i, c in enumerate(choices):
            marker = "[*]" if i == answer_idx else "   "
            lines.append(f"{i+1}. {marker} {c}")
        expl = self.current.get("explanation", "")
        if expl:
            lines.append("")
            lines.append(expl)
        self.choices_label.text = "\n".join(lines)
        self._set_buttons_enabled(True)
        self.status_bar.set_context(BindingContext.DRILLING_REVEALED)

    def _grade(self, quality: int) -> None:
        if self.current is None or not self.revealed:
            return
        now = int(time.time() * 1000)
        queue.record_answer(self.conn, bib=self.bib_id, q_id=self.current["id"],
                            quality=quality, now_ms=now)
        apply_event(self.state, "correct" if quality >= 3 else "wrong")
        self.message = f"Graded {quality}.  Streak: {self.state.streak}."
        self._next_card()

    def _update_message(self) -> None:
        self.message_label.text = self.message

    def render(self) -> None:
        self.stem_label.draw()
        self.choices_label.draw()
        self.message_label.draw()
        if self.revealed:
            for b in self.grade_buttons:
                b.render()
        self.status_bar.render()

    def on_key_press(self, symbol: int, modifiers: int) -> bool:
        if symbol in (key.SPACE, key.ENTER):
            if self.revealed:
                self.focus_mgr.activate()  # if a button is focused, press it
            else:
                self._reveal()
            return True
        if symbol == key.N and not self.revealed:
            self._next_card()
            return True
        if symbol == key.TAB:
            if modifiers & pyglet.window.key.MOD_SHIFT:
                self.focus_mgr.focus_prev()
            else:
                self.focus_mgr.focus_next()
            return True
        if self.revealed:
            grade_map = {key._1: 1, key._2: 2, key._3: 3, key._4: 4, key._5: 5}
            if symbol in grade_map:
                self._grade(grade_map[symbol])
                return True
        return False

    def on_mouse_press(self, x: int, y: int, button: int, modifiers: int) -> bool:
        if not self.revealed:
            return False
        for b in self.grade_buttons:
            if b.on_mouse_press(x, y, button):
                return True
        return False

    def on_mouse_motion(self, x: int, y: int) -> None:
        if not self.revealed:
            return
        for b in self.grade_buttons:
            b.on_mouse_motion(x, y)

    def on_resize(self, w: int, h: int) -> None:
        self.stem_label.x = w // 2
        self.stem_label.y = h // 2 + 60
        self.stem_label.width = int(w * 0.7)
        self.choices_label.x = w // 2
        self.choices_label.y = h // 2 - 40
        self.choices_label.width = int(w * 0.7)
        self.message_label.x = w // 2
        self.message_label.y = h - 40
        self.status_bar.on_resize(w, h)
        self._build_grade_buttons()  # recenter
        self._set_buttons_enabled(self.revealed)
```

- [ ] **Step 3: Modify `app.py` to forward mouse events**

In `BibmaxxingWindow`, add:

```python
def on_mouse_press(self, x: int, y: int, button: int, modifiers: int) -> None:
    if self.help_overlay is not None and self.help_overlay.is_open():
        return
    av = self.active_view
    if hasattr(av, "on_mouse_press"):
        av.on_mouse_press(x, y, button, modifiers)

def on_mouse_motion(self, x: int, y: int, dx: int, dy: int) -> None:
    if self.help_overlay is not None and self.help_overlay.is_open():
        return
    av = self.active_view
    if hasattr(av, "on_mouse_motion"):
        av.on_mouse_motion(x, y)
```

- [ ] **Step 4: Smoke run end-to-end**

```bash
python -c "
import sys, threading, time, pyglet
from bibmaxxing.__main__ import main

def auto_close():
    time.sleep(3)
    pyglet.app.exit()

threading.Thread(target=auto_close, daemon=True).start()
sys.exit(main(['--verbose']))
"
```

Expected:
- Window opens
- Flashcard stem renders
- Status bar at bottom shows `Space Reveal · N Skip · ? Help · Esc Back / cancel` (or similar)
- 5 Disabled grade buttons NOT visible (they're enabled=False, render only when revealed)
- Auto-closes after 3s, exit 0

- [ ] **Step 5: Verify suite still passes**

```bash
pytest tests/ -v
```

Expected: 79/79 passing.

- [ ] **Step 6: SKIP — no git**

---

## Task 9: Plan 2 verification + handoff notes

**No code changes — pure verification + handoff doc update.**

- [ ] **Step 1: Run full test suite**

```bash
cd C:/Users/Creator/Documents/FIRSTDIMENSION/bibmaxxing-py
pytest tests/ -v
```

Expected: 79/79 passing.

- [ ] **Step 2: End-to-end manual smoke (interactive)**

This step the user runs themselves; the implementer just confirms the harness is ready:

```bash
python -m bibmaxxing --verbose
```

Then verifies interactively:
- Window opens
- Flashcard renders
- Press `Space` → answer + 5 grade buttons appear
- Press `Tab` → first grade button focuses (gold ring)
- Tab again → second button focuses
- Press `Enter` on focused button → grades + advances to next card
- Press `?` → keybindings overlay appears
- Press `Esc` → overlay dismisses
- Press `F11` → fullscreen toggles
- Press `Esc` → app exits cleanly
- `~/.bibmaxxing/log.txt` contains `view_change`, `modal dismissed`, `fullscreen toggled`, `card_shown`, `answered` lines

The implementer simply reports that the binary is ready — manual interactive verification is the user's pass.

- [ ] **Step 3: Inventory changes**

Run:
```bash
find C:/Users/Creator/Documents/FIRSTDIMENSION/bibmaxxing-py/src -name "*.py" | sort
```

Expected to include the 4 new widget files + help_overlay.py + modified app.py and flashcards.py.

```bash
find C:/Users/Creator/Documents/FIRSTDIMENSION/bibmaxxing-py/tests -name "test_*.py" | sort
```

Expected: 8 → 12 test files (test_focus, test_button, test_modal, test_status_bar added).

- [ ] **Step 4: Report Plan 2 complete**

---

## Plan-2 Verification Checklist

After all 9 tasks:

- [ ] `pytest tests/ -v` reports 79+ passing.
- [ ] `python -m bibmaxxing` opens window, drilling works as before.
- [ ] Pressing Tab cycles focus through grade buttons (visible after reveal).
- [ ] Clicking a grade button works (mouse path).
- [ ] Pressing `?` shows the full keybindings overlay; Esc dismisses it.
- [ ] Pressing F11 toggles fullscreen.
- [ ] Closing via the OS X button properly closes the DB (check log for `window_close` line).
- [ ] No git commands run.

---

## Known gaps (deferred to later plans)

| Spec section | Item | Lands in |
|---|---|---|
| §7 | ScrollView widget — needed by MarkdownView | Plan 3 |
| §7 | TextInput widget — needed by Add view | Plan 4 |
| §8 | MarkdownView + library mode | Plan 3 |
| §5 | 4-pass FBO chain + post-processing + particles | Plan 5 |
| §13 | Import/export bridge | Plan 6 |

---

## Plan 2 → Plan 3 handoff

After Plan 2 you have:
- A real widget toolkit foundation (focus/button/modal/status_bar)
- A view registry + cleanly-named active_view
- The `?` overlay teaches users the app

Plan 3 will:
- Build ScrollView (the second-largest widget after MarkdownView)
- Build MarkdownView using ScrollView + the existing button-style focus/render patterns
- Add the `guide` view (study guides reader) using MarkdownView in scrollview
- Add navigation between flashcards and guide views (the `g f` / `g s` leader keys finally do something)
