---
type: pipeline
title: Pipeline name
summary: One line on what it produces.
date: 2026-09-12
trigger: Push to main
steps:
  - Install and cache dependencies
  - Run tests
  - Build
  - Deploy to Vercel
stack: [GitHub Actions, Node]
tags: [ci, deploy]
repo: https://github.com/you/repo
---

## Why it exists

What it replaced and what it guarantees.

## How it works

Walk through the steps above, and anything they don't show.
