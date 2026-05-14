# Bibmaxxing-Py — Plan 1: Skeleton + First Working Drilling

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Python project skeleton, get a Pyglet+ModernGL window with an animated aurora background, port the SM-2 SRS algorithm, wire SQLite persistence, and ship a minimal flashcards view that lets the user actually drill cards from the existing CWT-E7 Bib.

**Architecture:** Pyglet 2.0 owns the window/event loop; ModernGL owns the shader pipeline and FBOs; SQLite owns SRS state. Mood-driven uniforms feed an aurora fragment shader so visual state reacts to drilling outcomes. Module layout mirrors the existing JS app.

**Tech Stack:** Python 3.12+, Pyglet 2.0+, ModernGL, SQLite (stdlib), markdown-it-py (preinstalled, used in later plans), pytest, watchdog (dev only), colorama (dev only)

**Spec reference:** `docs/superpowers/specs/2026-04-29-bibmaxxing-py-design.md`

**Plan scope:** Plan 1 of 7. Subsequent plans:
- Plan 2: Widget toolkit (FocusManager, Button, ScrollView, Modal, TextInput)
- Plan 3: MarkdownView + library mode
- Plan 4: Quiz + Mock Exam + References + Add views
- Plan 5: Tier-C polish (particles, post-processing, audio, card 3D-tilt)
- Plan 6: Settings + import/export + crash dump + golden-image tests
- Plan 7: PyInstaller packaging + low-power mode + final docs

**At end of Plan 1 you will have:** a Python app launchable via `python -m bibmaxxing` that opens a 1280×800 window, shows an aurora background that pulses with your study mood, lets you press Space/1-5 to drill flashcards from the existing `data/bibs/CWT-E7/questions.json`, and persists SRS state to `~/.bibmaxxing/state.db`. No widget toolkit yet (just text rendering); no markdown viewer yet; no particles yet.

---

## File Structure (Plan 1 Scope)

**Created in this plan:**

```
FIRSTDIMENSION/
├── bibmaxxing-py/                    ← NEW project root, sibling of existing index.html
│   ├── pyproject.toml                ← deps + entry point
│   ├── README.md                     ← short, points at spec
│   ├── .gitignore                    ← Python + state + log
│   ├── src/bibmaxxing/
│   │   ├── __init__.py
│   │   ├── __main__.py               ← entry: `python -m bibmaxxing`
│   │   ├── app.py                    ← Pyglet Window subclass + event loop
│   │   ├── state.py                  ← AppState dataclass + mood lerp
│   │   ├── db.py                     ← SQLite I/O
│   │   ├── srs.py                    ← SM-2 algorithm
│   │   ├── bibs.py                   ← Bib loader
│   │   ├── theme.py                  ← color palette + font sizes
│   │   ├── keybindings.py            ← KEYBINDINGS table
│   │   ├── log_setup.py              ← rotating file logger
│   │   ├── paths.py                  ← OS-correct paths (~/.bibmaxxing/)
│   │   ├── render/
│   │   │   ├── __init__.py
│   │   │   ├── pipeline.py           ← FBO chain orchestration
│   │   │   ├── aurora.py             ← aurora system (loads shader, sets uniforms)
│   │   │   └── shaders/
│   │   │       ├── quad.vert
│   │   │       └── aurora.frag
│   │   └── views/
│   │       ├── __init__.py
│   │       └── flashcards.py         ← minimal drilling view
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       └── unit/
│           ├── __init__.py
│           ├── test_state.py
│           ├── test_db.py
│           ├── test_srs.py
│           ├── test_bibs.py
│           └── test_paths.py
```

**Read but not modified:**
- `data/bibs/CWT-E7/questions.json` (461 cards)
- `data/bibs/CWT-E7/BIB-SCOPE.md`

---

## Setup Note (Pre-Plan)

The user runs Windows, Python 3.13.x, with PyMuPDF already installed (used previously in this project). Pyglet, ModernGL, watchdog, colorama will be new installs. Tests run via `pytest`.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `bibmaxxing-py/pyproject.toml`
- Create: `bibmaxxing-py/README.md`
- Create: `bibmaxxing-py/.gitignore`
- Create: `bibmaxxing-py/src/bibmaxxing/__init__.py` (empty)
- Create: `bibmaxxing-py/tests/__init__.py` (empty)
- Create: `bibmaxxing-py/tests/unit/__init__.py` (empty)
- Create: `bibmaxxing-py/tests/conftest.py`

- [ ] **Step 1: Create the directory tree**

```bash
cd C:/Users/Creator/Documents/FIRSTDIMENSION
mkdir -p bibmaxxing-py/src/bibmaxxing/render/shaders
mkdir -p bibmaxxing-py/src/bibmaxxing/views
mkdir -p bibmaxxing-py/src/bibmaxxing/widgets
mkdir -p bibmaxxing-py/tests/unit
mkdir -p bibmaxxing-py/tests/golden
```

- [ ] **Step 2: Write `pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "bibmaxxing"
version = "0.1.0"
description = "Tier-C pure-procedural Python fork of Bibmaxxing for Navy advancement study"
requires-python = ">=3.12"
dependencies = [
    "pyglet>=2.0,<3.0",
    "moderngl>=5.10",
    "numpy>=1.26",
    "markdown-it-py>=3.0",
    "pygments>=2.17",
    "Pillow>=10.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=4.1",
    "watchdog>=4.0",
    "colorama>=0.4.6",
]

[project.scripts]
bibmaxxing = "bibmaxxing.__main__:main"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
addopts = "-q --tb=short"
```

- [ ] **Step 3: Write `README.md`**

```markdown
# bibmaxxing-py

Python fork of Bibmaxxing for Navy CWT advancement study. Tier-C pure-procedural visual identity. Daily-driver replacement for the JS web app.

See `docs/superpowers/specs/2026-04-29-bibmaxxing-py-design.md` for the design.

## Dev

```bash
pip install -e ".[dev]"
python -m bibmaxxing
pytest
```

## Run

```bash
python -m bibmaxxing               # default
python -m bibmaxxing --verbose     # DEBUG logs
python -m bibmaxxing --low-power   # disable post-processing for weak GPUs
```
```

- [ ] **Step 4: Write `.gitignore`**

```
__pycache__/
*.pyc
*.pyo
.pytest_cache/
.coverage
htmlcov/
build/
dist/
*.egg-info/
.eggs/
.venv/
venv/
*.swp
.DS_Store
```

- [ ] **Step 5: Write empty `__init__.py` files and a minimal `conftest.py`**

`bibmaxxing-py/src/bibmaxxing/__init__.py`:
```python
"""bibmaxxing — tier-C pure-procedural fork."""
__version__ = "0.1.0"
```

`bibmaxxing-py/tests/__init__.py`: empty

`bibmaxxing-py/tests/unit/__init__.py`: empty

`bibmaxxing-py/tests/conftest.py`:
```python
"""Shared pytest fixtures."""
import sys
from pathlib import Path

# Make src/ importable
SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
```

- [ ] **Step 6: Install in dev mode and verify pytest runs**

```bash
cd bibmaxxing-py
pip install -e ".[dev]"
pytest
```

Expected output: `no tests ran in 0.0Xs` (no failures, just no tests yet).

- [ ] **Step 7: Commit**

```bash
git add bibmaxxing-py/pyproject.toml bibmaxxing-py/README.md bibmaxxing-py/.gitignore bibmaxxing-py/src/bibmaxxing/__init__.py bibmaxxing-py/tests/__init__.py bibmaxxing-py/tests/unit/__init__.py bibmaxxing-py/tests/conftest.py
git commit -m "scaffold: bibmaxxing-py project structure"
```

---

## Task 2: Paths Module

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/paths.py`
- Test: `bibmaxxing-py/tests/unit/test_paths.py`

`paths.py` resolves OS-correct locations: `~/.bibmaxxing/state.db`, `~/.bibmaxxing/log.txt`, plus the data root that points back at `FIRSTDIMENSION/data/`.

- [ ] **Step 1: Write the failing test**

`tests/unit/test_paths.py`:
```python
from pathlib import Path
import os
from bibmaxxing import paths

def test_user_home_dir_under_dot_bibmaxxing(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))  # Windows
    p = paths.user_dir()
    assert p == tmp_path / ".bibmaxxing"

def test_user_dir_is_created_on_demand(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    p = paths.ensure_user_dir()
    assert p.exists()
    assert p.is_dir()

def test_db_path(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    assert paths.db_path() == tmp_path / ".bibmaxxing" / "state.db"

def test_log_path(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    assert paths.log_path() == tmp_path / ".bibmaxxing" / "log.txt"

def test_data_root_is_findable():
    # data/ lives two levels above the package (project layout)
    p = paths.data_root()
    assert p.name == "data"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd bibmaxxing-py
pytest tests/unit/test_paths.py -v
```

Expected: ImportError on `from bibmaxxing import paths`.

- [ ] **Step 3: Implement `paths.py`**

```python
"""OS-correct filesystem paths for bibmaxxing."""
from __future__ import annotations
import os
from pathlib import Path

USER_DIRNAME = ".bibmaxxing"

def user_dir() -> Path:
    """Return ~/.bibmaxxing/ — does not create it."""
    home = os.environ.get("USERPROFILE") or os.environ.get("HOME")
    if not home:
        home = str(Path.home())
    return Path(home) / USER_DIRNAME

def ensure_user_dir() -> Path:
    """Return user_dir(), creating it (and parents) if needed."""
    p = user_dir()
    p.mkdir(parents=True, exist_ok=True)
    return p

def db_path() -> Path:
    return user_dir() / "state.db"

def log_path() -> Path:
    return user_dir() / "log.txt"

def data_root() -> Path:
    """The on-disk content root: FIRSTDIMENSION/data/.

    Resolved relative to this file: ../../../../data/ when installed via -e .
    """
    here = Path(__file__).resolve()
    # src/bibmaxxing/paths.py → bibmaxxing-py/src/bibmaxxing/ → bibmaxxing-py/ → FIRSTDIMENSION/
    candidate = here.parents[3] / "data"
    return candidate
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_paths.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/paths.py bibmaxxing-py/tests/unit/test_paths.py
git commit -m "feat(paths): OS-correct paths for user dir, db, log, data root"
```

---

## Task 3: Logging Setup

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/log_setup.py`
- Test: `bibmaxxing-py/tests/unit/test_log_setup.py`

Per spec §10: rotating file (10 MB cap, 5 archives), single-line K=V format, configurable level.

- [ ] **Step 1: Write the failing test**

`tests/unit/test_log_setup.py`:
```python
import logging
from pathlib import Path
from bibmaxxing import log_setup

def test_setup_returns_root_logger(tmp_path):
    logger = log_setup.setup(level="INFO", log_file=tmp_path / "test.log")
    assert isinstance(logger, logging.Logger)
    assert logger.level == logging.INFO

def test_log_file_is_created_after_first_write(tmp_path):
    log_file = tmp_path / "test.log"
    log_setup.setup(level="DEBUG", log_file=log_file)
    logging.getLogger("bibmaxxing.test").info("hello world")
    # Force flush
    for h in logging.getLogger().handlers:
        h.flush()
    assert log_file.exists()
    text = log_file.read_text()
    assert "hello world" in text
    assert "[INFO" in text

def test_kv_tail_format(tmp_path):
    log_file = tmp_path / "test.log"
    log_setup.setup(level="DEBUG", log_file=log_file)
    logging.getLogger("bibmaxxing.srs").info("answered bib=CWT q=q1 quality=4")
    for h in logging.getLogger().handlers:
        h.flush()
    line = log_file.read_text().strip().splitlines()[-1]
    # Format: 2026-04-29 14:32:18.473 [INFO ] srs        bib=CWT q=q1 quality=4
    assert "[INFO " in line
    assert "srs" in line
    assert "bib=CWT" in line

def test_invalid_level_raises():
    import pytest
    with pytest.raises(ValueError):
        log_setup.setup(level="FAKE_LEVEL", log_file=Path("ignored"))
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/unit/test_log_setup.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `log_setup.py`**

```python
"""Rotating-file logger setup. See spec §10."""
from __future__ import annotations
import logging
import logging.handlers
from pathlib import Path

VALID_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB
BACKUP_COUNT = 5

# 2026-04-29 14:32:18.473 [INFO ] srs        message…
_FMT = "%(asctime)s.%(msecs)03d [%(levelname)-5s] %(name_short)-10s %(message)s"
_DATEFMT = "%Y-%m-%d %H:%M:%S"


class _ShortNameFilter(logging.Filter):
    """Replace logger name 'bibmaxxing.srs' with 'srs' for cleaner log lines."""
    def filter(self, record: logging.LogRecord) -> bool:
        name = record.name
        record.name_short = name.split(".")[-1] if "." in name else name
        return True


def setup(level: str = "INFO", log_file: Path | None = None,
          mirror_to_console: bool = False) -> logging.Logger:
    """Configure the root logger; returns it.

    Args:
        level: One of DEBUG, INFO, WARNING, ERROR, CRITICAL.
        log_file: Path to log file. Caller is responsible for creating parent dir.
        mirror_to_console: If True, also write to stderr.
    """
    if level not in VALID_LEVELS:
        raise ValueError(f"Invalid level {level!r}; expected one of {VALID_LEVELS}")
    if log_file is None:
        raise ValueError("log_file is required")

    log_file.parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    # Reset handlers (idempotent for tests)
    for h in list(root.handlers):
        root.removeHandler(h)
    root.setLevel(getattr(logging, level))

    fmt = logging.Formatter(_FMT, datefmt=_DATEFMT)
    short_filter = _ShortNameFilter()

    file_handler = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    file_handler.addFilter(short_filter)
    root.addHandler(file_handler)

    if mirror_to_console:
        import sys
        console = logging.StreamHandler(sys.stderr)
        console.setFormatter(fmt)
        console.addFilter(short_filter)
        root.addHandler(console)

    return root
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_log_setup.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/log_setup.py bibmaxxing-py/tests/unit/test_log_setup.py
git commit -m "feat(log): rotating file logger with K=V tail format"
```

---

## Task 4: AppState dataclass + mood lerp

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/state.py`
- Test: `bibmaxxing-py/tests/unit/test_state.py`

Per spec §5.2 and §5.3.

- [ ] **Step 1: Write the failing test**

`tests/unit/test_state.py`:
```python
from collections import deque
import math
from bibmaxxing.state import AppState, EVENT_DELTAS, lerp_mood, apply_event

def test_default_state():
    s = AppState()
    assert 0.4 < s.mood < 0.6  # starts neutral
    assert s.mood == s.mood_target
    assert s.streak == 0
    assert s.current_view == "dashboard"
    assert s.mode == "drilling"
    assert s.intensity == 1.0

def test_lerp_mood_converges():
    s = AppState(mood=0.0, mood_target=1.0)
    # k=1.8/sec; after t=1.0s, mood should be far along but not at 1
    for _ in range(60):  # 60 frames at dt=1/60
        lerp_mood(s, dt=1.0/60.0)
    assert s.mood > 0.8
    assert s.mood < 1.0

def test_lerp_mood_no_overshoot():
    s = AppState(mood=0.0, mood_target=1.0)
    for _ in range(600):
        lerp_mood(s, dt=1.0/60.0)
    assert s.mood <= 1.0 + 1e-6
    assert math.isclose(s.mood, 1.0, abs_tol=1e-3)

def test_apply_event_correct_increases_target():
    s = AppState(mood=0.5, mood_target=0.5)
    apply_event(s, "correct")
    assert s.mood_target > 0.5
    assert s.mood_target == min(1.0, 0.5 + EVENT_DELTAS["correct"])

def test_apply_event_wrong_decreases_target():
    s = AppState(mood=0.5, mood_target=0.5)
    apply_event(s, "wrong")
    assert s.mood_target < 0.5
    assert s.mood_target == max(0.0, 0.5 + EVENT_DELTAS["wrong"])

def test_apply_event_correct_increments_streak():
    s = AppState()
    apply_event(s, "correct")
    apply_event(s, "correct")
    assert s.streak == 2

def test_apply_event_wrong_resets_streak():
    s = AppState(streak=5)
    apply_event(s, "wrong")
    assert s.streak == 0

def test_accuracy_window_caps_at_10():
    s = AppState()
    for _ in range(15):
        apply_event(s, "correct")
    assert len(s.accuracy_window) == 10
    assert all(s.accuracy_window)

def test_streak_5_bonus():
    s = AppState()
    for _ in range(5):
        apply_event(s, "correct")
    # Streak hit threshold should add the +0.30 bonus to mood_target
    expected = min(1.0, 5 * EVENT_DELTAS["correct"] + EVENT_DELTAS["streak_5"])
    assert math.isclose(s.mood_target, expected, abs_tol=1e-6)

def test_unknown_event_raises():
    import pytest
    s = AppState()
    with pytest.raises(ValueError):
        apply_event(s, "lol")
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/unit/test_state.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `state.py`**

```python
"""AppState — the single source of truth for visual reactivity. See spec §5.2/5.3."""
from __future__ import annotations
from collections import deque
from dataclasses import dataclass, field
from typing import Literal

# Mood lerp speed per second
LERP_K = 1.8

# Event mood-target deltas (spec §5.3)
EVENT_DELTAS = {
    "correct":  +0.10,
    "wrong":    -0.15,
    "streak_5": +0.30,   # additional bonus when streak reaches 5
    "streak_10": +0.50,  # additional bonus when streak reaches 10
    "idle":     0.0,     # drift toward 0.5 — handled separately
    "view_change": 0.0,  # mode-pack swap, no mood Δ
}

ACCURACY_WINDOW = 10

Mode = Literal["drilling", "library"]


@dataclass(slots=True)
class AppState:
    mood: float = 0.5
    mood_target: float = 0.5
    streak: int = 0
    accuracy_window: deque = field(default_factory=lambda: deque(maxlen=ACCURACY_WINDOW))
    current_view: str = "dashboard"
    intensity: float = 1.0
    mode: Mode = "drilling"


def lerp_mood(state: AppState, dt: float) -> None:
    """Move mood toward mood_target using exponential smoothing.

    Frame-rate independent: t-half ~ ln(2)/k = 0.385 sec at k=1.8.
    """
    factor = 1.0 - pow(2.718281828, -LERP_K * dt)
    state.mood += (state.mood_target - state.mood) * factor
    # Clamp tiny floating-point overshoot
    if abs(state.mood - state.mood_target) < 1e-4:
        state.mood = state.mood_target


def apply_event(state: AppState, event: str) -> None:
    """Mutate state for an event. Spec §5.3."""
    if event not in EVENT_DELTAS:
        raise ValueError(f"Unknown event {event!r}; expected one of {list(EVENT_DELTAS)}")

    if event == "correct":
        state.streak += 1
        state.accuracy_window.append(True)
        state.mood_target = min(1.0, state.mood_target + EVENT_DELTAS["correct"])
        if state.streak == 5:
            state.mood_target = min(1.0, state.mood_target + EVENT_DELTAS["streak_5"])
        elif state.streak == 10:
            state.mood_target = min(1.0, state.mood_target + EVENT_DELTAS["streak_10"])
    elif event == "wrong":
        state.streak = 0
        state.accuracy_window.append(False)
        state.mood_target = max(0.0, state.mood_target + EVENT_DELTAS["wrong"])
    elif event == "idle":
        # drift toward 0.5 — let lerp do the work, just retarget
        state.mood_target = 0.5
    # view_change is a no-op for mood; mode pack handles visuals separately
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_state.py -v
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/state.py bibmaxxing-py/tests/unit/test_state.py
git commit -m "feat(state): AppState + mood lerp + event deltas"
```

---

## Task 5: Theme module

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/theme.py`
- Test: none (constants only — change-detection by code review)

- [ ] **Step 1: Write `theme.py`**

```python
"""Color palette + font sizes. Navy + goldenrod identity."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal

# Colors as RGBA tuples in 0..1 range (for ModernGL uniforms) and 0..255 (for pyglet)

# Palette endpoints driven by mood — Navy-cool ↔ Goldenrod-warm
NAVY_DEEP    = (0.04, 0.10, 0.20, 1.0)   # background, low mood
NAVY_MID     = (0.10, 0.20, 0.36, 1.0)
GOLDENROD    = (0.85, 0.65, 0.13, 1.0)   # accent, high mood
GOLDEN_PALE  = (0.96, 0.85, 0.55, 1.0)
TEXT_PRIMARY = (0.95, 0.95, 0.97, 1.0)
TEXT_DIM     = (0.65, 0.68, 0.74, 1.0)
ERROR_RED    = (0.85, 0.25, 0.30, 1.0)
SUCCESS_GREEN= (0.25, 0.75, 0.45, 1.0)


def rgba_to_pyglet(c):
    """(r,g,b,a) in 0..1 -> (R,G,B,A) in 0..255 ints for pyglet calls."""
    return tuple(int(round(v * 255)) for v in c)


# Font sizes (pixels)
FONT_BODY     = 16
FONT_SMALL    = 13
FONT_HEADING  = 28
FONT_DISPLAY  = 48
FONT_MONO_CODE = 14

# Font family names (pyglet falls back if absent — bundling later in Plan 7)
FONT_DEFAULT = "Inter"
FONT_MONO    = "JetBrains Mono"


@dataclass(frozen=True, slots=True)
class ModePack:
    name: str
    intensity:    float  # 0..1, multiplies bloom + particle count + aurora amplitude
    particles:    int    # target particle count
    bloom:        float  # bloom strength
    card_tilt:    float  # radians of pseudo-3D tilt on cards


MODE_DRILLING = ModePack(name="drilling", intensity=1.00, particles=400, bloom=0.60, card_tilt=0.18)
MODE_LIBRARY  = ModePack(name="library",  intensity=0.40, particles=80,  bloom=0.15, card_tilt=0.00)
```

- [ ] **Step 2: Sanity-check by importing**

```bash
cd bibmaxxing-py
python -c "from bibmaxxing import theme; print(theme.MODE_DRILLING)"
```

Expected: `ModePack(name='drilling', intensity=1.0, particles=400, bloom=0.6, card_tilt=0.18)`

- [ ] **Step 3: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/theme.py
git commit -m "feat(theme): Navy + goldenrod palette + ModePack constants"
```

---

## Task 6: Keybindings module

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/keybindings.py`
- Test: `bibmaxxing-py/tests/unit/test_keybindings.py`

Single source of truth for all keys (spec §7.2 + §7.3).

- [ ] **Step 1: Write the failing test**

`tests/unit/test_keybindings.py`:
```python
from bibmaxxing.keybindings import (
    KEYBINDINGS, BindingContext, lookup, status_bar_for, format_label,
)

def test_lookup_global_help():
    b = lookup("?", BindingContext.GLOBAL)
    assert b is not None
    assert "help" in b.description.lower()

def test_lookup_drilling_grade():
    for k in ("1", "2", "3", "4", "5"):
        b = lookup(k, BindingContext.DRILLING_REVEALED)
        assert b is not None
        assert "grade" in b.description.lower() or b.description.startswith(("Again", "Hard", "Good", "Easy", "Perfect"))

def test_lookup_returns_none_for_unknown():
    assert lookup("ZZZ", BindingContext.GLOBAL) is None

def test_status_bar_drilling_revealed_lists_grade_keys():
    line = status_bar_for(BindingContext.DRILLING_REVEALED)
    assert "1" in line
    assert "Again" in line
    assert "?" in line  # help always shown

def test_status_bar_library_lists_navigation():
    line = status_bar_for(BindingContext.LIBRARY)
    assert "Scroll" in line or "↑↓" in line
    assert "Esc" in line

def test_format_label_shows_bracketed_key():
    assert format_label("Reveal", "Space") == "Reveal [Space]"
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/unit/test_keybindings.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `keybindings.py`**

```python
"""Single source of truth for all keybindings. See spec §7.2 + §7.3."""
from __future__ import annotations
from dataclasses import dataclass
from enum import Enum, auto


class BindingContext(Enum):
    GLOBAL = auto()
    DRILLING_HIDDEN = auto()      # card front showing, answer hidden
    DRILLING_REVEALED = auto()    # answer shown, awaiting grade
    LIBRARY = auto()
    DASHBOARD = auto()
    ADD = auto()
    REFERENCES = auto()


@dataclass(frozen=True, slots=True)
class Binding:
    key: str            # display label e.g. "Space", "1", "↑↓", "g f"
    description: str    # short label e.g. "Reveal", "Again"
    contexts: tuple[BindingContext, ...]
    action: str         # action id, dispatched by views


KEYBINDINGS: tuple[Binding, ...] = (
    # Global
    Binding("?",          "Help",                 (BindingContext.GLOBAL,), "show_help"),
    Binding("Tab",        "Next focus",           (BindingContext.GLOBAL,), "focus_next"),
    Binding("Shift+Tab",  "Previous focus",       (BindingContext.GLOBAL,), "focus_prev"),
    Binding("Esc",        "Back / cancel",        (BindingContext.GLOBAL,), "cancel"),
    Binding("F11",        "Toggle fullscreen",    (BindingContext.GLOBAL,), "toggle_fullscreen"),
    # Vim-style leader: g then f/q/e/s
    Binding("g f",        "Jump: flashcards",     (BindingContext.GLOBAL,), "go_flashcards"),
    Binding("g q",        "Jump: quiz",           (BindingContext.GLOBAL,), "go_quiz"),
    Binding("g e",        "Jump: exam",           (BindingContext.GLOBAL,), "go_exam"),
    Binding("g s",        "Jump: study guides",   (BindingContext.GLOBAL,), "go_guides"),
    Binding("g d",        "Jump: dashboard",      (BindingContext.GLOBAL,), "go_dashboard"),
    # Drilling — card hidden
    Binding("Space",      "Reveal",               (BindingContext.DRILLING_HIDDEN,), "reveal"),
    Binding("Enter",      "Reveal",               (BindingContext.DRILLING_HIDDEN,), "reveal"),
    Binding("N",          "Skip",                 (BindingContext.DRILLING_HIDDEN,), "skip"),
    # Drilling — answer revealed (SM-2 grades)
    Binding("1",          "Again",                (BindingContext.DRILLING_REVEALED,), "grade_1"),
    Binding("2",          "Hard",                 (BindingContext.DRILLING_REVEALED,), "grade_2"),
    Binding("3",          "Good",                 (BindingContext.DRILLING_REVEALED,), "grade_3"),
    Binding("4",          "Easy",                 (BindingContext.DRILLING_REVEALED,), "grade_4"),
    Binding("5",          "Perfect",              (BindingContext.DRILLING_REVEALED,), "grade_5"),
    # Library
    Binding("↑↓",         "Scroll",               (BindingContext.LIBRARY,), "scroll"),
    Binding("PgUp/PgDn",  "Page",                 (BindingContext.LIBRARY,), "page"),
    Binding("/",          "Search",               (BindingContext.LIBRARY,), "search"),
    Binding("n",          "Next match",           (BindingContext.LIBRARY,), "search_next"),
    Binding("N",          "Prev match",           (BindingContext.LIBRARY,), "search_prev"),
    Binding("o",          "TOC",                  (BindingContext.LIBRARY,), "toggle_toc"),
)


def lookup(key: str, context: BindingContext) -> Binding | None:
    """Find the Binding matching this key in this (or GLOBAL) context."""
    for b in KEYBINDINGS:
        if b.key.lower() == key.lower():
            if context in b.contexts or BindingContext.GLOBAL in b.contexts:
                return b
    return None


def status_bar_for(context: BindingContext) -> str:
    """Produce the bottom status-bar string for this context (spec §7.3)."""
    parts: list[str] = []
    for b in KEYBINDINGS:
        if context in b.contexts:
            parts.append(f"{b.key} {b.description}")
    # Always include help
    if not any("Help" in p for p in parts):
        parts.append("? Help")
    return "  ·  ".join(parts)


def format_label(text: str, key: str) -> str:
    """Inline label format: 'Reveal [Space]'. Spec §7.3 layer 2."""
    return f"{text} [{key}]"
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_keybindings.py -v
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/keybindings.py bibmaxxing-py/tests/unit/test_keybindings.py
git commit -m "feat(keys): single source of truth + status-bar formatter"
```

---

## Task 7: SQLite DB module

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/db.py`
- Test: `bibmaxxing-py/tests/unit/test_db.py`

Schema per spec §6.3.

- [ ] **Step 1: Write the failing test**

`tests/unit/test_db.py`:
```python
import time
import sqlite3
from pathlib import Path
import pytest
from bibmaxxing import db

@pytest.fixture
def tmp_db(tmp_path):
    p = tmp_path / "test.db"
    return db.connect(p)

def test_connect_creates_schema(tmp_db):
    cur = tmp_db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    assert "srs_state" in tables
    assert "settings" in tables
    assert "history" in tables

def test_write_and_read_srs_state(tmp_db):
    db.upsert_srs(tmp_db, bib="CWT-E7", q_id="q1", ef=2.5, interval=1, reps=1, due=1000, last_q=4, last_at=999)
    state = db.read_srs(tmp_db, bib="CWT-E7", q_id="q1")
    assert state["ef"] == 2.5
    assert state["interval"] == 1
    assert state["reps"] == 1
    assert state["due"] == 1000

def test_read_missing_returns_none(tmp_db):
    assert db.read_srs(tmp_db, bib="CWT-E7", q_id="missing") is None

def test_read_due_returns_only_due_questions(tmp_db):
    now = int(time.time() * 1000)
    db.upsert_srs(tmp_db, bib="CWT-E7", q_id="q1", ef=2.5, interval=1, reps=1, due=now - 1000, last_q=4, last_at=0)
    db.upsert_srs(tmp_db, bib="CWT-E7", q_id="q2", ef=2.5, interval=1, reps=1, due=now + 100000, last_q=4, last_at=0)
    due_ids = [r["question_id"] for r in db.read_due(tmp_db, bib="CWT-E7", now_ms=now)]
    assert "q1" in due_ids
    assert "q2" not in due_ids

def test_per_bib_isolation(tmp_db):
    db.upsert_srs(tmp_db, bib="CWT-E7", q_id="q1", ef=2.5, interval=1, reps=1, due=1000, last_q=4, last_at=0)
    db.upsert_srs(tmp_db, bib="OTHER", q_id="q1", ef=3.0, interval=5, reps=2, due=2000, last_q=5, last_at=0)
    a = db.read_srs(tmp_db, bib="CWT-E7", q_id="q1")
    b = db.read_srs(tmp_db, bib="OTHER", q_id="q1")
    assert a["ef"] == 2.5
    assert b["ef"] == 3.0

def test_settings_round_trip(tmp_db):
    db.set_setting(tmp_db, "theme", "dark")
    assert db.get_setting(tmp_db, "theme") == "dark"
    assert db.get_setting(tmp_db, "missing") is None
    assert db.get_setting(tmp_db, "missing", default="x") == "x"

def test_history_append(tmp_db):
    db.append_history(tmp_db, bib="CWT-E7", event="answer", payload='{"q":"q1","grade":4}')
    rows = list(tmp_db.execute("SELECT bib_id, event, payload FROM history"))
    assert len(rows) == 1
    assert rows[0][0] == "CWT-E7"
    assert rows[0][1] == "answer"

def test_integrity_check_passes_on_clean_db(tmp_db):
    assert db.integrity_check(tmp_db) is True
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/unit/test_db.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `db.py`**

```python
"""SQLite I/O for SRS state, settings, history. See spec §6.3."""
from __future__ import annotations
import json
import logging
import sqlite3
import time
from pathlib import Path

log = logging.getLogger(__name__)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS srs_state (
    bib_id      TEXT NOT NULL,
    question_id TEXT NOT NULL,
    ef          REAL NOT NULL,
    interval    INTEGER NOT NULL,
    reps        INTEGER NOT NULL,
    due         INTEGER NOT NULL,
    last_q      INTEGER,
    last_at     INTEGER,
    PRIMARY KEY (bib_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_due ON srs_state (bib_id, due);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS history (
    id      INTEGER PRIMARY KEY,
    bib_id  TEXT NOT NULL,
    ts      INTEGER NOT NULL,
    event   TEXT NOT NULL,
    payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_hist_bib_ts ON history (bib_id, ts);
"""


def connect(path: Path | str) -> sqlite3.Connection:
    """Open or create the SQLite DB and ensure schema. Returns the connection."""
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    log.info("db opened path=%s", path)
    return conn


def integrity_check(conn: sqlite3.Connection) -> bool:
    cur = conn.execute("PRAGMA integrity_check")
    row = cur.fetchone()
    ok = row[0] == "ok"
    log.info("db integrity_check ok=%s", ok)
    return ok


def upsert_srs(conn: sqlite3.Connection, *, bib: str, q_id: str, ef: float,
               interval: int, reps: int, due: int, last_q: int | None,
               last_at: int | None) -> None:
    conn.execute(
        """INSERT INTO srs_state (bib_id, question_id, ef, interval, reps, due, last_q, last_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(bib_id, question_id) DO UPDATE SET
             ef=excluded.ef, interval=excluded.interval, reps=excluded.reps,
             due=excluded.due, last_q=excluded.last_q, last_at=excluded.last_at""",
        (bib, q_id, ef, interval, reps, due, last_q, last_at),
    )
    conn.commit()


def read_srs(conn: sqlite3.Connection, *, bib: str, q_id: str) -> dict | None:
    cur = conn.execute(
        "SELECT * FROM srs_state WHERE bib_id=? AND question_id=?", (bib, q_id)
    )
    row = cur.fetchone()
    return dict(row) if row else None


def read_due(conn: sqlite3.Connection, *, bib: str, now_ms: int | None = None,
             limit: int = 200) -> list[dict]:
    """Return rows with due <= now, oldest-due first."""
    if now_ms is None:
        now_ms = int(time.time() * 1000)
    cur = conn.execute(
        "SELECT * FROM srs_state WHERE bib_id=? AND due<=? ORDER BY due ASC LIMIT ?",
        (bib, now_ms, limit),
    )
    return [dict(r) for r in cur.fetchall()]


def set_setting(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )
    conn.commit()


def get_setting(conn: sqlite3.Connection, key: str, default: str | None = None) -> str | None:
    cur = conn.execute("SELECT value FROM settings WHERE key=?", (key,))
    row = cur.fetchone()
    return row[0] if row else default


def append_history(conn: sqlite3.Connection, *, bib: str, event: str,
                   payload: str | dict | None = None) -> None:
    if isinstance(payload, dict):
        payload = json.dumps(payload, separators=(",", ":"))
    conn.execute(
        "INSERT INTO history (bib_id, ts, event, payload) VALUES (?, ?, ?, ?)",
        (bib, int(time.time() * 1000), event, payload),
    )
    conn.commit()
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_db.py -v
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/db.py bibmaxxing-py/tests/unit/test_db.py
git commit -m "feat(db): SQLite schema + SRS/settings/history I/O"
```

---

## Task 8: SM-2 SRS algorithm

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/srs.py`
- Test: `bibmaxxing-py/tests/unit/test_srs.py`

Port of `js/srs.js`. Standard SM-2: quality 0..5, EF starts at 2.5, EF clamped at 1.3.

- [ ] **Step 1: Write the failing test**

`tests/unit/test_srs.py`:
```python
from bibmaxxing.srs import update, SrsRecord, INITIAL_EF, MIN_EF, ONE_DAY_MS

def test_initial_record_defaults():
    r = SrsRecord()
    assert r.ef == INITIAL_EF
    assert r.interval == 0
    assert r.reps == 0

def test_first_correct_quality_3():
    r = SrsRecord()
    new = update(r, quality=3, now_ms=1_000_000)
    assert new.reps == 1
    assert new.interval == 1
    assert new.ef >= 2.36   # quality 3 nudges EF down slightly
    assert new.ef <= 2.50

def test_second_correct_quality_4():
    r = SrsRecord(reps=1, interval=1, ef=2.5)
    new = update(r, quality=4, now_ms=1_000_000)
    assert new.reps == 2
    assert new.interval == 6  # second correct: 6 days

def test_third_correct_uses_interval_times_ef():
    r = SrsRecord(reps=2, interval=6, ef=2.5)
    new = update(r, quality=4, now_ms=1_000_000)
    assert new.reps == 3
    assert new.interval == 15  # round(6 * 2.5)

def test_quality_below_3_resets_reps_and_interval():
    r = SrsRecord(reps=5, interval=20, ef=2.5)
    new = update(r, quality=2, now_ms=1_000_000)
    assert new.reps == 0
    assert new.interval == 1
    # EF still adjusts downward
    assert new.ef < 2.5

def test_ef_floor_at_1_3():
    r = SrsRecord(ef=1.3)
    new = update(r, quality=0, now_ms=1_000_000)
    assert new.ef == MIN_EF

def test_due_ms_advances_by_interval_days():
    r = SrsRecord(ef=2.5)
    now = 1_000_000
    new = update(r, quality=4, now_ms=now)
    assert new.due == now + new.interval * ONE_DAY_MS

def test_invalid_quality_raises():
    import pytest
    r = SrsRecord()
    for q in (-1, 6, 100):
        with pytest.raises(ValueError):
            update(r, quality=q, now_ms=0)
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/unit/test_srs.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `srs.py`**

```python
"""SM-2 spaced repetition. Port of js/srs.js. See spec §6.1."""
from __future__ import annotations
from dataclasses import dataclass

INITIAL_EF = 2.5
MIN_EF = 1.3
ONE_DAY_MS = 86_400_000


@dataclass(slots=True)
class SrsRecord:
    ef: float = INITIAL_EF
    interval: int = 0     # days until next review
    reps: int = 0         # consecutive successful reviews
    due: int = 0          # unix ms; 0 means "due now"
    last_q: int | None = None
    last_at: int | None = None


def update(r: SrsRecord, *, quality: int, now_ms: int) -> SrsRecord:
    """Return a new SrsRecord with SM-2 update applied.

    quality: 0..5 (0=blackout, 3=correct with effort, 5=perfect recall)
    """
    if not (0 <= quality <= 5):
        raise ValueError(f"quality must be 0..5, got {quality}")

    # EF update (always, even on failure)
    new_ef = r.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if new_ef < MIN_EF:
        new_ef = MIN_EF

    if quality < 3:
        # Failure: reset reps + interval
        new_reps = 0
        new_interval = 1
    else:
        new_reps = r.reps + 1
        if new_reps == 1:
            new_interval = 1
        elif new_reps == 2:
            new_interval = 6
        else:
            new_interval = round(r.interval * new_ef)

    new_due = now_ms + new_interval * ONE_DAY_MS

    return SrsRecord(
        ef=round(new_ef, 4),
        interval=new_interval,
        reps=new_reps,
        due=new_due,
        last_q=quality,
        last_at=now_ms,
    )
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_srs.py -v
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/srs.py bibmaxxing-py/tests/unit/test_srs.py
git commit -m "feat(srs): SM-2 algorithm port from js/srs.js"
```

---

## Task 9: Bibs loader

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/bibs.py`
- Test: `bibmaxxing-py/tests/unit/test_bibs.py`

Reads `data/bibs/<BIB>/questions.json`. Returns list of card dicts.

- [ ] **Step 1: Write the failing test**

`tests/unit/test_bibs.py`:
```python
import json
from pathlib import Path
import pytest
from bibmaxxing import bibs

@pytest.fixture
def fake_data_root(tmp_path):
    """Build a fake data/bibs/CWT-X/questions.json layout."""
    bib_dir = tmp_path / "bibs" / "CWT-X"
    bib_dir.mkdir(parents=True)
    (bib_dir / "questions.json").write_text(json.dumps([
        {"id": "q1", "stem": "What is OSI L4?", "choices": ["A","B","C","D"], "answer": 0},
        {"id": "q2", "stem": "...?", "choices": ["A","B"], "answer": 1},
    ]))
    return tmp_path

def test_list_bibs(fake_data_root):
    found = bibs.list_bibs(data_root=fake_data_root)
    assert "CWT-X" in found

def test_load_bib_returns_cards(fake_data_root):
    cards = bibs.load_bib("CWT-X", data_root=fake_data_root)
    assert len(cards) == 2
    assert cards[0]["id"] == "q1"

def test_load_missing_bib_raises(fake_data_root):
    with pytest.raises(FileNotFoundError):
        bibs.load_bib("NOPE", data_root=fake_data_root)

def test_load_existing_cwt_e7(tmp_path):
    """Smoke check against the real on-disk Bib (skips if absent)."""
    real_root = Path(__file__).resolve().parents[3].parent / "data"
    if not (real_root / "bibs" / "CWT-E7" / "questions.json").exists():
        pytest.skip("Real CWT-E7 Bib not present in this checkout")
    cards = bibs.load_bib("CWT-E7", data_root=real_root)
    assert len(cards) > 100   # 461 at time of plan, shouldn't drop drastically
    # Sanity-check shape
    c0 = cards[0]
    assert "id" in c0 and "stem" in c0 and "choices" in c0
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/unit/test_bibs.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `bibs.py`**

```python
"""Bib loader. See spec §6.1."""
from __future__ import annotations
import json
import logging
from pathlib import Path
from . import paths

log = logging.getLogger(__name__)


def list_bibs(*, data_root: Path | None = None) -> list[str]:
    """List Bib IDs (subdirectory names of data/bibs/)."""
    root = (data_root or paths.data_root()) / "bibs"
    if not root.exists():
        return []
    return sorted(p.name for p in root.iterdir() if p.is_dir())


def load_bib(bib_id: str, *, data_root: Path | None = None) -> list[dict]:
    """Load and return the list of card dicts for the given Bib."""
    root = (data_root or paths.data_root()) / "bibs" / bib_id
    qfile = root / "questions.json"
    if not qfile.exists():
        raise FileNotFoundError(f"questions.json not found at {qfile}")
    with qfile.open(encoding="utf-8") as f:
        cards = json.load(f)
    log.info("bib_loaded bib=%s cards=%d", bib_id, len(cards))
    return cards
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_bibs.py -v
```

Expected: 4 passed (3 always; the 4th may skip if you're running outside the FIRSTDIMENSION repo).

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/bibs.py bibmaxxing-py/tests/unit/test_bibs.py
git commit -m "feat(bibs): list_bibs + load_bib reading existing data/bibs/"
```

---

## Task 10: Card queue (next-due selection)

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/queue.py`
- Test: `bibmaxxing-py/tests/unit/test_queue.py`

Glue layer between `srs.py`, `db.py`, and `bibs.py`: picks the next card to show.

- [ ] **Step 1: Write the failing test**

`tests/unit/test_queue.py`:
```python
import pytest
from bibmaxxing import db, queue

@pytest.fixture
def tmp_db(tmp_path):
    return db.connect(tmp_path / "test.db")

@pytest.fixture
def cards():
    return [
        {"id": "q1", "stem": "Q1", "choices": ["A","B"], "answer": 0},
        {"id": "q2", "stem": "Q2", "choices": ["A","B"], "answer": 1},
        {"id": "q3", "stem": "Q3", "choices": ["A","B"], "answer": 0},
    ]

def test_next_card_picks_unseen_first(tmp_db, cards):
    """No SRS state for any card → return the first card in the list."""
    nxt = queue.next_card(tmp_db, bib="CWT", cards=cards, now_ms=1_000_000)
    assert nxt is not None
    assert nxt["id"] == "q1"

def test_next_card_picks_due_card(tmp_db, cards):
    # Seed q1 with future due, q2 already due
    db.upsert_srs(tmp_db, bib="CWT", q_id="q1", ef=2.5, interval=10, reps=2,
                  due=1_000_000 + 10*86_400_000, last_q=4, last_at=1_000_000)
    db.upsert_srs(tmp_db, bib="CWT", q_id="q2", ef=2.5, interval=1, reps=1,
                  due=900_000, last_q=4, last_at=800_000)
    db.upsert_srs(tmp_db, bib="CWT", q_id="q3", ef=2.5, interval=10, reps=2,
                  due=1_000_000 + 10*86_400_000, last_q=4, last_at=1_000_000)
    nxt = queue.next_card(tmp_db, bib="CWT", cards=cards, now_ms=1_000_000)
    assert nxt["id"] == "q2"

def test_next_card_returns_none_when_nothing_due(tmp_db, cards):
    # All cards far in future
    for c in cards:
        db.upsert_srs(tmp_db, bib="CWT", q_id=c["id"], ef=2.5, interval=10, reps=2,
                      due=1_000_000 + 10*86_400_000, last_q=4, last_at=1_000_000)
    assert queue.next_card(tmp_db, bib="CWT", cards=cards, now_ms=1_000_000) is None

def test_record_answer_updates_db_and_state(tmp_db, cards):
    # First answer: q1 with quality 4
    queue.record_answer(tmp_db, bib="CWT", q_id="q1", quality=4, now_ms=1_000_000)
    state = db.read_srs(tmp_db, bib="CWT", q_id="q1")
    assert state is not None
    assert state["reps"] == 1
    assert state["last_q"] == 4
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest tests/unit/test_queue.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement `queue.py`**

```python
"""Card queue: pick next due card; record answer back into DB."""
from __future__ import annotations
import logging
from sqlite3 import Connection
from . import db as db_mod
from . import srs as srs_mod

log = logging.getLogger(__name__)


def next_card(conn: Connection, *, bib: str, cards: list[dict], now_ms: int) -> dict | None:
    """Return the next card to show, or None if nothing's due.

    Strategy: if any card has no SRS row, show it (new card). Otherwise pick
    the oldest-due card from the SRS-state table.
    """
    if not cards:
        return None
    by_id = {c["id"]: c for c in cards}

    # 1) any unseen card?
    seen_ids = {row["question_id"] for row in conn.execute(
        "SELECT question_id FROM srs_state WHERE bib_id=?", (bib,)
    )}
    for c in cards:
        if c["id"] not in seen_ids:
            return c

    # 2) oldest-due
    rows = db_mod.read_due(conn, bib=bib, now_ms=now_ms, limit=1)
    if not rows:
        return None
    qid = rows[0]["question_id"]
    return by_id.get(qid)


def record_answer(conn: Connection, *, bib: str, q_id: str, quality: int, now_ms: int) -> None:
    """Apply SM-2 update and persist."""
    existing = db_mod.read_srs(conn, bib=bib, q_id=q_id)
    if existing:
        prev = srs_mod.SrsRecord(
            ef=existing["ef"], interval=existing["interval"], reps=existing["reps"],
            due=existing["due"], last_q=existing["last_q"], last_at=existing["last_at"],
        )
    else:
        prev = srs_mod.SrsRecord()

    nxt = srs_mod.update(prev, quality=quality, now_ms=now_ms)
    db_mod.upsert_srs(
        conn, bib=bib, q_id=q_id,
        ef=nxt.ef, interval=nxt.interval, reps=nxt.reps, due=nxt.due,
        last_q=nxt.last_q, last_at=nxt.last_at,
    )
    db_mod.append_history(
        conn, bib=bib, event="answer",
        payload={"q": q_id, "quality": quality, "ef": nxt.ef, "interval": nxt.interval},
    )
    log.info("answered bib=%s q=%s quality=%d ef=%.2f interval=%dd",
             bib, q_id, quality, nxt.ef, nxt.interval)
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/unit/test_queue.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/queue.py bibmaxxing-py/tests/unit/test_queue.py
git commit -m "feat(queue): next-card selection + record_answer glue"
```

---

## Task 11: Quad vertex shader + aurora fragment shader

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/render/__init__.py` (empty)
- Create: `bibmaxxing-py/src/bibmaxxing/render/shaders/quad.vert`
- Create: `bibmaxxing-py/src/bibmaxxing/render/shaders/aurora.frag`

Aurora is a curl-noise-driven gradient between Navy and goldenrod.

- [ ] **Step 1: Write `quad.vert`**

```glsl
#version 330

in vec2 in_position;
out vec2 v_uv;

void main() {
    // in_position is a unit-quad in [-1, 1]
    v_uv = (in_position + 1.0) * 0.5;  // map to [0, 1]
    gl_Position = vec4(in_position, 0.0, 1.0);
}
```

- [ ] **Step 2: Write `aurora.frag`**

```glsl
#version 330

in vec2 v_uv;
out vec4 frag_color;

uniform float u_time;        // seconds since launch
uniform float u_mood;        // 0..1, lerped from AppState
uniform float u_intensity;   // 0..1, mode-pack multiplier
uniform vec4  u_palette_a;   // Navy (low mood)
uniform vec4  u_palette_b;   // Goldenrod (high mood)

// Cheap 2D hash + smooth noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smooth_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * smooth_noise(p);
        p *= 2.02;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 p = v_uv * 3.0;
    p.x += u_time * 0.05;
    p.y += u_time * 0.03;

    float n = fbm(p + fbm(p + u_time * 0.07) * 0.5);
    n = pow(n, 1.4);

    // base color from mood
    vec4 base = mix(u_palette_a, u_palette_b, u_mood);
    // amplitude scaled by intensity
    float amp = mix(0.4, 1.0, u_intensity);
    vec4 col = mix(u_palette_a * 0.8, base, n * amp);

    // soft vignette so edges read as "room"
    vec2 c = v_uv - 0.5;
    float vig = 1.0 - smoothstep(0.5, 0.95, length(c));
    col.rgb *= vig;

    frag_color = vec4(col.rgb, 1.0);
}
```

- [ ] **Step 3: Create `render/__init__.py`**

```python
"""Render pipeline modules — pyglet+ModernGL. See spec §5."""
```

- [ ] **Step 4: Smoke-check the shader syntax with a tiny script**

```bash
cd bibmaxxing-py
python -c "
import moderngl
ctx = moderngl.create_standalone_context()
vert = open('src/bibmaxxing/render/shaders/quad.vert').read()
frag = open('src/bibmaxxing/render/shaders/aurora.frag').read()
prog = ctx.program(vertex_shader=vert, fragment_shader=frag)
print('Aurora shader compiled OK; uniforms:', list(prog._members.keys())[:8])
"
```

Expected: prints uniform names including `u_time`, `u_mood`, `u_intensity`, `u_palette_a`, `u_palette_b`. No GLSL errors.

If the standalone context fails (some headless Linux without GL): skip this step and verify in Task 13's full-window run.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/render/__init__.py bibmaxxing-py/src/bibmaxxing/render/shaders/quad.vert bibmaxxing-py/src/bibmaxxing/render/shaders/aurora.frag
git commit -m "feat(render): quad vertex shader + aurora fragment shader"
```

---

## Task 12: Aurora system (Python wrapper around the shader)

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/render/aurora.py`

(No unit test — render code is covered by smoke run in Task 13 + future golden-image tests in Plan 6.)

- [ ] **Step 1: Implement `aurora.py`**

```python
"""Aurora fragment-shader wrapper. See spec §5."""
from __future__ import annotations
import logging
from pathlib import Path
import moderngl
import numpy as np
from .. import theme

log = logging.getLogger(__name__)

SHADER_DIR = Path(__file__).resolve().parent / "shaders"


class Aurora:
    """Renders the aurora background to whatever framebuffer is currently bound."""

    def __init__(self, ctx: moderngl.Context):
        self.ctx = ctx
        vert = (SHADER_DIR / "quad.vert").read_text()
        frag = (SHADER_DIR / "aurora.frag").read_text()
        self.prog = ctx.program(vertex_shader=vert, fragment_shader=frag)
        log.info("aurora shader_compiled uniforms=%d",
                 sum(1 for _ in self.prog))

        # Fullscreen quad: two triangles spanning [-1, 1] in NDC
        verts = np.array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ], dtype="f4")
        ibo = np.array([0, 1, 2, 1, 3, 2], dtype="i4")

        self.vbo = ctx.buffer(verts.tobytes())
        self.ibo = ctx.buffer(ibo.tobytes())
        self.vao = ctx.vertex_array(
            self.prog,
            [(self.vbo, "2f", "in_position")],
            self.ibo,
        )

    def render(self, *, time_s: float, mood: float, intensity: float) -> None:
        self.prog["u_time"].value = time_s
        self.prog["u_mood"].value = mood
        self.prog["u_intensity"].value = intensity
        self.prog["u_palette_a"].value = theme.NAVY_DEEP
        self.prog["u_palette_b"].value = theme.GOLDENROD
        self.vao.render(moderngl.TRIANGLES)
```

- [ ] **Step 2: Sanity import**

```bash
python -c "from bibmaxxing.render.aurora import Aurora; print('Aurora module OK')"
```

Expected: `Aurora module OK`.

- [ ] **Step 3: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/render/aurora.py
git commit -m "feat(render): Aurora wrapper class around the shader"
```

---

## Task 13: Pyglet window + minimal render loop

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/app.py`

This is the first **runnable** piece. Opens window, runs aurora, exits cleanly.

- [ ] **Step 1: Implement `app.py`**

```python
"""Pyglet window + main loop. See spec §4.3 and §5."""
from __future__ import annotations
import logging
import time
import pyglet
import moderngl
from .render.aurora import Aurora
from .state import AppState, lerp_mood, apply_event
from . import theme

log = logging.getLogger(__name__)

DEFAULT_W, DEFAULT_H = 1280, 800


class BibmaxxingWindow(pyglet.window.Window):
    def __init__(self, state: AppState, *, low_power: bool = False):
        config = pyglet.gl.Config(double_buffer=True, depth_size=24, major_version=3, minor_version=3)
        super().__init__(width=DEFAULT_W, height=DEFAULT_H, caption="Bibmaxxing",
                         resizable=True, config=config)
        self.state = state
        self.low_power = low_power

        # ModernGL on top of pyglet's GL context
        self.ctx = moderngl.create_context()
        self.ctx.enable(moderngl.BLEND)
        self.ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA

        self.aurora = Aurora(self.ctx)
        self.t0 = time.monotonic()

        self.fps_label = pyglet.text.Label(
            "", font_name=theme.FONT_DEFAULT, font_size=theme.FONT_SMALL,
            x=12, y=12, color=theme.rgba_to_pyglet(theme.TEXT_DIM),
        )

        # 60 fps tick
        pyglet.clock.schedule_interval(self.on_tick, 1.0 / 60.0)
        log.info("window_open w=%d h=%d low_power=%s", DEFAULT_W, DEFAULT_H, low_power)

    def on_tick(self, dt: float) -> None:
        lerp_mood(self.state, dt)

    def on_draw(self) -> None:
        self.clear()
        self.ctx.viewport = (0, 0, self.width, self.height)
        # Aurora pass: render directly to the default framebuffer for now.
        # Plan 5 adds the FBO chain + post-processing.
        t = time.monotonic() - self.t0
        self.aurora.render(time_s=t, mood=self.state.mood, intensity=self.state.intensity)
        # FPS overlay (debug)
        self.fps_label.text = f"mood={self.state.mood:.2f} streak={self.state.streak}"
        self.fps_label.draw()

    def on_resize(self, w: int, h: int) -> None:
        super().on_resize(w, h)
        self.ctx.viewport = (0, 0, w, h)

    def on_key_press(self, symbol: int, modifiers: int) -> None:
        # Wired up properly in Task 14 for flashcards
        if symbol == pyglet.window.key.ESCAPE:
            self.dispatch_event("on_close")
        # Demo keys: c=correct, w=wrong, so we can see the aurora react
        elif symbol == pyglet.window.key.C:
            apply_event(self.state, "correct")
            log.debug("demo correct mood_target=%.2f", self.state.mood_target)
        elif symbol == pyglet.window.key.W:
            apply_event(self.state, "wrong")
            log.debug("demo wrong mood_target=%.2f", self.state.mood_target)


def run(state: AppState, *, low_power: bool = False) -> None:
    BibmaxxingWindow(state, low_power=low_power)
    pyglet.app.run()
```

- [ ] **Step 2: Verify import**

```bash
python -c "from bibmaxxing.app import run; print('app OK')"
```

Expected: `app OK`.

- [ ] **Step 3: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/app.py
git commit -m "feat(app): Pyglet window + ModernGL ctx + aurora render"
```

---

## Task 14: CLI entry point + first run

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/__main__.py`

- [ ] **Step 1: Implement `__main__.py`**

```python
"""Entry point: `python -m bibmaxxing`. See spec §10.5 + §4.3."""
from __future__ import annotations
import argparse
import logging
import sys
from . import paths, log_setup
from .state import AppState
from . import app as app_mod

log = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="bibmaxxing", description="Bibmaxxing-Py study tool")
    p.add_argument("--verbose", action="store_true", help="enable DEBUG logging")
    p.add_argument("--quiet", action="store_true", help="WARNING-only logging")
    p.add_argument("--log-level", default=None,
                   choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])
    p.add_argument("--log-file", default=None, help="override log file path")
    p.add_argument("--low-power", action="store_true",
                   help="disable post-processing, cap particles (weak GPUs)")
    p.add_argument("--dev", action="store_true",
                   help="dev mode: shader hot-reload + console mirror")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    paths.ensure_user_dir()

    # Resolve log level
    if args.verbose:
        level = "DEBUG"
    elif args.quiet:
        level = "WARNING"
    elif args.log_level:
        level = args.log_level
    else:
        level = "INFO"

    log_file = args.log_file or paths.log_path()
    log_setup.setup(level=level, log_file=log_file, mirror_to_console=args.dev)

    log.info("startup version=0.1.0 level=%s low_power=%s dev=%s",
             level, args.low_power, args.dev)

    state = AppState()
    try:
        app_mod.run(state, low_power=args.low_power)
    except Exception:
        log.critical("uncaught exception", exc_info=True)
        return 2
    log.info("shutdown clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run the app**

```bash
cd bibmaxxing-py
python -m bibmaxxing --verbose
```

Expected:
- A 1280×800 window opens with a flowing Navy/goldenrod aurora background.
- Bottom-left shows `mood=0.50 streak=0`.
- Press `C` repeatedly → mood climbs toward 1.0, aurora warms toward goldenrod.
- Press `W` → mood drops, aurora cools toward navy.
- Press `Esc` → window closes cleanly.
- `~/.bibmaxxing/log.txt` has new lines including `startup`, `window_open`, `aurora shader_compiled`.

If the window opens with a black or missing aurora: shader compile failed; check stderr in `--dev` and the log file.

- [ ] **Step 3: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/__main__.py
git commit -m "feat(cli): entry point with --verbose/--low-power/--dev flags"
```

**🎉 Milestone:** End of Task 14 — Python app runs, aurora pulses with state, logging works. Visual foundation is live.

---

## Task 15: Flashcards view (minimal — text labels, no widgets)

**Files:**
- Create: `bibmaxxing-py/src/bibmaxxing/views/__init__.py` (empty)
- Create: `bibmaxxing-py/src/bibmaxxing/views/flashcards.py`
- Modify: `bibmaxxing-py/src/bibmaxxing/app.py`

Now we wire data through. Cards from CWT-E7, SRS state in SQLite, drilling actually works. No widget toolkit yet — just `pyglet.text.Label`.

- [ ] **Step 1: Create empty `views/__init__.py`**

```python
"""View modules — one per top-level navigation target."""
```

- [ ] **Step 2: Implement `views/flashcards.py`**

```python
"""Minimal flashcards view (Plan 1). Spec §7.2.

No widget toolkit yet; uses pyglet.text.Label directly. Plan 2 replaces this
view with a widget-based version once the toolkit exists.
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

log = logging.getLogger(__name__)


class FlashcardsView:
    """Owns the on-screen labels + key handling for drilling.

    Lifecycle: instantiate with (window, state, conn, cards, bib_id) when entering
    the view; call dispose() when leaving. Render each frame via render().
    Forward key presses via on_key_press().
    """

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
        dim_color  = theme.rgba_to_pyglet(theme.TEXT_DIM)

        self.stem_label = pyglet.text.Label(
            "", font_name=theme.FONT_DEFAULT, font_size=theme.FONT_HEADING,
            x=window.width // 2, y=window.height // 2 + 60,
            anchor_x="center", anchor_y="center", color=text_color,
            multiline=True, width=int(window.width * 0.7), align="center",
        )
        self.choices_label = pyglet.text.Label(
            "", font_name=theme.FONT_DEFAULT, font_size=theme.FONT_BODY,
            x=window.width // 2, y=window.height // 2 - 40,
            anchor_x="center", anchor_y="top", color=text_color,
            multiline=True, width=int(window.width * 0.7), align="center",
        )
        self.status_label = pyglet.text.Label(
            "", font_name=theme.FONT_DEFAULT, font_size=theme.FONT_SMALL,
            x=window.width // 2, y=24,
            anchor_x="center", anchor_y="bottom", color=dim_color,
        )
        self.message_label = pyglet.text.Label(
            "", font_name=theme.FONT_DEFAULT, font_size=theme.FONT_SMALL,
            x=window.width // 2, y=window.height - 40,
            anchor_x="center", anchor_y="top", color=dim_color,
        )
        self._labels = (self.stem_label, self.choices_label, self.status_label, self.message_label)

        self._next_card()

    def dispose(self) -> None:
        for lbl in self._labels:
            lbl.delete()

    def _next_card(self) -> None:
        now = int(time.time() * 1000)
        self.current = queue.next_card(self.conn, bib=self.bib_id, cards=self.cards, now_ms=now)
        self.revealed = False
        if self.current is None:
            self.stem_label.text = "🌟 Nothing due. Come back later, Chief."
            self.choices_label.text = ""
            self.message = ""
            self._update_status()
            return
        self.stem_label.text = self.current["stem"]
        self.choices_label.text = ""  # hidden until reveal
        self._update_status()
        log.info("card_shown bib=%s q=%s", self.bib_id, self.current["id"])

    def _reveal(self) -> None:
        if self.current is None or self.revealed:
            return
        self.revealed = True
        choices = self.current.get("choices", [])
        answer_idx = self.current.get("answer", 0)
        lines = []
        for i, c in enumerate(choices):
            marker = "✓" if i == answer_idx else " "
            lines.append(f"{i+1}. {marker} {c}")
        # Add explanation if present
        expl = self.current.get("explanation", "")
        if expl:
            lines.append("")
            lines.append(expl)
        self.choices_label.text = "\n".join(lines)
        self._update_status()

    def _grade(self, quality: int) -> None:
        if self.current is None or not self.revealed:
            return
        now = int(time.time() * 1000)
        queue.record_answer(self.conn, bib=self.bib_id, q_id=self.current["id"],
                            quality=quality, now_ms=now)
        # Mood event
        apply_event(self.state, "correct" if quality >= 3 else "wrong")
        self.message = f"Graded {quality}.  Streak: {self.state.streak}."
        self._next_card()

    def _update_status(self) -> None:
        ctx = BindingContext.DRILLING_REVEALED if self.revealed else BindingContext.DRILLING_HIDDEN
        self.status_label.text = keybindings.status_bar_for(ctx)
        self.message_label.text = self.message

    def render(self) -> None:
        for lbl in self._labels:
            lbl.draw()

    def on_key_press(self, symbol: int, modifiers: int) -> bool:
        """Return True if consumed."""
        if symbol in (key.SPACE, key.ENTER):
            self._reveal()
            return True
        if symbol == key.N and not self.revealed:
            self._next_card()
            return True
        if self.revealed:
            grade_map = {key._1: 1, key._2: 2, key._3: 3, key._4: 4, key._5: 5}
            if symbol in grade_map:
                self._grade(grade_map[symbol])
                return True
        return False

    def on_resize(self, w: int, h: int) -> None:
        self.stem_label.x = w // 2
        self.stem_label.y = h // 2 + 60
        self.stem_label.width = int(w * 0.7)
        self.choices_label.x = w // 2
        self.choices_label.y = h // 2 - 40
        self.choices_label.width = int(w * 0.7)
        self.status_label.x = w // 2
        self.message_label.x = w // 2
        self.message_label.y = h - 40
```

- [ ] **Step 3: Modify `app.py` to host the FlashcardsView**

Replace the existing `app.py` body with this expanded version (additions marked with `# NEW`):

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
from . import paths, db as db_mod, bibs as bibs_mod   # NEW
from .views.flashcards import FlashcardsView           # NEW

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

        # NEW: open DB + load bib + spin up flashcards view
        self.conn = db_mod.connect(paths.db_path())
        self.cards = bibs_mod.load_bib(bib_id)
        self.view = FlashcardsView(self, state, self.conn, self.cards, bib_id)

        pyglet.clock.schedule_interval(self.on_tick, 1.0 / 60.0)
        log.info("window_open bib=%s cards=%d low_power=%s", bib_id, len(self.cards), low_power)

    def on_tick(self, dt: float) -> None:
        lerp_mood(self.state, dt)

    def on_draw(self) -> None:
        self.clear()
        self.ctx.viewport = (0, 0, self.width, self.height)
        t = time.monotonic() - self.t0
        self.aurora.render(time_s=t, mood=self.state.mood, intensity=self.state.intensity)
        self.view.render()    # NEW

    def on_resize(self, w: int, h: int) -> None:
        super().on_resize(w, h)
        self.ctx.viewport = (0, 0, w, h)
        if hasattr(self, "view"):
            self.view.on_resize(w, h)   # NEW

    def on_key_press(self, symbol: int, modifiers: int) -> None:
        if symbol == pyglet.window.key.ESCAPE:
            self.dispatch_event("on_close")
            return
        if self.view.on_key_press(symbol, modifiers):    # NEW
            return

    def on_close(self) -> None:
        log.info("window_close")
        if hasattr(self, "view"):
            self.view.dispose()
        if hasattr(self, "conn"):
            self.conn.close()
        super().on_close()


def run(state: AppState, *, low_power: bool = False, bib_id: str = "CWT-E7") -> None:
    BibmaxxingWindow(state, low_power=low_power, bib_id=bib_id)
    pyglet.app.run()
```

- [ ] **Step 4: Run the app and drill**

```bash
cd bibmaxxing-py
python -m bibmaxxing --verbose
```

Expected:
- Aurora background drifting.
- A real CWT-E7 question's stem appears centered, large.
- Status bar at bottom shows: `Space Reveal  ·  N Skip  ·  ? Help`.
- Press `Space` → choices appear with `✓` next to the correct one + the explanation.
- Status bar updates: `1 Again  ·  2 Hard  ·  3 Good  ·  4 Easy  ·  5 Perfect  ·  ? Help`.
- Press `3` → next card appears, "Graded 3. Streak: 1." flashes near the top, aurora warms slightly.
- Press `1` → next card, streak resets, aurora cools slightly.
- Close window. Reopen via `python -m bibmaxxing`. The card you just answered is **not** the first one shown again immediately (it's been pushed forward by the SRS interval).

Sanity-check the database:
```bash
python -c "
import sqlite3
import os
home = os.environ.get('USERPROFILE') or os.environ.get('HOME')
c = sqlite3.connect(home + '/.bibmaxxing/state.db')
print('rows:', c.execute('SELECT COUNT(*) FROM srs_state').fetchone()[0])
print(c.execute('SELECT * FROM srs_state LIMIT 3').fetchall())
"
```

Expected: row count > 0; columns include `bib_id, question_id, ef, interval, reps, due, last_q, last_at`.

- [ ] **Step 5: Commit**

```bash
git add bibmaxxing-py/src/bibmaxxing/views/__init__.py bibmaxxing-py/src/bibmaxxing/views/flashcards.py bibmaxxing-py/src/bibmaxxing/app.py
git commit -m "feat(view): minimal flashcards drilling view; aurora reacts to grades"
```

**🎉 End-of-plan milestone:** Drilling works. Aurora reacts to right/wrong. SRS state persists. Logging captures every answer. Foundation is in place for Plans 2-7.

---

## Plan-1 Verification Checklist

After all 15 tasks complete, run this end-to-end:

- [ ] `pytest` from `bibmaxxing-py/` reports all green (~30+ tests across 6 test modules).
- [ ] `python -m bibmaxxing --verbose` opens a 1280×800 window with the aurora.
- [ ] A CWT-E7 question stem renders centered.
- [ ] `Space` reveals choices + explanation; status bar swaps to grade keys.
- [ ] `1`-`5` grades the card and advances; mood reactivity is visible (aurora warms on `3`-`5`, cools on `1`-`2`).
- [ ] Streak counter visible in mood readout (or via subsequent card's "Streak: N" message).
- [ ] `Esc` closes the window cleanly; no traceback.
- [ ] Re-launch shows different cards in different order (SRS state persisted).
- [ ] `~/.bibmaxxing/log.txt` contains `startup`, `bib_loaded`, `card_shown`, `answered` lines in K=V format.
- [ ] `~/.bibmaxxing/state.db` is a valid SQLite file with rows in `srs_state` and `history`.

If all green: Plan 1 is done. Proceed to Plan 2 (widget toolkit) when ready.

If anything is red: fix the failing task before moving on. Common gotchas:
- ModernGL context creation fails on some integrated GPUs → install latest GPU driver, or run with software rendering env vars.
- Pyglet font loading: if "Inter" / "JetBrains Mono" aren't installed, pyglet falls back silently (Plan 7 bundles them).
- Encoding: ensure all source files saved as UTF-8 (Windows defaults can bite).

---

## Known gaps (deferred to later plans, by design)

Plan 1 deliberately does **not** ship the following spec items — they belong to later plans:

| Spec section | Item | Lands in |
|---|---|---|
| §5 | Full 4-pass FBO chain (aurora pass + particles + UI + post). Plan 1 renders aurora directly to the default framebuffer; UI labels draw on top. | Plan 5 (tier-C polish) |
| §5.4 | Mode-pack tweening between drilling and library modes. | Plan 3 (when library mode lands) |
| §7 | Widget toolkit (`FocusManager`, `Button`, `ScrollView`, `Modal`, `TextInput`). Plan 1 uses raw `pyglet.text.Label` for the flashcards view. | Plan 2 |
| §7.3 | Inline `[Key]` labels next to interactive elements + `?` keymap overlay. | Plan 2 |
| §8 | Markdown rendering (`MarkdownView`) and library mode. | Plan 3 |
| §6.4 | Import/export bridge with the JS web app. | Plan 6 |
| §6.5 | Dev-mode shader/MD file watcher. | Plan 7 |
| §9 (partial) | DB integrity-check on `db.connect()` with rename-and-rebuild on failure. Plan 1 ships the `integrity_check()` function but does not wire it into the connect path. | Plan 6 |
| §10.8 | Crash-dump `crash-<ts>.json` writer. Plan 1 logs CRITICAL on uncaught exception but does not produce the JSON dump. | Plan 6 |
| §10.6 | Per-frame uniform-write DEBUG logging (would be too noisy without sampling). | Plan 5 (with a sampling rate) |
| §4.3 | F11 fullscreen toggle. | Plan 2 (when keyboard handling generalizes) |
| §4.3 | `--low-power` flag actually drops particles + post-processing. Plan 1 accepts the flag but has no particles or post yet. | Plan 5 |
| §11 | Headless integration test + golden-image visual regression. | Plan 6 |
| §12 | PyInstaller packaging, single-file `.exe`. | Plan 7 |
| §13 | First-run import prompt for web-app data. | Plan 6 |

Each is a deliberate scope cut — none are bugs in Plan 1.

---

## Plan-1 → Plan-2 handoff

Plan 1 produces a working but austere drilling experience. Plan 2 introduces the widget toolkit (`FocusManager`, `Button`, `ScrollView`, `Modal`, `TextInput`, `MarkdownView`) so the remaining views (Quiz, Exam, Add, References, Study Guides) have something to compose with. The minimal `FlashcardsView` from Task 15 will be **rewritten** in Plan 2 to use the proper widget toolkit.

Until Plan 2 lands, the current `FlashcardsView` is sufficient as a daily driver if you're patient about layout polish.
