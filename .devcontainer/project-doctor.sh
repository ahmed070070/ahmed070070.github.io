#!/usr/bin/env bash
set -eu

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

section() {
  printf '\n== %s ==\n' "$1"
}

has() {
  if command -v "$1" >/dev/null 2>&1; then
    printf '[OK] %s: %s\n' "$1" "$(command -v "$1")"
  else
    printf '[MISSING] %s\n' "$1"
  fi
}

section "Workspace"
printf 'Project: %s\n' "$ROOT"
printf 'Branch: '
git branch --show-current 2>/dev/null || printf 'not available\n'

section "Available tools"
has git
has node
has npm
has java
has python3
has cargo
has gradle

section "Project detection"
found=0

if [ -f package.json ] || [ -f index.html ]; then
  printf '[FOUND] Web project (HTML/CSS/JS or Node.js)\n'
  [ ! -f package.json ] || printf '  package.json is present\n'
  [ ! -f index.html ] || printf '  index.html is present\n'
  found=1
fi

if [ -f settings.gradle ] || [ -f settings.gradle.kts ] || [ -f build.gradle ] || [ -f build.gradle.kts ] || [ -f gradlew ]; then
  printf '[FOUND] Gradle project\n'
  if find . -maxdepth 4 \( -name AndroidManifest.xml -o -name '*.kt' \) -print -quit 2>/dev/null | grep -q .; then
    printf '  Android/Kotlin indicators found\n'
    printf '  Android SDK setup may be needed before building\n'
  else
    printf '  Java/Gradle project indicators found\n'
  fi
  found=1
fi

if find . -maxdepth 3 -name '*.py' -print -quit 2>/dev/null | grep -q .; then
  printf '[FOUND] Python source files\n'
  found=1
fi

if [ -f Cargo.toml ]; then
  printf '[FOUND] Rust project (Cargo.toml)\n'
  found=1
fi

if [ "$found" -eq 0 ]; then
  printf '[INFO] No recognized project marker found at the repository root\n'
fi

section "Safety"
printf 'This diagnostic is read-only: it does not install packages or modify project files.\n'
