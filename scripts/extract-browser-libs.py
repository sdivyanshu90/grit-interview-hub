from pathlib import Path
import subprocess
for package in Path('/tmp/grit-browser-libs').glob('*.deb'):
    subprocess.run(['dpkg-deb','-x',str(package),'/tmp/grit-browser-libs/root'],check=True)
