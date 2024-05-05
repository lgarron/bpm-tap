dev:
	npx tsc --watch --sourceMap bpm.ts

.PHOHY: deploy
deploy:
	bun x @cubing/deploy
