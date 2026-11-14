import { PALETTE_REGISTRY } from './palette-token';
import { PaletteService } from './palette.service';

export const PALETTE_PROVIDER = { provide: PALETTE_REGISTRY, useValue: PaletteService };
