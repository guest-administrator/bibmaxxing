# Bib Study Guide — Automate the Boring Stuff with Python (Sweigart) 2nd Edition

> **Bib reference:** *Automate the Boring Stuff with Python*, 2nd Edition — Al Sweigart (No Starch Press, 2019, ISBN 978-1-59327-992-9).
>
> **Regular-exam scope:** Chapter 12.
> **Substitute-exam scope:** Study topics on **debugging Python code**.
> **Union — what this guide covers:** Ch 12 (Web Scraping — `webbrowser`, `requests`, `bs4`, `selenium`) and the **debugging chapter** (Ch 11 in 2e — logging, assertions, `pdb`, IDE debuggers, rubber-duck, the `logging` module).

**Posture:** Sweigart's book teaches Python by automating real tasks. These two scopes are high-value operational — web scraping is a bread-and-butter recon technique, and debugging skill is what separates a Chief who ships working scripts from one who doesn't. Pairs with `JCAC-PROG-SCRIPT.md` (JCAC Module 9 Python coverage) and `BOOK-CPP-HTP.md` (strongly-typed contrast).

---

## Debugging Python Code (Chapter 11)

Sweigart's debugging chapter is the chapter cited by "Study debugging Python code" in the substitute Bib. The lesson: **most bugs are typos, off-by-ones, and wrong assumptions** — and you fix them by reading output, not by reading code harder.

### Exception types every Python programmer must recognize

```python
# ValueError — wrong value type passes type check but fails semantics
int("abc")                     # ValueError: invalid literal for int()

# TypeError — wrong operand types
"3" + 5                        # TypeError: can only concatenate str (not "int") to str

# NameError — reference to a name that doesn't exist
print(undefined_var)           # NameError: name 'undefined_var' is not defined

# AttributeError — attribute not on object
"hello".toUpper()              # AttributeError: 'str' object has no attribute 'toUpper'

# IndexError — out-of-range index on sequence
[1,2,3][5]                     # IndexError: list index out of range

# KeyError — missing key in dict
{"a":1}["b"]                   # KeyError: 'b'

# ZeroDivisionError
10 / 0                         # ZeroDivisionError

# FileNotFoundError — open non-existent file for reading
open("nope.txt")               # FileNotFoundError

# PermissionError — OS permission denied

# ImportError / ModuleNotFoundError — can't import

# KeyboardInterrupt — Ctrl-C
```

### Raising and catching exceptions

```python
def divide(a, b):
    if b == 0:
        raise ValueError("denominator must be non-zero")
    return a / b

try:
    result = divide(10, 0)
except ValueError as e:
    print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected: {e}")
else:
    print("Success")
finally:
    print("Cleanup runs either way")
```

### Tracebacks — reading bottom-up

A traceback's **last line** is the exception type and message. The **frames above** show the call chain, most recent at the bottom:

```
Traceback (most recent call last):
  File "script.py", line 42, in <module>
    result = compute(a, b)
  File "script.py", line 20, in compute
    return divide(x, y)
  File "script.py", line 5, in divide
    return a / b
ZeroDivisionError: division by zero
```

Reading bottom-up: the exception is `ZeroDivisionError` at line 5 inside `divide`, called by `compute` at line 20, called by `<module>` (top-level script) at line 42.

### Assertions

`assert` is for **sanity checks** of things that **should never happen** if the code is correct:

```python
def withdraw(balance, amount):
    assert amount >= 0, "amount must be non-negative"
    assert balance >= amount, f"insufficient funds: {balance} < {amount}"
    return balance - amount
```

Rules:
- `AssertionError` raised on failure, with the optional message.
- **Disabled under `python -O`** — never use assertions for validating user input (you'll lose the validation in production).
- Use for internal invariants only; use `raise ValueError(...)` for user-facing errors.

### Logging

**Never use `print()` for diagnostic output in production code.** Use the `logging` module.

```python
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)-8s %(message)s'
)

logging.debug("Entered function with x=%s", x)
logging.info("Started processing")
logging.warning("Fallback used for %s", name)
logging.error("Failed to connect to %s: %s", host, err)
logging.critical("Data corruption detected")
```

Log levels, least to most severe:

| Level | Numeric | Use |
|---|---|---|
| DEBUG | 10 | Detailed diagnostic |
| INFO | 20 | General progress |
| WARNING | 30 | Something unexpected but handled |
| ERROR | 40 | A specific operation failed |
| CRITICAL | 50 | Program cannot continue |

Advantages over `print`:
- Timestamps + levels built in.
- Can be routed to file, syslog, HTTP, custom handler.
- Easily disabled / re-enabled without editing every call site.
- Tags with module name for large codebases.

**Disable all logging:** `logging.disable(logging.CRITICAL)` (silences CRITICAL and below).

**File handler:**

```python
logging.basicConfig(filename='app.log', filemode='a', level=logging.INFO)
```

### `pdb` — the built-in debugger

Stop execution and drop into an interactive debugger:

```python
breakpoint()              # Python 3.7+
# or legacy:
import pdb; pdb.set_trace()
```

Once inside pdb:

| Command | Action |
|---|---|
| `l` / `list` | Show source around current line |
| `n` / `next` | Step over |
| `s` / `step` | Step into |
| `r` / `return` | Run until current function returns |
| `c` / `continue` | Resume until next breakpoint |
| `b <line>` | Set a breakpoint |
| `cl` | Clear breakpoints |
| `p <expr>` | Print expression |
| `pp <expr>` | Pretty-print |
| `w` / `where` | Show call stack |
| `u` / `d` | Move up / down the stack |
| `q` / `quit` | Quit the debugger |
| `h` | Help |

### IDE debuggers

- **VS Code** — set breakpoints with a click, F5 to run/debug, variables/watch panes.
- **PyCharm** — full-featured; remote-debug supports.
- **IDLE** — ships with Python; Debug menu enables stepper.

### Sweigart's debugging workflow

1. **Read the traceback carefully** — the exception type and message usually name the problem.
2. **Reproduce deterministically** — shrink the input until the bug repro is minimal.
3. **Print-debug or log-debug** — add `logging.debug(...)` calls showing variable values at suspect lines.
4. **Step with pdb / IDE** — when print isn't enough, single-step to see what's actually happening.
5. **Rubber-duck** — explain the code line-by-line to an inanimate object; bugs surface in the narration.
6. **Commit the fix + add a test** — regression tests prevent the same bug coming back.

### `try` as a control pattern — carefully

**Easier to ask forgiveness than permission (EAFP):**

```python
try:
    value = my_dict[key]
except KeyError:
    value = default
```

vs. **look before you leap (LBYL):**

```python
if key in my_dict:
    value = my_dict[key]
else:
    value = default
```

Python idiom prefers EAFP in most cases. LBYL has race conditions (key could disappear between `in` check and access in a multi-threaded context).

### Common debugging gotchas in Python

- **Mutable default argument** — `def f(a, b=[]):` — the default is shared across calls. Use `b=None` and `if b is None: b = []`.
- **Late binding in closures** — loop variables captured by reference, not value. `[lambda: i for i in range(3)]` returns three lambdas all printing `2`.
- **Integer division** — in Python 3, `/` is float division (good); `//` is floor division. In Python 2, `/` was floor division for ints (a trap).
- **Shallow vs deep copy** — `b = a.copy()` shares nested structures. Use `copy.deepcopy(a)` when needed.
- **Import cycles** — module A imports B imports A. Refactor to break the cycle.
- **`is` vs `==`** — `is` checks identity (same object); `==` checks value equality. Use `==` for strings/numbers; `is` for `None`, `True`, `False`, sentinel singletons.
- **Encoding issues** — `UnicodeDecodeError` when opening a file without the right encoding. Default is UTF-8 on Python 3 Linux/macOS; Windows sometimes defaults to CP1252.

---

## Chapter 12 — Web Scraping

Sweigart's Ch 12 is about automating the browser / fetching HTTP content / parsing HTML. The Bib scopes this entire chapter.

### The `webbrowser` module

Launches the system's default browser:

```python
import webbrowser
webbrowser.open('https://navy.mil')
```

Useful when you want a user-visible browser window. Not useful for scripted data fetching.

### `requests` — fetching HTTP resources

```python
import requests

resp = requests.get('https://httpbin.org/get')
print(resp.status_code)        # 200
print(resp.headers['Content-Type'])
print(resp.text)               # body as string
print(resp.json())             # body parsed as JSON (if applicable)
print(resp.content)            # body as bytes

# With parameters, headers, auth
resp = requests.get(
    'https://api.example.com/users',
    params={'q': 'alice'},
    headers={'User-Agent': 'MyScript/1.0'},
    auth=('user', 'pass'),
    timeout=10,
)

# POST form or JSON
r = requests.post('https://httpbin.org/post', data={'key': 'value'})
r = requests.post('https://api.example.com/item', json={'name': 'sample'})

# Raise for status codes
resp.raise_for_status()        # raises HTTPError for 4xx/5xx
```

Common response codes to handle:

| Code | Meaning |
|---|---|
| 200 | OK |
| 301 / 302 | Redirect (requests follows by default) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 / 502 / 503 | Server error |

### Downloading large files

```python
resp = requests.get(url, stream=True)
resp.raise_for_status()
with open('file.zip', 'wb') as f:
    for chunk in resp.iter_content(chunk_size=65536):
        f.write(chunk)
```

### `bs4` — BeautifulSoup HTML parsing

```python
from bs4 import BeautifulSoup
import requests

resp = requests.get('https://example.com')
soup = BeautifulSoup(resp.text, 'html.parser')

# Navigation
soup.title.string              # <title>'s text
soup.find('h1').text
soup.find_all('a')             # all <a> tags

# CSS selectors
links = soup.select('a.nav-link')
first_paragraph = soup.select_one('article p')

# Attributes
for a in soup.find_all('a'):
    print(a.get('href'), a.text)
```

**Parsers available:** `'html.parser'` (stdlib), `'lxml'` (fast, needs package), `'html5lib'` (lenient, matches browser behavior).

### CSS selector syntax quick reference

| Selector | Matches |
|---|---|
| `tag` | All elements of that tag |
| `.class` | Elements with class |
| `#id` | Element with id |
| `tag.class` | Tag with class |
| `parent > child` | Direct children |
| `ancestor descendant` | Descendants at any depth |
| `tag[attr]` | Has attribute |
| `tag[attr="value"]` | Attribute equals |
| `tag[attr^="prefix"]` | Attribute starts with |
| `tag[attr$="suffix"]` | Attribute ends with |
| `tag[attr*="substring"]` | Attribute contains |
| `tag:first-child` | First child |
| `tag:nth-child(n)` | Nth child |

### Selenium — full browser automation

For pages that require JavaScript execution, login flows, or interactive clicking:

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()                 # or Firefox(), Edge()
driver.get('https://example.com/login')

# Find elements
user_field = driver.find_element(By.ID, 'username')
pass_field = driver.find_element(By.NAME, 'password')
login_btn  = driver.find_element(By.CSS_SELECTOR, 'button[type=submit]')

# Interact
user_field.send_keys('alice')
pass_field.send_keys('hunter2')
login_btn.click()

# Wait for navigation
WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.ID, 'dashboard'))
)

# Scrape
print(driver.page_source)
print(driver.title)

# Clean up
driver.quit()
```

Key Selenium concepts:

- **Driver** — starts a real browser (Chrome / Firefox / Edge / Safari).
- **By** — element-locator strategies: `ID`, `NAME`, `CLASS_NAME`, `TAG_NAME`, `LINK_TEXT`, `PARTIAL_LINK_TEXT`, `CSS_SELECTOR`, `XPATH`.
- **Waits:**
  - Implicit wait — `driver.implicitly_wait(10)` applies to every find.
  - Explicit wait — `WebDriverWait + expected_conditions` for specific conditions.
- **Actions** — `click()`, `send_keys()`, `clear()`, `submit()`.
- **JavaScript execution** — `driver.execute_script("return document.title")`.
- **Headless mode** — `options.add_argument("--headless")` runs without a visible window (for servers / CI).

### Ethics and legality of scraping

Sweigart notes, and the Chief needs to recognize:

- Check **robots.txt** — site's scraping policy (not binding law, but a signal).
- Respect **rate limits** — `time.sleep()` between requests; don't hammer a server.
- Obey **Terms of Service** — scraping in violation can be a contract breach and in some jurisdictions CFAA exposure.
- **User-Agent string** — identify your tool honestly; some sites accept that as a policy handshake.
- **API first** — if the site offers a JSON API, use it instead of parsing HTML.

### Scraping pitfalls

- **Selectors brittle** — HTML structure changes; prefer semantic attributes (IDs, data-attributes) over deep tag chains.
- **JavaScript-rendered content** — `requests` gets only the server HTML; use Selenium or a headless browser like Playwright for JS-rendered pages.
- **Anti-bot defenses** — reCAPTCHA, Cloudflare challenge, TLS fingerprinting — may require specialized tools or explicit permission.
- **Pagination** — follow "next" links, track visited URLs, deduplicate.
- **Character encoding** — `resp.encoding = 'utf-8'` if the site lies about its content type.

### A complete scraping example

```python
import requests
from bs4 import BeautifulSoup
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')

base = 'https://example.com/items'
all_items = []
page = 1

while True:
    url = f'{base}?page={page}'
    logging.info(f'Fetching {url}')
    resp = requests.get(url, headers={'User-Agent': 'AdvancementResearch/1.0'}, timeout=10)
    if resp.status_code == 404:
        logging.info('No more pages')
        break
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, 'html.parser')
    items = soup.select('.item-card')
    if not items:
        break
    for card in items:
        all_items.append({
            'title': card.select_one('h3').text.strip(),
            'link':  card.select_one('a').get('href'),
        })

    page += 1
    time.sleep(1)                    # be polite

logging.info(f'Collected {len(all_items)} items')
```

---

## Cross-book connections

- Ch 11 Debugging ↔ `JCAC-PROG-SCRIPT.md` §5 (Python — exception handling).
- Ch 12 Web Scraping ↔ `JCAC-NETWORKING.md` §20 (HTTP).
- Logging discipline ↔ `JCAC-UNIX-LINUX.md` §25 (logs & auditing — receiving rsyslog events).
- Selenium ↔ operational workflows for CT/CyberWarfare teams doing web-asset recon.
- Regex foundation Sweigart uses heavily ↔ `JCAC-PROG-SCRIPT.md` §3 (Regular Expressions).

---

## Exam-testable concepts (rapid-fire)

### Debugging

- **Module for structured logging?** `logging`.
- **Default log level for `logging.basicConfig()`?** WARNING (messages below that are suppressed).
- **Log levels low-to-high?** DEBUG (10), INFO (20), WARNING (30), ERROR (40), CRITICAL (50).
- **Built-in debugger entry point (Python 3.7+)?** `breakpoint()`.
- **pdb command to step over a line?** `n` (next).
- **pdb command to step into a function?** `s` (step).
- **pdb command to show call stack?** `w` (where).
- **`assert` disabled when?** Under `python -O` optimization.
- **Don't use `assert` for?** Validating user input (optimization strips it).
- **Reading a traceback direction?** Bottom-up — last line names the exception, frames above are the call chain.
- **Which exception is raised by `int("abc")`?** `ValueError`.
- **Which by `"3" + 5`?** `TypeError`.
- **Which by `[1,2,3][5]`?** `IndexError`.
- **Which by `{"a":1}["b"]`?** `KeyError`.
- **EAFP means?** Easier to Ask Forgiveness than Permission — use try/except rather than pre-check.
- **`is` vs `==` use case for `None`?** Always `is None` / `is not None`.
- **Mutable-default-argument fix?** Use `None` as default and create inside the function.

### Web scraping

- **Library for HTTP requests?** `requests`.
- **`requests.get()` returns?** A Response object.
- **Raise HTTP errors?** `resp.raise_for_status()`.
- **Parse HTML with?** BeautifulSoup (`bs4`).
- **Default bs4 parser shipped with Python?** `'html.parser'`.
- **Faster parser (needs extra package)?** `'lxml'`.
- **Most lenient / browser-like parser?** `'html5lib'`.
- **Select by CSS selector?** `soup.select(...)` and `soup.select_one(...)`.
- **Select by tag name and attributes?** `soup.find_all('a', href=True)`.
- **Stream a large file download?** `requests.get(url, stream=True)` + `iter_content`.
- **Launch a user-visible browser?** `webbrowser.open(url)`.
- **Library for JavaScript-rendered pages?** Selenium.
- **Selenium locator strategies?** ID, NAME, CLASS_NAME, TAG_NAME, LINK_TEXT, PARTIAL_LINK_TEXT, CSS_SELECTOR, XPATH.
- **Selenium wait for an element?** `WebDriverWait(driver, t).until(EC.presence_of_element_located(...))`.
- **Run a headless browser?** `options.add_argument("--headless")`.
- **Scraping politeness constants?** Check `robots.txt`, identify in User-Agent, rate-limit, prefer API.

---

## Cross-references

- **[Automate the Boring Stuff with Python, 2e](../references/Automate%20the%20Boring%20Stuff%20with%20Python,%202nd%20Edition-9781098122584.pdf)** — text on disk.
- **[Online edition (free)](https://automatetheboringstuff.com/2e/)** — Sweigart's full book in browser-readable HTML.
- **[Python `logging` docs](https://docs.python.org/3/library/logging.html)** · **[Python `pdb` docs](https://docs.python.org/3/library/pdb.html)**.
- **[Requests documentation](https://requests.readthedocs.io/)**.
- **[BeautifulSoup documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)**.
- **[Selenium documentation](https://www.selenium.dev/documentation/)**.
- **[robots.txt spec (RFC 9309)](https://www.rfc-editor.org/rfc/rfc9309)**.
- `JCAC-PROG-SCRIPT.md` — JCAC Module 9 Python coverage (regex, flow control, sockets).
- `JCAC-NETWORKING.md` — HTTP protocol context.
- `BOOK-CPP-HTP.md` — strongly-typed language contrast.
