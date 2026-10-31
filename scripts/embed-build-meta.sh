#!/bin/sh

STATIC_PKG="pkg/static"

git describe --tags 2>/dev/null || echo "v0.0.0-$(git rev-parse HEAD | head -c 8)" >"${STATIC_PKG}/version.txt"
date >"${STATIC_PKG}/builddate.txt"
