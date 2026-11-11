"""Build/check the narrowly pruned Odhín archive with the exact common-lib UI patch."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SECURITY_PATCH = ROOT / '.yarn/patches/odhin-reports-playwright-1.1.8-core-security.patch'
UI_PATCH = ROOT / '.yarn/patches/odhin-reports-playwright-npm-1.1.8-a445ed88b7.patch'
EXPECTED = json.loads((Path(__file__).with_name('upstream-1.1.8.files.json')).read_text())


def validate_upstream(source):
    actual = {file.relative_to(source).as_posix(): hashlib.sha256(file.read_bytes()).hexdigest()
              for file in source.rglob('*') if file.is_file()}
    if actual != EXPECTED:
        raise ValueError('Source differs from the pinned upstream Odhín 1.1.8 package')


def archive(source):
    content = io.BytesIO()
    with tarfile.open(fileobj=content, mode='w', format=tarfile.USTAR_FORMAT) as tar:
        for file in sorted(source.rglob('*')):
            if not file.is_file():
                continue
            if file.is_symlink():
                raise ValueError('Source contains a symbolic link')
            data = file.read_bytes()
            entry = tarfile.TarInfo('package/' + file.relative_to(source).as_posix())
            entry.size, entry.mode, entry.mtime = len(data), 0o644, 0
            tar.addfile(entry, io.BytesIO(data))
    compressed = io.BytesIO()
    with gzip.GzipFile(fileobj=compressed, mode='wb', filename='', mtime=0) as zipped:
        zipped.write(content.getvalue())
    return compressed.getvalue()


def apply_patch(source, reverse=False, patch=SECURITY_PATCH):
    # The retained Yarn UI patch assumes a final newline absent from this npm asset.
    newline_file = source / 'lib/html/assets/js/dataTables.min.js'
    if patch == UI_PATCH and not reverse and not newline_file.read_bytes().endswith(b'\n'):
        newline_file.write_bytes(newline_file.read_bytes() + b'\n')
    command = ['/usr/bin/git', 'apply', '--whitespace=nowarn', str(patch)]
    if reverse:
        command.append('--reverse')
    result = subprocess.run(command, cwd=source, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'Git patch application failed:\n{result.stdout}\n{result.stderr}')
    if patch == UI_PATCH and reverse:
        data = newline_file.read_bytes()
        if hashlib.sha256(data[:-1]).hexdigest() == EXPECTED['lib/html/assets/js/dataTables.min.js']:
            newline_file.write_bytes(data[:-1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Pristine unpacked npm Odhín 1.1.8 directory')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--verify', type=Path, help='Verify archive and reconstruct pinned upstream bytes')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='core-odhin-vendor-check-') as temporary:
        source = Path(temporary) / 'package'
        if args.verify:
            source.mkdir()
            with tarfile.open(args.verify) as tar:
                for member in tar:
                    parts = Path(member.name).parts
                    if not member.isfile() or not parts or parts[0] != 'package' or '..' in parts:
                        raise ValueError('Archive contains an unsupported path or file type')
                    target = source.joinpath(*parts[1:])
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(tar.extractfile(member).read())
            apply_patch(source, reverse=True)
            apply_patch(source, reverse=True, patch=UI_PATCH)
            validate_upstream(source)
            apply_patch(source, patch=UI_PATCH)
            apply_patch(source)
            if archive(source) != args.verify.read_bytes():
                raise ValueError('Archive does not match deterministic regeneration')
            print('Verified upstream file hashes, security patch, license and deterministic archive')
        elif args.source and args.output:
            validate_upstream(args.source)
            shutil.copytree(args.source, source)
            apply_patch(source, patch=UI_PATCH)
            apply_patch(source)
            args.output.write_bytes(archive(source))
            print(hashlib.sha256(args.output.read_bytes()).hexdigest())
        else:
            parser.error('Use --source and --output, or --verify')


if __name__ == '__main__':
    main()
