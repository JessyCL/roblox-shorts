// BrickColor palette (Roblox colour names -> sRGB hex) and colour parsing for the world module.
// Productions may pass colours as BrickColor names ('Bright red', 'bright_red', 'brightRed' all work), '#rrggbb',
// numbers (0xrrggbb) or [r,g,b] 0-255 arrays. Values are Roblox's published BrickColor RGBs (style reference only).
import * as THREE from 'three';

export const BRICK = {
  'White': '#f2f3f3', 'Grey': '#a1a5a2', 'Light yellow': '#f9e999', 'Brick yellow': '#d7c59a', 'Light green (Mint)': '#c2dab8',
  'Light reddish violet': '#e8bac8', 'Pastel Blue': '#80bbdb', 'Light orange brown': '#cb8442', 'Nougat': '#cc8e69',
  'Bright red': '#c4281c', 'Med. reddish violet': '#c470a0', 'Bright blue': '#0d69ac', 'Bright yellow': '#f5cd30',
  'Earth orange': '#624732', 'Black': '#1b2a35', 'Dark grey': '#6d6e6c', 'Dark green': '#287f47', 'Medium green': '#a1c48c',
  'Lig. Yellowich orange': '#f3cf9b', 'Bright green': '#4b974b', 'Dark orange': '#a05f35', 'Light bluish violet': '#c1cade',
  'Light blue': '#b4d2e4', 'Bright orange': '#da8541', 'Bright bluish green': '#008f9c', 'Earth green': '#27462d',
  'Sand blue': '#74869d', 'Sand violet': '#877c90', 'Medium orange': '#e09864', 'Sand yellow': '#958a73', 'Earth blue': '#203a56',
  'Sand green': '#789082', 'Sand red': '#957977', 'Dark red': '#7b2e2f', 'Medium stone grey': '#a3a2a5', 'Dark stone grey': '#635f62',
  'Light stone grey': '#e5e4df', 'Really black': '#111111', 'Really red': '#ff0000', 'Really blue': '#0000ff', 'Deep orange': '#ffb000',
  'New Yeller': '#ffff00', 'Lime green': '#00ff00', 'Toothpaste': '#00ffff', 'Hot pink': '#ff00bf', 'Magenta': '#aa00aa',
  'Pink': '#ff66cc', 'Institutional white': '#f8f8f8', 'Cyan': '#04afec', 'Electric blue': '#0989cf', 'Teal': '#12eed4',
  'Royal purple': '#6225d1', 'Alder': '#b480ff', 'Lavender': '#8c5b9f', 'Pastel brown': '#ffcc99', 'Brown': '#7c5c46',
  'Reddish brown': '#694028', 'Burnt Sienna': '#6a3909', 'Dark taupe': '#5a4c42', 'Light orange': '#eab892',
  'Br. yellowish green': '#a4bd47', 'Br. yellowish orange': '#e29b40', 'Bright violet': '#6b327c', 'Camo': '#3a7d15',
  'Grime': '#7f8e64', 'Sea green': '#348e40', 'Shamrock': '#5b9a4c', 'Moss': '#7c9c6b', 'Olive': '#c1be42', 'Navy blue': '#002060',
  'Deep blue': '#2154b9', 'Storm blue': '#335882', 'Steel blue': '#527cae', 'Baby blue': '#98c2db', 'Pastel blue-green': '#9ff3e9',
  'Pastel light blue': '#afddff', 'Persimmon': '#ff5959', 'Crimson': '#970000', 'Maroon': '#750000', 'Wheat': '#f1e7c7',
  'Cork': '#bc9b5d', 'Fawn brown': '#a0844f', 'Pine Cone': '#6c584b', 'Salmon': '#ff9494', 'CGA brown': '#aa5500',
  'Mulberry': '#592259', 'Smoky grey': '#5b5d69', 'Fossil': '#9fa1ac', 'Medium blue': '#6e99ca', 'Neon orange': '#d5733d',
  'Gold': '#efb838', 'Daisy orange': '#f8d96d', 'Mint': '#b1e5a6', 'Lily white': '#edeaea', 'Ghost grey': '#cacbd1', 'Pearl': '#e7e7ec',
  'Carnation pink': '#ff98dc', 'Lilac': '#a75e9b', 'Plum': '#7b2f7b', 'Eggplant': '#7b007b', 'Sunrise': '#d490bd',
  'Terra Cotta': '#be6862', 'Dusty Rose': '#a34b4b', 'Tawny': '#965555', 'Rust': '#8f4c2a', 'Cocoa': '#562424', 'Bronze': '#7e683f',
  'Khaki': '#e2dcbc', 'Beige': '#cabfa3', 'Linen': '#c7ac78', 'Seashell': '#fef3bb', 'Medium red': '#da867a', 'Dark indigo': '#3d1585',
  'Lapis': '#102adc', 'Cool yellow': '#fdea8d', 'Pastel green': '#ccffcc', 'Pastel yellow': '#ffffcc', 'Pastel orange': '#ffc9c9',
  'Pastel violet': '#b1a7ff', 'Bright reddish violet': '#923978', 'Light grey': '#c7c1b7', 'Flint': '#696665', 'Mid gray': '#cdcdcd',
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const LOOKUP = new Map(Object.entries(BRICK).map(([k, v]) => [norm(k), v]));

// -> THREE.Color (linear working space, as three expects). Unknown names throw so typos surface at build time.
export function toColor(c, fallback = '#a3a2a5') {
  if (c == null) c = fallback;
  if (c.isColor) return c.clone();
  if (Array.isArray(c)) return new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
  if (typeof c === 'number') return new THREE.Color(c);
  if (typeof c === 'string' && c[0] !== '#') {
    const hex = LOOKUP.get(norm(c));
    if (!hex) throw new Error(`world: unknown colour "${c}" (use a BrickColor name or #hex)`);
    return new THREE.Color(hex);
  }
  return new THREE.Color(c);
}
// Stable string key for caches.
export const colorKey = (c) => (c == null ? 'default' : '#' + toColor(c).getHexString());
