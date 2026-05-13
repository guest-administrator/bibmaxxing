# Bib Study Guide — C++ How to Program (Deitel) 10th Edition

> **Bib reference:** *C++ How to Program*, 10th Edition — Paul Deitel, Harvey Deitel (Pearson, 2017, ISBN 978-0-13-444893-0).
>
> **Regular-exam scope:** Sections 1, 7, 17.
> **Substitute-exam scope:** Chapters 1, 3; Section 27.
> **Union — what this guide covers:** Ch 1 (Introduction to Computers and C++), Ch 3 (Classes, Objects, Member Functions, Strings), Ch 7 (Class Templates `array` and `vector`; Catching Exceptions), Ch 17 (Exception Handling: A Deeper Look), Section 27 / Ch 27 (online / advanced C++ topics — treated as general-purpose C++ wrap-up).

**Posture:** Deitel reads like a sequenced course — each chapter builds on the last with full worked examples. The Bib-scope chapters span the book's introductory, middle, and advanced zones. This guide captures the concepts, common idioms, and pitfalls a Chief needs to recognize the exam's C++ questions. Pairs with `JCAC-PROG-FUND.md` (C++ programming fundamentals from JCAC Module 3).

---

## Chapter 1 — Introduction to Computers and C++

### What a computer is (Deitel's framing)

Six units that logically describe any modern computer:

1. **Input unit** — keyboard, mouse, touchscreen, network, microphone.
2. **Output unit** — screen, printer, network, speakers.
3. **Memory unit** — RAM; fast, volatile, holds program + active data.
4. **Arithmetic and Logic Unit (ALU)** — performs integer + logical operations.
5. **Central Processing Unit (CPU)** — coordinates + executes.
6. **Secondary storage unit** — persistent; HDDs, SSDs, cloud, tape.

### Data hierarchy

Bits → characters → fields → records → files → databases.

### Programming language generations

- **Machine languages** — binary; CPU-specific.
- **Assembly languages** — mnemonics; translated by an assembler.
- **High-level languages** — C, C++, Java, Python; compiled or interpreted.

Deitel positions C++ as a high-level, general-purpose, compiled, statically-typed language with both procedural and object-oriented facilities.

### The C++ build pipeline

Six phases:

1. **Edit** — programmer writes source (`.cpp`, `.h`).
2. **Preprocess** — `#include` expansion, `#define` substitution, conditionals.
3. **Compile** — translate preprocessed source to object code (`.o` / `.obj`).
4. **Link** — combine object files + libraries into executable.
5. **Load** — OS loader brings executable into memory.
6. **Execute** — CPU runs the loaded program.

Toolchains: **GCC** (`g++`), **Clang** (`clang++`), **MSVC** (`cl.exe`).

### Input/output — "Hello, world"

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Welcome to C++!\n";
    return 0;
}
```

Anatomy:

- `#include <iostream>` — preprocessor pulls in stream I/O declarations.
- `using namespace std;` — brings `std` names into scope (convenient; avoid in headers).
- `int main()` — program entry point; returns exit status to OS.
- `cout` — standard output `std::ostream` object.
- `<<` — stream-insertion operator.
- `\n` — newline escape.

Modern style prefers explicit `std::` prefix over `using namespace std;` in anything beyond a textbook example.

### Object-oriented basics (teaser; deeper in Ch 3)

- **Object** — encapsulates data (attributes) and operations (methods).
- **Class** — blueprint for objects.
- **Encapsulation** — data hiding behind methods.
- **Inheritance** — derived class extends base.
- **Polymorphism** — same interface, different behavior.

### Software engineering vocabulary Deitel emphasizes

- **Reusability** — well-designed components reused across projects.
- **Portability** — write once, recompile anywhere C++ compiler exists.
- **Maintainability** — code is read more than written; style and clarity matter.
- **Documentation** — comments explain *why*; code shows *what*.

---

## Chapter 3 — Classes, Objects, Member Functions, Strings

### Defining a class

```cpp
#include <iostream>
#include <string>
using namespace std;

class GradeBook {
public:
    // Constructor — initializes object
    explicit GradeBook(string courseName) : courseName_(courseName) {}

    void setCourseName(string name) { courseName_ = name; }
    string getCourseName() const   { return courseName_; }

    void displayMessage() const {
        cout << "Welcome to the grade book for "
             << getCourseName() << "!\n";
    }

private:
    string courseName_;
};

int main() {
    GradeBook book{"CWT E-7 Advancement"};
    book.displayMessage();
    return 0;
}
```

Elements:

- **Class definition** — `class Name { ... };` (semicolon required).
- **Access specifiers** — `public` (visible to all), `private` (only members/friends), `protected` (members + derived classes).
- **Data members** — variables inside the class; naming convention `member_` or `m_member` to distinguish from locals.
- **Member functions** (methods) — operate on the object.
- **Constructor** — special member run on object creation; same name as the class, no return type.
- **`const` member functions** — don't modify `*this`; can be called on const objects.

### Separating interface from implementation

```cpp
// GradeBook.h
#ifndef GRADEBOOK_H
#define GRADEBOOK_H
#include <string>
class GradeBook {
public:
    explicit GradeBook(std::string);
    void setCourseName(std::string);
    std::string getCourseName() const;
    void displayMessage() const;
private:
    std::string courseName_;
};
#endif
```

```cpp
// GradeBook.cpp
#include <iostream>
#include "GradeBook.h"
using namespace std;

GradeBook::GradeBook(string name) : courseName_(name) {}
void GradeBook::setCourseName(string n) { courseName_ = n; }
string GradeBook::getCourseName() const { return courseName_; }
void GradeBook::displayMessage() const  {
    cout << "Welcome to the grade book for "
         << getCourseName() << "!\n";
}
```

- **Header guards** (`#ifndef / #define / #endif`) prevent multiple inclusion.
- **Scope resolution operator** `::` qualifies member definitions.
- Compile: `g++ main.cpp GradeBook.cpp -o gradebook`.

### Constructors — initializer lists vs assignment

**Preferred:**

```cpp
GradeBook::GradeBook(string name) : courseName_(name) {}
```

**Less preferred:**

```cpp
GradeBook::GradeBook(string name) {
    courseName_ = name;   // extra default-construct + assign
}
```

Initializer lists are **mandatory** for `const` members, references, and types without default constructors.

### Default arguments

```cpp
class GradeBook {
public:
    GradeBook(std::string name = "Generic Course");
    // …
};
```

### Strings — `std::string`

```cpp
#include <string>
using namespace std;

string s = "Hello";
string t{"World"};
string u = s + ", " + t;      // concatenation
s += "!";                      // append

s.length();                    // size
s.empty();                     // bool
s.at(0);                       // 'H' — bounds-checked
s[0];                          // 'H' — not bounds-checked
s.substr(0, 3);                // "Hel"
s.find("ello");                // 1 (index) or string::npos
s.replace(0, 1, "J");          // "Jello"
```

**C-style strings** (inherited from C):

- Null-terminated `char` arrays.
- `<cstring>` functions: `strlen`, `strcpy`, `strcat`, `strcmp`.
- Dangerous without bounds — classic buffer-overflow vector.
- Modern C++ heavily prefers `std::string`.

### Input/output with strings

```cpp
string name;
cout << "Enter your name: ";
getline(cin, name);    // reads a whole line (including spaces)
cout << "Hello, " << name << "!\n";
```

`cin >> name;` alone would read only the first whitespace-delimited token.

### The `this` pointer

Inside a member function, `this` is an implicit pointer to the calling object:

```cpp
class Counter {
public:
    Counter& increment() {
        ++count_;
        return *this;    // return the current object by reference
    }
private:
    int count_ = 0;
};

Counter c;
c.increment().increment().increment();  // chained calls
```

### Composition — classes containing other classes

```cpp
class Date { /* ... */ };
class Employee {
public:
    Employee(string n, Date hireDate) : name_(n), hireDate_(hireDate) {}
private:
    string name_;
    Date hireDate_;
};
```

Contrast with **inheritance** (`Employee : public Person`) — composition models "has-a"; inheritance models "is-a."

### Static members

Shared by all instances of the class:

```cpp
class Logger {
public:
    static void write(const string& msg) { ++count_; /* ... */ }
    static int count() { return count_; }
private:
    static int count_;     // declaration
};

int Logger::count_ = 0;    // definition, exactly one per program
```

Called via `Logger::write(...)` — no instance needed.

---

## Chapter 7 — Class Templates `array` and `vector`; Catching Exceptions

### `std::array` (C++11)

Fixed-size, stack-allocated container; a drop-in replacement for C-style arrays with STL interface:

```cpp
#include <array>
using namespace std;

array<int, 5> a{1, 2, 3, 4, 5};
a.size();          // 5 — known at compile time
a.at(2);           // 3 (bounds-checked)
a[2];              // 3 (no bounds check)
a.front();         // 1
a.back();          // 5
a.data();          // pointer to underlying buffer

for (int x : a) cout << x << ' ';
```

Advantages over C arrays:
- No array-to-pointer decay in normal use.
- `.size()` always correct.
- `.at()` with bounds check.
- Pass by reference without extra size parameter: `void f(array<int, 5>& a)`.

### `std::vector`

Dynamic-size array — contiguous storage, amortized-O(1) append, O(n) mid-insert.

```cpp
#include <vector>
using namespace std;

vector<int> v1;                      // empty
vector<int> v2(10);                  // 10 zero-initialized
vector<int> v3(10, -1);              // 10 copies of -1
vector<int> v4{1, 2, 3, 4, 5};       // initializer list

v4.push_back(6);                     // copy/move into back
v4.emplace_back(7);                  // construct in place

v4.size();                           // 7
v4.empty();                          // false
v4.capacity();                       // ≥ size()
v4.reserve(100);                     // pre-allocate (no element construct)

v4.at(2);                            // 3, bounds-checked
v4[2];                               // 3, no check
v4.front();                          // 1
v4.back();                           // 7

v4.insert(v4.begin() + 2, 99);
v4.erase(v4.begin());
v4.pop_back();
v4.clear();

// Iteration
for (int x : v4) cout << x << ' ';
for (auto it = v4.begin(); it != v4.end(); ++it) cout << *it << ' ';
```

**Capacity vs size:** vector doubles capacity on overflow; `reserve()` upfront when you know the final size to avoid reallocations.

### Iterators

Abstract position-in-container:

```cpp
vector<int>::iterator it = v.begin();    // pre-C++11 style
auto it = v.begin();                      // C++11 auto
auto cit = v.cbegin();                    // const iterator
auto rit = v.rbegin();                    // reverse

while (it != v.end()) {
    cout << *it;
    ++it;
}
```

**Invalidation:** operations that may reallocate (`push_back`, `insert`, `reserve`) invalidate all iterators.

### Exceptions — introductory (Ch 7)

```cpp
try {
    int x = v.at(100);                  // throws out_of_range
} catch (const out_of_range& e) {
    cerr << "Bad index: " << e.what() << '\n';
} catch (const exception& e) {
    cerr << "Other error: " << e.what() << '\n';
}
```

Key rules introduced here:
- `throw` an object (not a pointer); throw by value, catch by reference.
- Standard exception hierarchy rooted at `std::exception` (`<exception>`).
- Uncaught exceptions → `std::terminate` → program abort.

---

## Chapter 17 — Exception Handling: A Deeper Look

### Standard exception hierarchy

```
std::exception
├── std::bad_alloc           (from new when out of memory)
├── std::bad_cast            (dynamic_cast reference fails)
├── std::bad_typeid
├── std::logic_error
│   ├── std::invalid_argument
│   ├── std::domain_error
│   ├── std::length_error
│   └── std::out_of_range
└── std::runtime_error
    ├── std::overflow_error
    ├── std::underflow_error
    ├── std::range_error
    └── std::system_error
```

Every exception type exposes `virtual const char* what() const noexcept` — returns a human-readable description.

### Throwing by value, catching by reference

```cpp
try {
    throw runtime_error{"disk full"};        // throw a temporary
} catch (const runtime_error& e) {           // catch by const reference
    cerr << e.what() << '\n';
}
```

Why by reference:
- Avoids object slicing when catching a derived exception as a base.
- Avoids unnecessary copy.

Why `const`:
- Clearly signals the handler won't modify.
- Allows catching temporaries.

### Function-try blocks

A constructor's initializer list can throw — catch via function-try block:

```cpp
class Widget {
public:
    Widget(int n) try : data_(new int[n]) {
        // constructor body
    } catch (const bad_alloc& e) {
        // handle allocation failure
        throw;       // rethrow — constructor must fail
    }
private:
    int* data_;
};
```

### Rethrowing

```cpp
catch (const exception& e) {
    log("Caught: " + string{e.what()});
    throw;                                     // rethrow to outer handler
}
```

Bare `throw;` with no operand propagates the current exception.

### Standard library functions that might throw

- `new` → `bad_alloc` on OOM (unless `nothrow` form used).
- `dynamic_cast<T&>` → `bad_cast` on failure (for pointer form, returns `nullptr` instead).
- `std::vector::at()` → `out_of_range` on bad index.
- `std::stoi` / `stod` → `invalid_argument` / `out_of_range`.
- User-defined code can throw anything — prefer types derived from `std::exception`.

### `noexcept`

Declares a function doesn't throw:

```cpp
void close() noexcept {
    // close a socket, log a final message, etc.
}
```

Why it matters:
- Compiler can optimize assuming no unwinding.
- Move constructors marked `noexcept` let `std::vector` use moves instead of copies on reallocation — huge performance win.
- Calling a `noexcept` function that does throw → `std::terminate`.

### Stack unwinding

When an exception is thrown, the run-time unwinds the stack:

1. Current statement abandoned; control transfers to the nearest matching `catch`.
2. As each stack frame unwinds, destructors for local objects run (RAII releases resources).
3. If no matching handler found, `std::terminate` called.

### RAII — Resource Acquisition Is Initialization

An object's constructor acquires a resource; its destructor releases it. Because destructors run during stack unwinding, **RAII + exceptions** gives automatic resource cleanup under any exit path:

```cpp
{
    ofstream log{"app.log"};           // constructor opens file
    log << "something happened";
    throw runtime_error{"surprise"};   // log's destructor still runs → file closed
}
```

Standard RAII types:
- `std::unique_ptr` / `std::shared_ptr` — memory.
- `std::lock_guard` / `std::scoped_lock` / `std::unique_lock` — mutexes.
- `std::fstream` / `std::ofstream` / `std::ifstream` — files.
- `std::thread` (joinable guard) — thread handles.

### Exception safety levels (Abrahams guarantees)

- **No-throw guarantee** — operation cannot throw; `noexcept` guaranteed.
- **Strong guarantee** — if an exception is thrown, state is as if the operation never started (rollback).
- **Basic guarantee** — if an exception is thrown, no resource is leaked and invariants still hold; exact state unspecified.
- **No guarantee** — anything goes; implies a dangerous API.

Well-designed library functions aim for strong or basic. `std::vector::push_back` is basic; if the copy constructor throws, state is undefined — unless elements are move-only with `noexcept` move.

### `try / catch / throw` pitfalls

- **Catching by value** slices derived exceptions; silently loses information.
- **Empty `catch(...)`** — catches anything but hides error type; only use as top-level safety net before logging and exit.
- **Exceptions in destructors** — a destructor that throws during stack unwinding calls `std::terminate`. Destructors should be `noexcept`.
- **Using exceptions for control flow** (non-error cases) — slow and surprising; prefer return values / `std::optional` / `std::expected`.

---

## Section / Chapter 27 — Advanced C++ Topics (wrap-up)

Chapter 27 in the 10e Deitel is one of the "online" chapters covering advanced / miscellaneous topics. Since it sits outside the printed book, treat this section as the **C++ advanced wrap-up** — the Chief-level concepts that don't fit in Ch 1–26 but appear in modern C++ code.

### Move semantics and rvalue references

```cpp
class Widget {
public:
    Widget(Widget&& other) noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;     // steal; leave other in valid-but-destructible state
        other.size_ = 0;
    }

    Widget& operator=(Widget&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            other.data_ = nullptr;
            other.size_ = 0;
        }
        return *this;
    }
};
```

- **lvalue** — expression that has a persistent location (`int x; x`).
- **rvalue** — temporary (`5`, `x + 1`, `f()`).
- **`T&&`** — rvalue reference; binds to rvalues.
- **`std::move(x)`** — casts lvalue to rvalue reference, enabling move.

### Smart pointers (C++11)

```cpp
#include <memory>

auto u = make_unique<Widget>(/*args*/);   // unique ownership
auto s = make_shared<Widget>(/*args*/);   // shared, refcounted
weak_ptr<Widget> w = s;                    // non-owning observer (breaks cycles)
```

Rule of thumb: **never** use `new` / `delete` directly in modern C++; always go through a smart pointer or container.

### Lambdas (C++11)

Anonymous function objects:

```cpp
vector<int> v{5, 1, 4, 2, 3};

sort(v.begin(), v.end(), [](int a, int b) { return a > b; });
int threshold = 3;
auto above = count_if(v.begin(), v.end(),
                      [threshold](int x) { return x > threshold; });
```

Capture syntax:
- `[]` capture nothing.
- `[=]` capture all by value.
- `[&]` capture all by reference.
- `[x]` / `[&x]` specific capture.

### `auto` and type deduction

```cpp
auto x = 42;                // int
auto y = 3.14;              // double
auto z = "hello";           // const char*
auto s = string{"hi"};      // string
auto it = v.begin();        // vector<int>::iterator
auto [first, second] = pair{1, 2};   // C++17 structured binding
```

### Range-based for

```cpp
for (int x : v)           cout << x;        // read copy
for (auto& x : v)         x *= 2;            // modify in place
for (const auto& x : v)   cout << x;        // read, no copy
```

### `constexpr`

Compile-time constants / functions:

```cpp
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}
constexpr int result = factorial(5);   // evaluated at compile time: 120
```

### Templates — functions and classes

```cpp
template <typename T>
T max(T a, T b) { return a > b ? a : b; }

max(3, 4);        // T = int → 4
max(3.1, 2.7);    // T = double → 3.1
max<string>("hi", "bye");  // explicit

template <typename T, std::size_t N>
class Array { /* ... */ };
Array<int, 10> a;
```

### Standard-library algorithms

`<algorithm>`: `sort`, `find`, `count`, `count_if`, `for_each`, `transform`, `accumulate`, `copy`, `remove`, `unique`, `reverse`, `min`, `max`, `binary_search`, `equal_range`, `all_of`, `any_of`, `none_of`.

Example:

```cpp
#include <algorithm>
#include <numeric>
#include <vector>
using namespace std;

vector<int> v{3, 1, 4, 1, 5, 9, 2, 6};
sort(v.begin(), v.end());
auto sum = accumulate(v.begin(), v.end(), 0);
auto it = find(v.begin(), v.end(), 5);
```

### Concurrency (C++11+)

```cpp
#include <thread>
#include <mutex>
#include <atomic>
#include <future>

mutex m;
atomic<int> counter{0};

void work() {
    lock_guard<mutex> lock{m};
    ++counter;
}

thread t1{work};
thread t2{work};
t1.join();
t2.join();

auto f = async(launch::async, [] { return 42; });
int v = f.get();    // blocks until result
```

### Modern I/O — `<filesystem>` (C++17)

```cpp
#include <filesystem>
namespace fs = std::filesystem;

for (const auto& entry : fs::recursive_directory_iterator("/etc"))
    cout << entry.path() << '\n';

fs::create_directory("new_dir");
fs::file_size("file.txt");
```

### `std::optional` / `std::variant` / `std::any` (C++17)

```cpp
optional<int> find_user(string name) {
    if (db.contains(name)) return db[name];
    return nullopt;
}

if (auto u = find_user("alice")) {
    cout << *u;
}
```

### Modules (C++20 preview)

```cpp
// math.ixx
export module math;
export int square(int x) { return x * x; }

// main.cpp
import math;
int main() { return square(5); }
```

Not yet widespread; 10e barely touches — mentioned for exam-awareness only.

---

## Cross-book connections

- Ch 1 intro ↔ `JCAC-PROG-FUND.md` §1 (SDLC) + §2 (language generations).
- Ch 3 classes ↔ `JCAC-PROG-FUND.md` §18 (Classes and Objects).
- Ch 7 vector/array ↔ `JCAC-PROG-FUND.md` §14 (Arrays) + §16 (Vectors).
- Ch 17 exceptions ↔ `JCAC-PROG-FUND.md` §13 (Functions — note on exceptions).
- Move semantics / smart pointers ↔ `JCAC-PROG-FUND.md` §15 (Dynamic Memory).
- RAII ↔ `JCAC-PROG-FUND.md` §18 (Classes — RAII discussion).

---

## Exam-testable concepts (rapid-fire)

### Ch 1 — Intro

- **Six computer units in Deitel's framing?** Input, Output, Memory, ALU, CPU, Secondary storage.
- **Data hierarchy?** Bit → character → field → record → file → database.
- **Six build phases for a C++ program?** Edit, Preprocess, Compile, Link, Load, Execute.
- **Stream-insertion operator?** `<<`. Extraction? `>>`.
- **Header for `cin`/`cout`?** `<iostream>`.
- **Program entry point return type?** `int main()`.
- **Preferred modern C++ namespace style?** Explicit `std::` over `using namespace std;` (especially in headers).

### Ch 3 — Classes, Objects, Strings

- **Class declaration ends with what?** Semicolon.
- **Access specifiers?** `public`, `private`, `protected`.
- **Default access in `class`?** `private`. In `struct`? `public`.
- **Scope-resolution operator?** `::`.
- **Initializer list is preferred over in-body assignment because?** Efficiency (single initialization) and required for `const` / reference / non-default-constructible members.
- **`const` member function guarantees?** Won't modify `*this`.
- **`this` is?** Implicit pointer to the calling object.
- **Getline reads what?** Whole line including spaces, up to newline.
- **`string::npos` represents?** "No position" — returned by `find` on no-match.
- **Static member requires what in a `.cpp`?** Definition (exactly one per program).
- **Composition models?** "has-a" relationship.

### Ch 7 — array, vector, Exceptions intro

- **Header for `std::array`?** `<array>`. For `std::vector`? `<vector>`.
- **`std::array` size?** Fixed at compile time.
- **`std::vector` amortized append?** O(1).
- **`push_back` vs `emplace_back`?** `emplace_back` constructs in place from arguments — avoids a copy for complex types.
- **`.at()` vs `[]`?** `.at()` throws `std::out_of_range` on bad index; `[]` is UB.
- **`reserve(n)` effect?** Pre-allocates capacity for n elements (no element construction).
- **`size()` vs `capacity()`?** Number of elements vs allocated storage.
- **Iterator invalidation on `push_back`?** If reallocation happens, all iterators invalidated.
- **Catch clause syntax?** `catch (const Type& e) { ... }`.
- **Root of standard exception hierarchy?** `std::exception`.
- **Catch by value risks?** Object slicing.

### Ch 17 — Exceptions: Deeper Look

- **Throw by?** Value. Catch by? Const reference.
- **`what()` method returns?** Human-readable description; `const char*`.
- **Stack unwinding runs?** Destructors for local objects on the unwound frames.
- **Uncaught exception calls?** `std::terminate`.
- **Destructor that throws during unwinding calls?** `std::terminate`.
- **`noexcept` means?** Function doesn't throw; violating it calls `std::terminate`.
- **Why `noexcept` move constructors matter for `vector`?** Enables move-on-realloc instead of copy — faster.
- **Rethrow syntax?** Bare `throw;`.
- **Strong vs basic exception guarantee?** Strong = rollback on throw; Basic = no leak, invariants hold but state unspecified.
- **`std::bad_alloc` thrown by?** `new` when memory allocation fails (unless `nothrow` variant).
- **`dynamic_cast<T&>` on failure?** Throws `std::bad_cast`. Pointer form returns `nullptr`.

### Ch 27 — Advanced wrap-up

- **Rvalue reference syntax?** `T&&`.
- **`std::move(x)` does?** Casts `x` to rvalue reference — enables move semantics.
- **Modern replacement for `new`/`delete`?** `std::unique_ptr` / `std::shared_ptr` via `std::make_unique` / `std::make_shared`.
- **Which smart pointer breaks shared-ownership cycles?** `std::weak_ptr`.
- **Lambda capture `[=]`?** All by value. `[&]`? All by reference.
- **`auto` deduces?** Variable type from initializer.
- **`constexpr` means?** Evaluated at compile time (or can be).
- **Range-based for syntax?** `for (auto x : container) { ... }`.
- **Template declaration?** `template <typename T>` (or `class T`).
- **Pre-sort standard algorithm?** `std::sort`.
- **Element-wise transform?** `std::transform`.
- **C++17 structured binding syntax?** `auto [a, b] = pair{1, 2};`.
- **C++17 optional-value type?** `std::optional<T>`.
- **C++20 module import syntax?** `import math;`.

---

## Cross-references

- **[C++ How to Program (Deitel), 10e](../references/C%2B%2B%20How%20to%20Program,%2010e-9780134448930.pdf)** — text on disk.
- **[cppreference.com](https://en.cppreference.com/)** — canonical C++ standard-library reference.
- **[C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)** — Stroustrup + Sutter's best-practices document.
- **[ISO C++ draft](https://eel.is/c++draft/)** — authoritative language definition.
- **[Compiler Explorer (godbolt.org)](https://godbolt.org/)** — paste C++ in, see assembly out.
- `JCAC-PROG-FUND.md` — JCAC Module 3 C++ coverage.
- `JCAC-PROG-SCRIPT.md` — scripting counterpart.
- `BOOK-OS-CONCEPTS.md` — process model C++ programs run on.
