export enum ComponentType {
  WIRE = 'WIRE',
  RESISTOR = 'RESISTOR',
  BATTERY = 'BATTERY',
  LIGHTBULB = 'LIGHTBULB',
  SWITCH = 'SWITCH',
  VOLTMETER = 'VOLTMETER',
  AMMETER = 'AMMETER',
  CAPACITOR = 'CAPACITOR',
  INDUCTOR = 'INDUCTOR'
}

export interface Point {
  x: number;
  y: number;
  id: string; // Unique ID for the connection point (handle)
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  p1: Point;
  p2: Point;
  properties: {
    resistance?: number; // Ohms
    voltage?: number; // Volts
    isOpen?: boolean; // For switch
    capacitance?: number; // Farads
    inductance?: number; // Henrys
  };
  // Calculated state from solver
  current: number; // Amps
  voltageDrop: number; // Volts
  p1Potential: number; // Volts relative to ground
  p2Potential: number;
  
  // History for transient analysis
  prevCurrent?: number;
  prevP1Potential?: number;
  prevP2Potential?: number;
}

export interface SolverResult {
  pointPotentials: Map<string, number>; // NodeId -> Voltage
  componentCurrents: Map<string, number>; // ComponentId -> Current
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}