---
name: Correct
description: Check for correctness and codestyle compliance and correct issues
---

Check the codebase for the following points:

- Logical correctness
- Potential nil pointer dereferences
- Potential superficial security issues
- Array indexes which could result in an out of bounds panic
- Unchecked errors
- Forgotten mutex locks, unlocks or deadlocks
- Ressource leaks
- Compliance to the @CODESTYLE.md
