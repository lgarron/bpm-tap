.PHONY: build
build: setup
	bun run ./script/build.ts

dev: setup
	bun run ./script/dev.ts

.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHOHY: deploy
deploy: build
	bun x @cubing/deploy

lint: setup
	bun x @biomejs/biome check

.PHONY: format
format: setup
	bun x @biomejs/biome check --write
