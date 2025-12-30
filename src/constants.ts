import { LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
  { id: 1, gridSize: 3, activeNodes: 3, flashSpeed: 2000, description: 'Standard pattern recognition.' },
  { id: 2, gridSize: 3, activeNodes: 4, flashSpeed: 2000, description: 'Increased node density.' },
  { id: 3, gridSize: 4, activeNodes: 4, flashSpeed: 1000, description: 'High-speed 1s pulse.' },
  { id: 4, gridSize: 4, activeNodes: 5, flashSpeed: 2000, description: 'Spatial expansion.' },
  { id: 5, gridSize: 5, activeNodes: 5, flashSpeed: 2000, description: '5x5 Grid initialization.' },
  { id: 6, gridSize: 5, activeNodes: 6, flashSpeed: 3000, description: 'Extended retention phase.' },
  { id: 7, gridSize: 5, activeNodes: 7, flashSpeed: 4000, description: 'Ignore Red Decoys.', hasDecoys: true },
  { id: 8, gridSize: 6, activeNodes: 8, flashSpeed: 5000, description: 'High volume pattern scanning.' },
  { id: 9, gridSize: 7, activeNodes: 8, flashSpeed: 5000, description: 'Extreme 7x7 orientation.' },
  { id: 10, gridSize: 7, activeNodes: 8, flashSpeed: 5000, description: '90° Mental Rotation Protocol.', rotationDegrees: 90 },
];

