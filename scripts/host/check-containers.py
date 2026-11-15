#!/usr/bin/env python3
"""Container image update check for the Proxmox host. Read-only: never pulls or restarts anything.

For every running LXC, lists its Docker containers (via `pct exec`), then asks each image's registry
(via `skopeo`, no pull) whether the tag now points at a different digest than the one running.
Writes /var/www/update-status/containers.json, which Orbit reads through its gateway.

Run daily from root's crontab. `--self-test` checks the pure helpers and exits.
"""
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime

OUT = '/var/www/update-status/containers.json'
# cron's PATH lacks /usr/sbin, where pct lives
os.environ['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
VERSION_LABEL = 'org.opencontainers.image.version'
# skopeo errors that mean "this image isn't in a public registry", i.e. a local build or a private image.
NOT_PUBLIC = ('denied', 'unauthorized', 'manifest unknown', 'name unknown', 'not found')


def run(cmd, timeout=60):
    r = subprocess.run(cmd, capture_output=True, timeout=timeout, stdin=subprocess.DEVNULL)
    if r.returncode != 0:
        raise RuntimeError((r.stderr.decode(errors='replace').strip().splitlines() or ['exit %d' % r.returncode])[-1])
    return r.stdout


def split_ref(ref):
    """'mongo:7.0' -> ('mongo', '7.0'); 'jellyfin/jellyfin' -> ('jellyfin/jellyfin', 'latest'). Digest refs keep no tag."""
    name, _, digest = ref.partition('@')
    last = name.rsplit('/', 1)[-1]
    if ':' in last:
        name, tag = name.rsplit(':', 1)
    else:
        tag = None if digest else 'latest'
    return name, tag


def qualify(name):
    """Docker Hub short names -> fully qualified, so skopeo never guesses a registry."""
    first = name.split('/', 1)[0]
    if '/' in name and ('.' in first or ':' in first or first == 'localhost'):
        return name
    return 'docker.io/' + (name if '/' in name else 'library/' + name)


def shown_version(tag, label):
    """A pinned tag says more than a label (mongo:7.0 labels itself 22.04, its Ubuntu base)."""
    if tag and tag != 'latest':
        return tag
    return label or tag or 'latest'


def classify_error(msg):
    m = msg.lower()
    return 'local' if any(s in m for s in NOT_PUBLIC) else 'failed'


def remote(name, tag, cache):
    """Registry digest of name:tag (the manifest or index digest, as RepoDigests records it), cached per run."""
    key = (name, tag)
    if key not in cache:
        raw = run(['skopeo', 'inspect', '--raw', '--retry-times', '2', 'docker://%s:%s' % (qualify(name), tag)])
        cache[key] = 'sha256:' + hashlib.sha256(raw).hexdigest()
    return cache[key]


def newest_label(name, tag, cache):
    key = ('label', name, tag)
    if key not in cache:
        info = json.loads(run(['skopeo', 'inspect', '--no-tags', '--retry-times', '2', 'docker://%s:%s' % (qualify(name), tag)]))
        cache[key] = (info.get('Labels') or {}).get(VERSION_LABEL)
    return cache[key]


def check_container(c, images, cache):
    ref = c['Config']['Image']
    img = images.get(c['Image'], {})
    labels = (img.get('Config') or {}).get('Labels') or {}
    name, tag = split_ref(ref)
    row = {
        'name': c['Name'].lstrip('/'),
        'image': ref,
        'state': c['State']['Status'],
        'running': shown_version(tag, labels.get(VERSION_LABEL)),
        'newest': None,
        'status': 'current',
        'error': None,
    }
    local = {d.split('@', 1)[1] for d in img.get('RepoDigests') or [] if '@' in d}
    if tag is None or not local:
        row['status'] = 'local'
        return row
    try:
        digest = remote(name, tag, cache)
    except Exception as e:  # registry, network or timeout; one image must not sink the run
        row['status'] = classify_error(str(e))
        if row['status'] == 'failed':
            row['error'] = str(e)[:160]
        return row
    if digest not in local:
        row['status'] = 'behind'
        try:
            label = newest_label(name, tag, cache)
        except Exception:
            label = None
        # Same label on both sides means the label isn't the app version; say "newer image" instead.
        row['newest'] = label if label and label != labels.get(VERSION_LABEL) and tag == 'latest' else None
    return row


def check_ct(vmid, cache):
    ids = run(['pct', 'exec', vmid, '--', 'docker', 'ps', '-aq']).decode().split()
    if not ids:
        return []
    containers = json.loads(run(['pct', 'exec', vmid, '--', 'docker', 'inspect', *ids]))
    image_ids = sorted({c['Image'] for c in containers})
    images = {i['Id']: i for i in json.loads(run(['pct', 'exec', vmid, '--', 'docker', 'image', 'inspect', *image_ids]))}
    order = {'behind': 0, 'failed': 1, 'current': 2, 'local': 3}
    rows = [check_container(c, images, cache) for c in containers]
    return sorted(rows, key=lambda r: (order[r['status']], r['name']))


def list_cts():
    """[(vmid, name)] for running CTs. `pct list` columns: VMID Status [Lock] Name."""
    out = []
    for line in run(['pct', 'list']).decode().splitlines()[1:]:
        f = line.split()
        if len(f) >= 3 and f[1] == 'running':
            out.append((f[0], f[-1]))
    return sorted(out, key=lambda t: int(t[0]))


def main():
    cache = {}
    cts = []
    for vmid, name in list_cts():
        try:
            cts.append({'id': vmid, 'name': name, 'error': None, 'containers': check_ct(vmid, cache)})
        except Exception as e:
            cts.append({'id': vmid, 'name': name, 'error': str(e)[:160], 'containers': []})
    doc = {'checked_at': datetime.now().astimezone().isoformat(timespec='seconds'), 'cts': cts}
    tmp = OUT + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(doc, f, indent=1)
    os.chmod(tmp, 0o644)
    os.replace(tmp, OUT)  # atomic, so Orbit never reads a half-written file


def self_test():
    assert split_ref('mongo:7.0') == ('mongo', '7.0')
    assert split_ref('jellyfin/jellyfin') == ('jellyfin/jellyfin', 'latest')
    assert split_ref('localhost:5000/app') == ('localhost:5000/app', 'latest')
    assert split_ref('localhost:5000/app:2') == ('localhost:5000/app', '2')
    assert split_ref('x/y@sha256:ab') == ('x/y', None)
    assert qualify('mongo') == 'docker.io/library/mongo'
    assert qualify('n8nio/n8n') == 'docker.io/n8nio/n8n'
    assert qualify('ghcr.io/a/b') == 'ghcr.io/a/b'
    assert qualify('lscr.io/linuxserver/radarr') == 'lscr.io/linuxserver/radarr'
    assert shown_version('7.0', '22.04') == '7.0'
    assert shown_version('latest', '1.37.2') == '1.37.2'
    assert shown_version('latest', None) == 'latest'
    assert classify_error('reading manifest latest in docker.io/library/cadence-cadence: requested access to the resource is denied') == 'local'
    assert classify_error('pinging container registry ghcr.io: dial tcp: i/o timeout') == 'failed'
    assert classify_error('toomanyrequests: You have reached your pull rate limit') == 'failed'
    # a container whose image has no registry digest is a local build, checked without touching the network
    c = {'Config': {'Image': 'smarth2wo-backend'}, 'Image': 'sha256:1', 'Name': '/b', 'State': {'Status': 'running'}}
    assert check_container(c, {'sha256:1': {'RepoDigests': []}}, {})['status'] == 'local'
    print('self-test ok')


if __name__ == '__main__':
    self_test() if sys.argv[1:] == ['--self-test'] else main()
