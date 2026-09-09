// Trusted built-in adapter; imported manifests remain data only.
export function youtubeUrl(href) {
      const u = new URL(href);
      let id = '';
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
      else if (
        ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)
      )
        id =
          u.searchParams.get('v') ||
          u.pathname.match(/^\/(?:shorts|live)\/([^/]+)/)?.[1] ||
          '';
      if (/^[a-zA-Z0-9_-]{11}$/.test(id))
        return 'https://www.youtube-nocookie.com/embed/' + id;
  return '';
}
