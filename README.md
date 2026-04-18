# Stundio

![Preview](./assets/Preview_4K.png)

<p align="center">
    <a href="https://flutter.dev">
        <img src="https://img.shields.io/badge/Flutter-%2302569B.svg?style=for-the-badge&logo=Flutter&logoColor=white"/>
    </a>
    <a href="https://dart.dev">
        <img src="https://img.shields.io/badge/Dart-%230175C2.svg?style=for-the-badge&logo=dart&logoColor=white"/>
    </a>
    <img src="https://img.shields.io/badge/Open%20Source-Yes-brightgreen.svg?style=for-the-badge"/>
</p>

---

## Introduction

**Stundio** (ˈstuːndio, like "stundu" in Latvian) is a next-generation mobile and web experience for EduPage, engineered for students who demand performance, usability, and modern design. We transform the often rigid and outdated educational interface into a fluid, high-performance tool that works seamlessly across all devices.

---

## Problem

EduPage has significant UX issues that impact daily student usage:

- Lack of persistence: selected groups and settings are often lost
- Outdated UI: not optimized for modern mobile devices
- Performance issues: slow loading and weak responsiveness
- Cluttered interface: unnecessary complexity for simple tasks

---

## Solution

Stundio introduces a student-first approach:

- Persistent state (your group and settings are always saved)
- Liquid UI with smooth and modern animations
- High performance with optimized rendering
- Full local processing (no tracking, no analytics)

---

## Features

- Smooth animations and transitions
- Fast client-side rendering
- Cross-platform support (Android, iOS, Web)
- Minimal and student-focused interface

---

## Architecture

Stundio is built using a scalable **feature-first clean architecture** with **Flutter**, designed for long-term maintainability and cross-platform support.

The architecture follows strict **SOLID principles**, ensuring modularity, testability, and clean separation of concerns.

---

### High-Level Architecture
Presentation → Domain → Data

Each feature is fully independent and self-contained.

---

## Core Layer

Contains shared logic used across the application.

- DI (Dependency Injection)
- Networking (API client, interceptors, endpoints)
- Routing (navigation system)
- Theme (colors, typography, design system)
- Error handling (exceptions, failures)
- Utilities (validators, helpers)
- Shared widgets (buttons, inputs, loaders)

---

## Feature Layer

Each feature follows the same structure:
feature/
data/
domain/
presentation/

---

### Data Layer
- API models (DTOs)
- Remote and local data sources
- Repository implementations

### Domain Layer
- Entities (pure Dart objects)
- Repository interfaces
- Use cases (business logic)

### Presentation Layer
- UI screens
- State management (Bloc/Cubit)
- Feature-specific widgets

---

## Data Flow
UI → State Management → Use Case → Repository → Data Source → API

---

## Architecture Principles

- Strict separation of concerns
- Dependency inversion
- Feature isolation
- Reusable components
- Testable domain layer
- No business logic in UI

---

## Philosophy

**Made from students for students.**

Stundio exists to eliminate frustration caused by outdated educational systems and replace them with fast, intuitive tools.

---

## Contribution

- Issues → bug reports and suggestions
- Discussions → general ideas
- Pull Requests → open for contributions

---

## License

Open-source project. Free to use, modify, and contribute.

---

## Post Scriptum

Special thanks to teacher **Monta** for inspiration.
