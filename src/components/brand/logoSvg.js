// LigthsON app icon as an SVG string / data URI for HTML contexts (PDF
// reports rendered by expo-print). Mirrors assets/ligthson-app-icon.svg.
export const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' +
  '<rect width="1024" height="1024" rx="228" fill="#0A0C0B"/>' +
  '<g transform="translate(512 512) scale(3.3) translate(-104 -36)">' +
  '<circle cx="50" cy="50" r="43" fill="none" stroke="#C6F432" stroke-width="16"/>' +
  '<g stroke="#C6F432" stroke-width="9" stroke-linecap="round" fill="none"><path d="M50 50V22"/><path d="M50 50L64.7 41.5"/></g>' +
  '<circle cx="50" cy="50" r="7" fill="#C6F432"/>' +
  '<path fill="#C6F432" d="M114 100V0H131L180 73V-2H165L188 -31L211 -2H196V100H179L130 27V100Z"/>' +
  "</g></svg>";

export const LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`;
