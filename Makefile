dev:
	tsc --watch --sourceMap bpm.ts


MANIFEST_FILE = "offline/cache.manifest"
SFTP_PATH     = "towns.dreamhost.com:~/garron.net/dance/bpm"
URL           = "http://garron.net/dance/bpm/"

.PHOHY: deploy
deploy:
	manifest --update "${MANIFEST_FILE}"
	rsync -avz --exclude .git . "${SFTP_PATH}"
	manifest --revert "${MANIFEST_FILE}"
	echo "Done deploying. Go to ${URL}"

