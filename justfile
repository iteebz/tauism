default:
    @just --list

build:
    cat src/header.js src/config.js src/utils/buy.js src/utils/alloc.js src/state.js src/strategies/base.js src/strategies/t1.js src/strategies/t2.js src/strategies/t3.js src/strategies/t4.js src/strategies/t5.js src/strategies/t6.js src/strategies/t7.js src/strategies/t8.js src/strategies/index.js src/ui.js src/main.js | grep -v "^import " | grep -v "^export " > dist/tauism.js

watch:
    npx esbuild src/main.js --bundle --format=iife --outfile=dist/tauism.js --watch

ci: build
    @echo "Build complete: dist/tauism.js"

clean:
    rm -rf dist/*.js
