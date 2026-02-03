# Mermaid Diagram Types Test

This document tests rendering of multiple mermaid diagram types on a single page. Each diagram should render as an SVG without ID collisions.

---

## 1. Flowchart

```mermaid
flowchart TD
    Start([Start]) --> Input[/User Input/]
    Input --> Validate{Valid?}
    Validate -->|Yes| Process[Process Data]
    Validate -->|No| Error[Show Error]
    Error --> Input
    Process --> Store[(Database)]
    Store --> Output[/Display Result/]
    Output --> End([End])
```

## 2. Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant API as Backend API
    participant DB as Database

    User->>UI: Submit Form
    UI->>API: POST /data
    API->>DB: INSERT record
    DB-->>API: OK (id: 42)
    API-->>UI: 201 Created
    UI-->>User: Success Message

    User->>UI: View Record
    UI->>API: GET /data/42
    API->>DB: SELECT * WHERE id=42
    DB-->>API: Record data
    API-->>UI: 200 OK (JSON)
    UI-->>User: Display Record
```

## 3. Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() String
        +move() void
    }
    class Dog {
        +String breed
        +makeSound() String
        +fetch() void
    }
    class Cat {
        +boolean indoor
        +makeSound() String
        +purr() void
    }
    class Veterinarian {
        +String license
        +examine(Animal) Report
    }
    Animal <|-- Dog
    Animal <|-- Cat
    Veterinarian --> Animal : treats
```

## 4. Entity Relationship Diagram

```mermaid
erDiagram
    CUSTOMER {
        int id PK
        string name
        string email UK
    }
    ORDER {
        int id PK
        date created
        float total
        int customer_id FK
    }
    PRODUCT {
        int id PK
        string name
        float price
        int stock
    }
    ORDER_ITEM {
        int order_id FK
        int product_id FK
        int quantity
    }
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
```

## 5. Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
        Requirements     :a1, 2025-01-01, 14d
        Design           :a2, after a1, 10d
    section Development
        Backend API      :b1, after a2, 21d
        Frontend UI      :b2, after a2, 28d
        Integration      :b3, after b1, 7d
    section Testing
        Unit Tests       :c1, after b1, 14d
        E2E Tests        :c2, after b3, 10d
    section Deployment
        Staging          :d1, after c2, 3d
        Production       :d2, after d1, 2d
```

## 6. Pie Chart

```mermaid
pie title Technology Stack Distribution
    "TypeScript" : 45
    "Python" : 25
    "SQL" : 15
    "Shell" : 10
    "Other" : 5
```

---

## Inline Code Test

Here's some `inline code` that should NOT be rendered as a code block. The variable `diagramCounter` was the old approach, now replaced with `renderIdRef`.

## Untyped Code Block

```
This is an untyped code block.
It has no language specified.
It should render as plain preformatted text.
```

## Typed Code Block (Not Mermaid)

```javascript
// This should get syntax highlighting, NOT mermaid rendering
const diagram = "flowchart TD; A-->B";
console.log(diagram);
```

---

**Test complete.** If all 6 mermaid diagrams render as SVGs, inline code stays inline, untyped blocks are plain, and JS blocks get syntax highlighting — the document detector is working correctly.
