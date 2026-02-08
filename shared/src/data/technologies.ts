// ============================================================
// Empires Risen - Technology Definitions
// Complete tech tree with all researchable upgrades
// ============================================================

import { TechStats, Age } from '../types';

export const TECHNOLOGIES: Record<string, TechStats> = {
  // ===== AGE ADVANCEMENT =====
  feudalAge: {
    id: 'feudalAge', name: 'Feudal Age', age: Age.Dark,
    cost: { food: 500, wood: 0, gold: 0, stone: 0 }, researchTime: 130,
    researchedAt: 'townCenter',
    effects: [{ type: 'special', description: 'Advance to the Feudal Age. Unlocks new buildings and units.' }],
    description: 'Advance to the Feudal Age.', iconKey: 'tech_feudal_age',
  },
  castleAge: {
    id: 'castleAge', name: 'Castle Age', age: Age.Feudal,
    cost: { food: 800, wood: 200, gold: 0, stone: 0 }, researchTime: 160,
    researchedAt: 'townCenter', prerequisites: ['feudalAge'],
    effects: [{ type: 'special', description: 'Advance to the Castle Age.' }],
    description: 'Advance to the Castle Age.', iconKey: 'tech_castle_age',
  },
  imperialAge: {
    id: 'imperialAge', name: 'Imperial Age', age: Age.Castle,
    cost: { food: 1000, wood: 0, gold: 800, stone: 0 }, researchTime: 190,
    researchedAt: 'townCenter', prerequisites: ['castleAge'],
    effects: [{ type: 'special', description: 'Advance to the Imperial Age.' }],
    description: 'Advance to the Imperial Age.', iconKey: 'tech_imperial_age',
  },

  // ===== TOWN CENTER TECHS =====
  loom: {
    id: 'loom', name: 'Loom', age: Age.Dark,
    cost: { food: 0, wood: 0, gold: 50, stone: 0 }, researchTime: 25,
    researchedAt: 'townCenter',
    effects: [
      { type: 'stat_modifier', target: 'villager', stat: 'hp', value: 15, mode: 'add', description: '+15 HP' },
      { type: 'stat_modifier', target: 'villager', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'villager', stat: 'pierceArmor', value: 2, mode: 'add', description: '+2 pierce armor' },
    ],
    description: 'Villagers +15 HP, +1/+2 armor.', iconKey: 'tech_loom',
  },
  wheelbarrow: {
    id: 'wheelbarrow', name: 'Wheelbarrow', age: Age.Feudal,
    cost: { food: 175, wood: 50, gold: 0, stone: 0 }, researchTime: 75,
    researchedAt: 'townCenter',
    effects: [
      { type: 'stat_modifier', target: 'villager', stat: 'speed', value: 1.1, mode: 'multiply', description: '+10% speed' },
      { type: 'resource_bonus', stat: 'carryCapacity', value: 3, mode: 'add', description: '+3 carry capacity' },
    ],
    description: 'Villagers move 10% faster, carry +3.', iconKey: 'tech_wheelbarrow',
  },
  handCart: {
    id: 'handCart', name: 'Hand Cart', age: Age.Castle,
    cost: { food: 300, wood: 200, gold: 0, stone: 0 }, researchTime: 55,
    researchedAt: 'townCenter', prerequisites: ['wheelbarrow'],
    effects: [
      { type: 'stat_modifier', target: 'villager', stat: 'speed', value: 1.1, mode: 'multiply', description: '+10% speed' },
      { type: 'resource_bonus', stat: 'carryCapacity', value: 7, mode: 'add', description: '+7 carry capacity' },
    ],
    description: 'Villagers move 10% faster, carry +7.', iconKey: 'tech_hand_cart',
  },
  townWatch: {
    id: 'townWatch', name: 'Town Watch', age: Age.Feudal,
    cost: { food: 75, wood: 0, gold: 0, stone: 0 }, researchTime: 25,
    researchedAt: 'townCenter',
    effects: [{ type: 'stat_modifier', target: 'building', stat: 'lineOfSight', value: 4, mode: 'add', description: '+4 LOS' }],
    description: 'Buildings +4 Line of Sight.', iconKey: 'tech_town_watch',
  },
  townPatrol: {
    id: 'townPatrol', name: 'Town Patrol', age: Age.Castle,
    cost: { food: 300, wood: 0, gold: 100, stone: 0 }, researchTime: 40,
    researchedAt: 'townCenter', prerequisites: ['townWatch'],
    effects: [{ type: 'stat_modifier', target: 'building', stat: 'lineOfSight', value: 4, mode: 'add', description: '+4 LOS' }],
    description: 'Buildings +4 Line of Sight.', iconKey: 'tech_town_patrol',
  },

  // ===== MILL TECHS (Farming) =====
  horseCollar: {
    id: 'horseCollar', name: 'Horse Collar', age: Age.Feudal,
    cost: { food: 75, wood: 75, gold: 0, stone: 0 }, researchTime: 20,
    researchedAt: 'mill',
    effects: [{ type: 'resource_bonus', description: 'Farms provide +75 food.' }],
    description: 'Farms provide +75 food.', iconKey: 'tech_horse_collar',
  },
  heavyPlow: {
    id: 'heavyPlow', name: 'Heavy Plow', age: Age.Castle,
    cost: { food: 125, wood: 125, gold: 0, stone: 0 }, researchTime: 40,
    researchedAt: 'mill', prerequisites: ['horseCollar'],
    effects: [
      { type: 'resource_bonus', description: 'Farms provide +125 food.' },
      { type: 'resource_bonus', stat: 'carryCapacity', value: 1, mode: 'add', description: 'Farmers carry +1.' },
    ],
    description: 'Farms +125 food, farmers carry +1.', iconKey: 'tech_heavy_plow',
  },
  cropRotation: {
    id: 'cropRotation', name: 'Crop Rotation', age: Age.Imperial,
    cost: { food: 250, wood: 250, gold: 0, stone: 0 }, researchTime: 70,
    researchedAt: 'mill', prerequisites: ['heavyPlow'],
    effects: [{ type: 'resource_bonus', description: 'Farms provide +175 food.' }],
    description: 'Farms provide +175 food.', iconKey: 'tech_crop_rotation',
  },

  // ===== LUMBER CAMP TECHS =====
  doubleBitAxe: {
    id: 'doubleBitAxe', name: 'Double-Bit Axe', age: Age.Feudal,
    cost: { food: 100, wood: 50, gold: 0, stone: 0 }, researchTime: 25,
    researchedAt: 'lumberCamp',
    effects: [{ type: 'resource_bonus', description: 'Lumberjacks 20% faster.' }],
    description: 'Lumberjacks work 20% faster.', iconKey: 'tech_double_bit_axe',
  },
  bowSaw: {
    id: 'bowSaw', name: 'Bow Saw', age: Age.Castle,
    cost: { food: 150, wood: 100, gold: 0, stone: 0 }, researchTime: 50,
    researchedAt: 'lumberCamp', prerequisites: ['doubleBitAxe'],
    effects: [{ type: 'resource_bonus', description: 'Lumberjacks 20% faster.' }],
    description: 'Lumberjacks work 20% faster.', iconKey: 'tech_bow_saw',
  },
  twoManSaw: {
    id: 'twoManSaw', name: 'Two-Man Saw', age: Age.Imperial,
    cost: { food: 300, wood: 200, gold: 0, stone: 0 }, researchTime: 100,
    researchedAt: 'lumberCamp', prerequisites: ['bowSaw'],
    effects: [{ type: 'resource_bonus', description: 'Lumberjacks 10% faster.' }],
    description: 'Lumberjacks work 10% faster.', iconKey: 'tech_two_man_saw',
  },

  // ===== MINING CAMP TECHS =====
  goldMining: {
    id: 'goldMining', name: 'Gold Mining', age: Age.Feudal,
    cost: { food: 100, wood: 75, gold: 0, stone: 0 }, researchTime: 30,
    researchedAt: 'miningCamp',
    effects: [{ type: 'resource_bonus', description: 'Gold miners 15% faster.' }],
    description: 'Gold miners work 15% faster.', iconKey: 'tech_gold_mining',
  },
  goldShaftMining: {
    id: 'goldShaftMining', name: 'Gold Shaft Mining', age: Age.Castle,
    cost: { food: 200, wood: 150, gold: 0, stone: 0 }, researchTime: 75,
    researchedAt: 'miningCamp', prerequisites: ['goldMining'],
    effects: [{ type: 'resource_bonus', description: 'Gold miners 15% faster.' }],
    description: 'Gold miners work 15% faster.', iconKey: 'tech_gold_shaft_mining',
  },
  stoneMining: {
    id: 'stoneMining', name: 'Stone Mining', age: Age.Feudal,
    cost: { food: 100, wood: 75, gold: 0, stone: 0 }, researchTime: 30,
    researchedAt: 'miningCamp',
    effects: [{ type: 'resource_bonus', description: 'Stone miners 15% faster.' }],
    description: 'Stone miners work 15% faster.', iconKey: 'tech_stone_mining',
  },
  stoneShaftMining: {
    id: 'stoneShaftMining', name: 'Stone Shaft Mining', age: Age.Castle,
    cost: { food: 200, wood: 150, gold: 0, stone: 0 }, researchTime: 75,
    researchedAt: 'miningCamp', prerequisites: ['stoneMining'],
    effects: [{ type: 'resource_bonus', description: 'Stone miners 15% faster.' }],
    description: 'Stone miners work 15% faster.', iconKey: 'tech_stone_shaft_mining',
  },

  // ===== BLACKSMITH TECHS =====
  // Infantry melee attack
  forgingInfantry: {
    id: 'forgingInfantry', name: 'Forging', age: Age.Feudal,
    cost: { food: 150, wood: 0, gold: 0, stone: 0 }, researchTime: 50,
    researchedAt: 'blacksmith',
    effects: [{ type: 'stat_modifier', target: 'infantry', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' }],
    description: 'Infantry +1 attack.', iconKey: 'tech_forging',
  },
  ironCastingInfantry: {
    id: 'ironCastingInfantry', name: 'Iron Casting', age: Age.Castle,
    cost: { food: 220, wood: 0, gold: 120, stone: 0 }, researchTime: 75,
    researchedAt: 'blacksmith', prerequisites: ['forgingInfantry'],
    effects: [{ type: 'stat_modifier', target: 'infantry', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' }],
    description: 'Infantry +1 attack.', iconKey: 'tech_iron_casting',
  },
  blastFurnaceInfantry: {
    id: 'blastFurnaceInfantry', name: 'Blast Furnace', age: Age.Imperial,
    cost: { food: 275, wood: 0, gold: 225, stone: 0 }, researchTime: 100,
    researchedAt: 'blacksmith', prerequisites: ['ironCastingInfantry'],
    effects: [{ type: 'stat_modifier', target: 'infantry', stat: 'attack', value: 2, mode: 'add', description: '+2 attack' }],
    description: 'Infantry +2 attack.', iconKey: 'tech_blast_furnace',
  },
  // Infantry armor
  scaleMailArmor: {
    id: 'scaleMailArmor', name: 'Scale Mail Armor', age: Age.Feudal,
    cost: { food: 100, wood: 0, gold: 0, stone: 0 }, researchTime: 40,
    researchedAt: 'blacksmith',
    effects: [
      { type: 'stat_modifier', target: 'infantry', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'infantry', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Infantry +1/+1 armor.', iconKey: 'tech_scale_mail_armor',
  },
  chainMailArmor: {
    id: 'chainMailArmor', name: 'Chain Mail Armor', age: Age.Castle,
    cost: { food: 200, wood: 0, gold: 100, stone: 0 }, researchTime: 55,
    researchedAt: 'blacksmith', prerequisites: ['scaleMailArmor'],
    effects: [
      { type: 'stat_modifier', target: 'infantry', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'infantry', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Infantry +1/+1 armor.', iconKey: 'tech_chain_mail_armor',
  },
  plateMailArmor: {
    id: 'plateMailArmor', name: 'Plate Mail Armor', age: Age.Imperial,
    cost: { food: 300, wood: 0, gold: 150, stone: 0 }, researchTime: 70,
    researchedAt: 'blacksmith', prerequisites: ['chainMailArmor'],
    effects: [
      { type: 'stat_modifier', target: 'infantry', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'infantry', stat: 'pierceArmor', value: 2, mode: 'add', description: '+2 pierce armor' },
    ],
    description: 'Infantry +1/+2 armor.', iconKey: 'tech_plate_mail_armor',
  },
  // Archer attack
  fletching: {
    id: 'fletching', name: 'Fletching', age: Age.Feudal,
    cost: { food: 100, wood: 0, gold: 50, stone: 0 }, researchTime: 30,
    researchedAt: 'blacksmith',
    effects: [
      { type: 'stat_modifier', target: 'archer', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' },
      { type: 'stat_modifier', target: 'archer', stat: 'range', value: 1, mode: 'add', description: '+1 range' },
    ],
    description: 'Archers +1 attack, +1 range.', iconKey: 'tech_fletching',
  },
  bodkinArrow: {
    id: 'bodkinArrow', name: 'Bodkin Arrow', age: Age.Castle,
    cost: { food: 200, wood: 0, gold: 100, stone: 0 }, researchTime: 50,
    researchedAt: 'blacksmith', prerequisites: ['fletching'],
    effects: [
      { type: 'stat_modifier', target: 'archer', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' },
      { type: 'stat_modifier', target: 'archer', stat: 'range', value: 1, mode: 'add', description: '+1 range' },
    ],
    description: 'Archers +1 attack, +1 range.', iconKey: 'tech_bodkin_arrow',
  },
  bracer: {
    id: 'bracer', name: 'Bracer', age: Age.Imperial,
    cost: { food: 300, wood: 0, gold: 150, stone: 0 }, researchTime: 70,
    researchedAt: 'blacksmith', prerequisites: ['bodkinArrow'],
    effects: [
      { type: 'stat_modifier', target: 'archer', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' },
      { type: 'stat_modifier', target: 'archer', stat: 'range', value: 1, mode: 'add', description: '+1 range' },
    ],
    description: 'Archers +1 attack, +1 range.', iconKey: 'tech_bracer',
  },
  // Archer armor
  paddedArcherArmor: {
    id: 'paddedArcherArmor', name: 'Padded Archer Armor', age: Age.Feudal,
    cost: { food: 100, wood: 0, gold: 0, stone: 0 }, researchTime: 40,
    researchedAt: 'blacksmith',
    effects: [
      { type: 'stat_modifier', target: 'archer', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'archer', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Archers +1/+1 armor.', iconKey: 'tech_padded_archer_armor',
  },
  leatherArcherArmor: {
    id: 'leatherArcherArmor', name: 'Leather Archer Armor', age: Age.Castle,
    cost: { food: 150, wood: 0, gold: 150, stone: 0 }, researchTime: 55,
    researchedAt: 'blacksmith', prerequisites: ['paddedArcherArmor'],
    effects: [
      { type: 'stat_modifier', target: 'archer', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'archer', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Archers +1/+1 armor.', iconKey: 'tech_leather_archer_armor',
  },
  ringArcherArmor: {
    id: 'ringArcherArmor', name: 'Ring Archer Armor', age: Age.Imperial,
    cost: { food: 250, wood: 0, gold: 250, stone: 0 }, researchTime: 70,
    researchedAt: 'blacksmith', prerequisites: ['leatherArcherArmor'],
    effects: [
      { type: 'stat_modifier', target: 'archer', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'archer', stat: 'pierceArmor', value: 2, mode: 'add', description: '+2 pierce armor' },
    ],
    description: 'Archers +1/+2 armor.', iconKey: 'tech_ring_archer_armor',
  },
  // Cavalry attack
  forgingCavalry: {
    id: 'forgingCavalry', name: 'Forging (Cavalry)', age: Age.Feudal,
    cost: { food: 150, wood: 0, gold: 0, stone: 0 }, researchTime: 50,
    researchedAt: 'blacksmith',
    effects: [{ type: 'stat_modifier', target: 'cavalry', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' }],
    description: 'Cavalry +1 attack.', iconKey: 'tech_forging_cavalry',
  },
  ironCastingCavalry: {
    id: 'ironCastingCavalry', name: 'Iron Casting (Cavalry)', age: Age.Castle,
    cost: { food: 220, wood: 0, gold: 120, stone: 0 }, researchTime: 75,
    researchedAt: 'blacksmith', prerequisites: ['forgingCavalry'],
    effects: [{ type: 'stat_modifier', target: 'cavalry', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' }],
    description: 'Cavalry +1 attack.', iconKey: 'tech_iron_casting_cavalry',
  },
  blastFurnaceCavalry: {
    id: 'blastFurnaceCavalry', name: 'Blast Furnace (Cavalry)', age: Age.Imperial,
    cost: { food: 275, wood: 0, gold: 225, stone: 0 }, researchTime: 100,
    researchedAt: 'blacksmith', prerequisites: ['ironCastingCavalry'],
    effects: [{ type: 'stat_modifier', target: 'cavalry', stat: 'attack', value: 2, mode: 'add', description: '+2 attack' }],
    description: 'Cavalry +2 attack.', iconKey: 'tech_blast_furnace_cavalry',
  },
  // Cavalry armor
  scaleBardingArmor: {
    id: 'scaleBardingArmor', name: 'Scale Barding Armor', age: Age.Feudal,
    cost: { food: 150, wood: 0, gold: 0, stone: 0 }, researchTime: 45,
    researchedAt: 'blacksmith',
    effects: [
      { type: 'stat_modifier', target: 'cavalry', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'cavalry', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Cavalry +1/+1 armor.', iconKey: 'tech_scale_barding_armor',
  },
  chainBardingArmor: {
    id: 'chainBardingArmor', name: 'Chain Barding Armor', age: Age.Castle,
    cost: { food: 250, wood: 0, gold: 150, stone: 0 }, researchTime: 60,
    researchedAt: 'blacksmith', prerequisites: ['scaleBardingArmor'],
    effects: [
      { type: 'stat_modifier', target: 'cavalry', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'cavalry', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Cavalry +1/+1 armor.', iconKey: 'tech_chain_barding_armor',
  },
  plateBardingArmor: {
    id: 'plateBardingArmor', name: 'Plate Barding Armor', age: Age.Imperial,
    cost: { food: 350, wood: 0, gold: 200, stone: 0 }, researchTime: 75,
    researchedAt: 'blacksmith', prerequisites: ['chainBardingArmor'],
    effects: [
      { type: 'stat_modifier', target: 'cavalry', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'cavalry', stat: 'pierceArmor', value: 2, mode: 'add', description: '+2 pierce armor' },
    ],
    description: 'Cavalry +1/+2 armor.', iconKey: 'tech_plate_barding_armor',
  },

  // ===== UNIVERSITY TECHS =====
  ballistics: {
    id: 'ballistics', name: 'Ballistics', age: Age.Castle,
    cost: { food: 0, wood: 300, gold: 175, stone: 0 }, researchTime: 60,
    researchedAt: 'university',
    effects: [{ type: 'special', description: 'Ranged units lead their targets.' }],
    description: 'Ranged units can target moving units accurately.', iconKey: 'tech_ballistics',
  },
  chemistry: {
    id: 'chemistry', name: 'Chemistry', age: Age.Imperial,
    cost: { food: 300, wood: 0, gold: 200, stone: 0 }, researchTime: 100,
    researchedAt: 'university',
    effects: [
      { type: 'stat_modifier', target: 'archer', stat: 'attack', value: 1, mode: 'add', description: '+1 attack' },
      { type: 'ability_unlock', description: 'Enables gunpowder units.' },
    ],
    description: 'Archers +1 attack, gunpowder units enabled.', iconKey: 'tech_chemistry',
  },
  masonry: {
    id: 'masonry', name: 'Masonry', age: Age.Castle,
    cost: { food: 150, wood: 175, gold: 0, stone: 0 }, researchTime: 50,
    researchedAt: 'university',
    effects: [
      { type: 'stat_modifier', target: 'building', stat: 'hp', value: 1.1, mode: 'multiply', description: '+10% HP' },
      { type: 'stat_modifier', target: 'building', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'building', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Buildings +10% HP, +1/+1 armor.', iconKey: 'tech_masonry',
  },
  architecture: {
    id: 'architecture', name: 'Architecture', age: Age.Imperial,
    cost: { food: 200, wood: 300, gold: 0, stone: 0 }, researchTime: 70,
    researchedAt: 'university', prerequisites: ['masonry'],
    effects: [
      { type: 'stat_modifier', target: 'building', stat: 'hp', value: 1.1, mode: 'multiply', description: '+10% HP' },
      { type: 'stat_modifier', target: 'building', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'building', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
    ],
    description: 'Buildings +10% HP, +1/+1 armor.', iconKey: 'tech_architecture',
  },
  murderHoles: {
    id: 'murderHoles', name: 'Murder Holes', age: Age.Castle,
    cost: { food: 200, wood: 0, gold: 0, stone: 100 }, researchTime: 60,
    researchedAt: 'university',
    effects: [{ type: 'special', description: 'Castles and towers eliminate minimum range.' }],
    description: 'Remove minimum range on Castles and Towers.', iconKey: 'tech_murder_holes',
  },
  treadmillCrane: {
    id: 'treadmillCrane', name: 'Treadmill Crane', age: Age.Castle,
    cost: { food: 200, wood: 300, gold: 0, stone: 0 }, researchTime: 50,
    researchedAt: 'university',
    effects: [{ type: 'resource_bonus', description: 'Villagers build 20% faster.' }],
    description: 'Villagers construct buildings 20% faster.', iconKey: 'tech_treadmill_crane',
  },
  siegeEngineers: {
    id: 'siegeEngineers', name: 'Siege Engineers', age: Age.Imperial,
    cost: { food: 200, wood: 0, gold: 200, stone: 0 }, researchTime: 45,
    researchedAt: 'university',
    effects: [
      { type: 'stat_modifier', target: 'siege', stat: 'range', value: 1, mode: 'add', description: '+1 range' },
      { type: 'stat_modifier', target: 'siege', stat: 'attack', value: 1.2, mode: 'multiply', description: '+20% vs buildings' },
    ],
    description: 'Siege +1 range, +20% attack vs buildings.', iconKey: 'tech_siege_engineers',
  },
  arrowslits: {
    id: 'arrowslits', name: 'Arrowslits', age: Age.Imperial,
    cost: { food: 150, wood: 150, gold: 0, stone: 0 }, researchTime: 50,
    researchedAt: 'university',
    effects: [{ type: 'stat_modifier', target: 'tower', stat: 'attack', value: 3, mode: 'add', description: '+3 attack' }],
    description: 'Towers +3 attack.', iconKey: 'tech_arrowslits',
  },
  heatedShot: {
    id: 'heatedShot', name: 'Heated Shot', age: Age.Castle,
    cost: { food: 0, wood: 0, gold: 100, stone: 0 }, researchTime: 30,
    researchedAt: 'university',
    effects: [{ type: 'stat_modifier', target: 'tower', stat: 'attack', value: 4, mode: 'add', description: '+4 vs ships' }],
    description: 'Towers +4 attack vs ships.', iconKey: 'tech_heated_shot',
  },

  // ===== BARRACKS TECHS =====
  supplies: {
    id: 'supplies', name: 'Supplies', age: Age.Feudal,
    cost: { food: 75, wood: 75, gold: 0, stone: 0 }, researchTime: 20,
    researchedAt: 'barracks',
    effects: [{ type: 'resource_bonus', description: 'Militia-line costs -15 food.' }],
    description: 'Militia-line costs -15 food.', iconKey: 'tech_supplies',
  },
  squires: {
    id: 'squires', name: 'Squires', age: Age.Castle,
    cost: { food: 100, wood: 0, gold: 0, stone: 0 }, researchTime: 40,
    researchedAt: 'barracks',
    effects: [{ type: 'stat_modifier', target: 'infantry', stat: 'speed', value: 1.1, mode: 'multiply', description: '+10% speed' }],
    description: 'Infantry move 10% faster.', iconKey: 'tech_squires',
  },
  arson: {
    id: 'arson', name: 'Arson', age: Age.Castle,
    cost: { food: 150, wood: 0, gold: 50, stone: 0 }, researchTime: 25,
    researchedAt: 'barracks',
    effects: [{ type: 'stat_modifier', target: 'infantry', stat: 'attack', value: 2, mode: 'add', description: '+2 vs buildings' }],
    description: 'Infantry +2 attack vs buildings.', iconKey: 'tech_arson',
  },

  // ===== ARCHERY RANGE TECHS =====
  thumbRing: {
    id: 'thumbRing', name: 'Thumb Ring', age: Age.Castle,
    cost: { food: 300, wood: 250, gold: 0, stone: 0 }, researchTime: 45,
    researchedAt: 'archeryRange',
    effects: [
      { type: 'special', description: 'Archers fire 18% faster, 100% accuracy.' },
    ],
    description: 'Archers fire faster with 100% accuracy.', iconKey: 'tech_thumb_ring',
  },
  parthianTactics: {
    id: 'parthianTactics', name: 'Parthian Tactics', age: Age.Imperial,
    cost: { food: 200, wood: 0, gold: 250, stone: 0 }, researchTime: 65,
    researchedAt: 'archeryRange',
    effects: [
      { type: 'stat_modifier', target: 'cavalryArcher', stat: 'meleeArmor', value: 1, mode: 'add', description: '+1 melee armor' },
      { type: 'stat_modifier', target: 'cavalryArcher', stat: 'pierceArmor', value: 2, mode: 'add', description: '+2 pierce armor' },
    ],
    description: 'Cavalry Archers +1/+2 armor, +4 vs spearmen.', iconKey: 'tech_parthian_tactics',
  },

  // ===== STABLE TECHS =====
  bloodlines: {
    id: 'bloodlines', name: 'Bloodlines', age: Age.Feudal,
    cost: { food: 150, wood: 0, gold: 100, stone: 0 }, researchTime: 50,
    researchedAt: 'stable',
    effects: [{ type: 'stat_modifier', target: 'cavalry', stat: 'hp', value: 20, mode: 'add', description: '+20 HP' }],
    description: 'Cavalry +20 HP.', iconKey: 'tech_bloodlines',
  },
  husbandry: {
    id: 'husbandry', name: 'Husbandry', age: Age.Castle,
    cost: { food: 150, wood: 0, gold: 0, stone: 0 }, researchTime: 40,
    researchedAt: 'stable',
    effects: [{ type: 'stat_modifier', target: 'cavalry', stat: 'speed', value: 1.1, mode: 'multiply', description: '+10% speed' }],
    description: 'Cavalry +10% speed.', iconKey: 'tech_husbandry',
  },

  // ===== CASTLE TECHS =====
  conscription: {
    id: 'conscription', name: 'Conscription', age: Age.Imperial,
    cost: { food: 150, wood: 0, gold: 150, stone: 0 }, researchTime: 60,
    researchedAt: 'castle',
    effects: [{ type: 'resource_bonus', description: 'Military units train 33% faster.' }],
    description: 'Military units train 33% faster.', iconKey: 'tech_conscription',
  },
  hoardings: {
    id: 'hoardings', name: 'Hoardings', age: Age.Imperial,
    cost: { food: 400, wood: 400, gold: 0, stone: 0 }, researchTime: 75,
    researchedAt: 'castle',
    effects: [{ type: 'stat_modifier', target: 'castle', stat: 'hp', value: 1500, mode: 'add', description: '+1500 HP' }],
    description: 'Castles +1500 HP.', iconKey: 'tech_hoardings',
  },
  sappers: {
    id: 'sappers', name: 'Sappers', age: Age.Imperial,
    cost: { food: 400, wood: 0, gold: 200, stone: 0 }, researchTime: 20,
    researchedAt: 'castle',
    effects: [{ type: 'stat_modifier', target: 'infantry', stat: 'attack', value: 15, mode: 'add', description: '+15 vs buildings' }],
    description: 'Villagers +15 attack vs buildings.', iconKey: 'tech_sappers',
  },

  // ===== DOCK TECHS =====
  gillnets: {
    id: 'gillnets', name: 'Gillnets', age: Age.Castle,
    cost: { food: 150, wood: 200, gold: 0, stone: 0 }, researchTime: 40,
    researchedAt: 'dock',
    effects: [{ type: 'resource_bonus', description: 'Fishing Ships gather 25% faster.' }],
    description: 'Fishing Ships work 25% faster.', iconKey: 'tech_gillnets',
  },
  careening: {
    id: 'careening', name: 'Careening', age: Age.Castle,
    cost: { food: 250, wood: 0, gold: 150, stone: 0 }, researchTime: 50,
    researchedAt: 'dock',
    effects: [
      { type: 'stat_modifier', target: 'naval', stat: 'pierceArmor', value: 1, mode: 'add', description: '+1 pierce armor' },
      { type: 'stat_modifier', target: 'transportShip', stat: 'garrisonCapacity', value: 5, mode: 'add', description: '+5 capacity' },
    ],
    description: 'Ships +1 pierce armor, transports +5.', iconKey: 'tech_careening',
  },
  dryDock: {
    id: 'dryDock', name: 'Dry Dock', age: Age.Imperial,
    cost: { food: 200, wood: 0, gold: 250, stone: 0 }, researchTime: 60,
    researchedAt: 'dock',
    effects: [{ type: 'stat_modifier', target: 'naval', stat: 'speed', value: 1.15, mode: 'multiply', description: '+15% speed' }],
    description: 'Ships move 15% faster.', iconKey: 'tech_dry_dock',
  },
  shipwright: {
    id: 'shipwright', name: 'Shipwright', age: Age.Imperial,
    cost: { food: 200, wood: 300, gold: 0, stone: 0 }, researchTime: 60,
    researchedAt: 'dock',
    effects: [{ type: 'resource_bonus', description: 'Ships -20% wood cost.' }],
    description: 'Ships cost 20% less wood.', iconKey: 'tech_shipwright',
  },

  // ===== MARKET TECHS =====
  coinage: {
    id: 'coinage', name: 'Coinage', age: Age.Castle,
    cost: { food: 200, wood: 0, gold: 100, stone: 0 }, researchTime: 50,
    researchedAt: 'market',
    effects: [{ type: 'resource_bonus', description: 'Tribute fee -20%.' }],
    description: 'Tribute fee reduced.', iconKey: 'tech_coinage',
  },
  banking: {
    id: 'banking', name: 'Banking', age: Age.Imperial,
    cost: { food: 200, wood: 0, gold: 300, stone: 0 }, researchTime: 70,
    researchedAt: 'market', prerequisites: ['coinage'],
    effects: [{ type: 'resource_bonus', description: 'Tribute is free.' }],
    description: 'Eliminate tribute fee.', iconKey: 'tech_banking',
  },
  caravan: {
    id: 'caravan', name: 'Caravan', age: Age.Castle,
    cost: { food: 200, wood: 0, gold: 200, stone: 0 }, researchTime: 40,
    researchedAt: 'market',
    effects: [{ type: 'stat_modifier', target: 'tradeCart', stat: 'speed', value: 1.5, mode: 'multiply', description: '+50% speed' }],
    description: 'Trade units move 50% faster.', iconKey: 'tech_caravan',
  },
  guilds: {
    id: 'guilds', name: 'Guilds', age: Age.Imperial,
    cost: { food: 200, wood: 0, gold: 200, stone: 0 }, researchTime: 50,
    researchedAt: 'market',
    effects: [{ type: 'resource_bonus', description: 'Commodity trading fee -15%.' }],
    description: 'Reduce commodity trading fee.', iconKey: 'tech_guilds',
  },

  // ===== MONASTERY TECHS =====
  redemption: {
    id: 'redemption', name: 'Redemption', age: Age.Castle,
    cost: { food: 0, wood: 0, gold: 475, stone: 0 }, researchTime: 50,
    researchedAt: 'monastery',
    effects: [{ type: 'ability_unlock', description: 'Monks can convert buildings and siege.' }],
    description: 'Monks can convert buildings and siege.', iconKey: 'tech_redemption',
  },
  atonement: {
    id: 'atonement', name: 'Atonement', age: Age.Castle,
    cost: { food: 0, wood: 0, gold: 325, stone: 0 }, researchTime: 40,
    researchedAt: 'monastery',
    effects: [{ type: 'ability_unlock', description: 'Monks can convert other monks.' }],
    description: 'Monks can convert other monks.', iconKey: 'tech_atonement',
  },
  herbalMedicine: {
    id: 'herbalMedicine', name: 'Herbal Medicine', age: Age.Castle,
    cost: { food: 0, wood: 0, gold: 350, stone: 0 }, researchTime: 35,
    researchedAt: 'monastery',
    effects: [{ type: 'special', description: 'Garrisoned units heal 6x faster.' }],
    description: 'Garrisoned units heal 6x faster.', iconKey: 'tech_herbal_medicine',
  },
  heresy: {
    id: 'heresy', name: 'Heresy', age: Age.Castle,
    cost: { food: 0, wood: 0, gold: 1000, stone: 0 }, researchTime: 60,
    researchedAt: 'monastery',
    effects: [{ type: 'special', description: 'Converted units die instead of switching.' }],
    description: 'Your units die instead of being converted.', iconKey: 'tech_heresy',
  },
  sanctity: {
    id: 'sanctity', name: 'Sanctity', age: Age.Castle,
    cost: { food: 0, wood: 0, gold: 120, stone: 0 }, researchTime: 60,
    researchedAt: 'monastery',
    effects: [{ type: 'stat_modifier', target: 'monk', stat: 'hp', value: 15, mode: 'add', description: '+15 HP' }],
    description: 'Monks +15 HP.', iconKey: 'tech_sanctity',
  },
  fervor: {
    id: 'fervor', name: 'Fervor', age: Age.Castle,
    cost: { food: 0, wood: 0, gold: 140, stone: 0 }, researchTime: 50,
    researchedAt: 'monastery',
    effects: [{ type: 'stat_modifier', target: 'monk', stat: 'speed', value: 1.15, mode: 'multiply', description: '+15% speed' }],
    description: 'Monks move 15% faster.', iconKey: 'tech_fervor',
  },
  illumination: {
    id: 'illumination', name: 'Illumination', age: Age.Imperial,
    cost: { food: 0, wood: 0, gold: 120, stone: 0 }, researchTime: 65,
    researchedAt: 'monastery',
    effects: [{ type: 'special', description: 'Monks regain faith 50% faster.' }],
    description: 'Monks regain faith 50% faster after converting.', iconKey: 'tech_illumination',
  },
  blockPrinting: {
    id: 'blockPrinting', name: 'Block Printing', age: Age.Imperial,
    cost: { food: 0, wood: 0, gold: 200, stone: 0 }, researchTime: 45,
    researchedAt: 'monastery',
    effects: [{ type: 'stat_modifier', target: 'monk', stat: 'conversionRange', value: 3, mode: 'add', description: '+3 range' }],
    description: 'Monks +3 conversion range.', iconKey: 'tech_block_printing',
  },
  theocracy: {
    id: 'theocracy', name: 'Theocracy', age: Age.Imperial,
    cost: { food: 0, wood: 0, gold: 200, stone: 0 }, researchTime: 75,
    researchedAt: 'monastery',
    effects: [{ type: 'special', description: 'Only one monk rests after group conversion.' }],
    description: 'Only 1 Monk in group needs to rest after conversion.', iconKey: 'tech_theocracy',
  },
  faith: {
    id: 'faith', name: 'Faith', age: Age.Imperial,
    cost: { food: 200, wood: 0, gold: 1000, stone: 0 }, researchTime: 60,
    researchedAt: 'monastery',
    effects: [{ type: 'special', description: 'All units resist conversion.' }],
    description: 'Units take more time to be converted.', iconKey: 'tech_faith',
  },
};
