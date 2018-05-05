dev:
	tsc --watch --sourceMap bpm.ts


MANIFEST_FILE = "offline/cache.manifest"
SFTP_PATH     = "towns.dreamhost.com:~/garron.net/dance/bpm"
URL           = "http://garron.net/dance/bpm/"

.PHOHY: deploy
deploy:
	rsync -avz --exclude .git . "${SFTP_PATH}"
	echo "Done deploying. Go to ${URL}"

