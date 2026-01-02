default:
    @just --list

build:
    npx esbuild src/main.js --bundle --format=iife --outfile=dist/tauism.js

watch:
    npx esbuild src/main.js --bundle --format=iife --outfile=dist/tauism.js --watch

ci: build
    @echo "Build complete: dist/tauism.js"

clean:
    rm -rf dist/*.js
