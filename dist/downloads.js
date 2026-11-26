/* Resolve Windows downloads from the public latest stable GitHub Release. */
(function () {
  'use strict';
  const repository = 'https://github.com/Twigly-official/Twigly';
  const latest = `${repository}/releases/latest`;

  function installerFor(release) {
    if (!release || release.draft || release.prerelease || !Array.isArray(release.assets)) return null;
    // These are the supported x64 installer names, never update packages or source ZIPs.
    const installers = release.assets.filter(asset =>
      typeof asset.name === 'string' &&
      /^TwiglyApp-(?:win(?:-x64)?|\d+\.\d+\.\d+(?:\.\d+)?)-Setup\.exe$/i.test(asset.name) &&
      asset.size > 0 && asset.state === 'uploaded' &&
      typeof asset.browser_download_url === 'string' &&
      asset.browser_download_url.startsWith(`${repository}/releases/download/`)
    );
    return installers.find(asset => /^TwiglyApp-win(?:-x64)?-Setup\.exe$/i.test(asset.name)) || installers[0] || null;
  }

  async function init(document, fetchRelease) {
    const button = document.querySelector('#windows-download');
    if (!button) return;
    const label = document.querySelector('#windows-download-label');
    const version = document.querySelector('#windows-version');
    const notes = document.querySelector('#windows-release');
    const status = document.querySelector('#windows-download-status');
    status.textContent = '최신 버전을 확인하고 있어요.';
    try {
      const response = await fetchRelease('https://api.github.com/repos/Twigly-official/Twigly/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' },
        credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('Release unavailable');
      const release = await response.json();
      if (release.draft || release.prerelease) throw new Error('Release unavailable');
      const installer = installerFor(release);
      if (typeof release.tag_name === 'string' && release.tag_name.length < 80) version.textContent = `Twigly ${release.tag_name}`;
      if (typeof release.html_url === 'string' && release.html_url.startsWith(`${repository}/releases/tag/`)) notes.href = release.html_url;
      if (!installer) {
        label.textContent = 'Windows 릴리즈 확인';
        status.textContent = '이 버전의 설치 파일을 준비하고 있어요. 릴리즈 정보를 확인해 주세요.';
        return;
      }
      button.href = installer.browser_download_url;
      label.textContent = 'Windows 다운로드 (x64)';
      status.textContent = '';
      status.hidden = true;
    } catch (_) {
      button.href = latest;
      label.textContent = 'Windows 릴리즈 확인';
      status.textContent = '최신 버전을 불러오지 못했어요. 릴리즈에서 다운로드해 주세요.';
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { installerFor, init };
  if (typeof document !== 'undefined') init(document, fetch);
})();
