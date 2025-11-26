import { CircuitComponent, ComponentType } from '../types';

// A small resistance for wires/closed switches to avoid singular matrices
const EPSILON_RESISTANCE = 1e-6; 
// High resistance for open switches
const INFINITE_RESISTANCE = 1e9;

/**
 * Solves the circuit using Modified Nodal Analysis (MNA).
 * Supports Transient Analysis for Capacitors and Inductors if dt > 0.
 */
export const solveCircuit = (
  components: CircuitComponent[], 
  dt: number = 0.1 // Time step in seconds (simulated time)
): { 
  pointPotentials: Map<string, number>, 
  componentCurrents: Map<string, number> 
} => {
  // 1. Identify Nodes
  const SNAP_DISTANCE = 10;
  const points: { id: string, x: number, y: number, compId: string }[] = [];
  
  components.forEach(c => {
    points.push({ ...c.p1, compId: c.id });
    points.push({ ...c.p2, compId: c.id });
  });

  // Map point ID to Node Index
  const pointToNode = new Map<string, number>();
  const nodeLocations: {x: number, y: number}[] = [];
  let nodeCount = 0;

  const assignedPoints = new Set<string>();

  for (let i = 0; i < points.length; i++) {
    if (assignedPoints.has(points[i].id)) continue;

    // Start a new node
    const nodeId = nodeCount++;
    pointToNode.set(points[i].id, nodeId);
    assignedPoints.add(points[i].id);
    nodeLocations[nodeId] = {x: points[i].x, y: points[i].y};

    // Find all connected points (overlapping coordinates)
    for (let j = i + 1; j < points.length; j++) {
      if (assignedPoints.has(points[j].id)) continue;
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (dist < SNAP_DISTANCE) {
        pointToNode.set(points[j].id, nodeId);
        assignedPoints.add(points[j].id);
      }
    }
  }

  // If no nodes, return empty
  if (nodeCount === 0) {
    return { pointPotentials: new Map(), componentCurrents: new Map() };
  }

  // 2. Build MNA Matrix
  // Size = (NodeCount - 1) + VoltageSourceCount
  // We treat Node 0 as Ground (Reference)
  
  // Identify Voltage Sources (Battery) to size matrix
  const voltageSources = components.filter(c => c.type === ComponentType.BATTERY);
  const mSize = (nodeCount - 1) + voltageSources.length;
  
  // Initialize Matrix A (mSize x mSize) and Vector Z (mSize)
  const A: number[][] = Array(mSize).fill(0).map(() => Array(mSize).fill(0));
  const Z: number[] = Array(mSize).fill(0);

  // Helper to add conductance to A
  // nodes are 0-indexed. Node 0 is ground and is skipped in matrix rows/cols (conceptually)
  const addConductance = (n1: number, n2: number, g: number) => {
    if (n1 > 0) A[n1 - 1][n1 - 1] += g;
    if (n2 > 0) A[n2 - 1][n2 - 1] += g;
    if (n1 > 0 && n2 > 0) {
      A[n1 - 1][n2 - 1] -= g;
      A[n2 - 1][n1 - 1] -= g;
    }
  };

  const addCurrentSource = (n1: number, n2: number, i: number) => {
    // Current flows from n1 to n2
    // Entering a node is negative in Z (Ax=Z convention varies, here Z is sum of currents entering)
    // Actually, MNA: Sum(Conductance * V) = Sum(Current Sources Entering)
    if (n1 > 0) Z[n1 - 1] -= i; // Leaving n1
    if (n2 > 0) Z[n2 - 1] += i; // Entering n2
  };

  // Fill Matrix with Components
  components.forEach(comp => {
    if (comp.type === ComponentType.BATTERY) return; // Handled later

    const n1 = pointToNode.get(comp.p1.id)!;
    const n2 = pointToNode.get(comp.p2.id)!;
    
    if (n1 === n2) return; // Component shorted

    let conductance = 0;
    let currentSource = 0; // Parallel current source (Norton equivalent)

    if (comp.type === ComponentType.RESISTOR || comp.type === ComponentType.LIGHTBULB) {
        conductance = 1 / (comp.properties.resistance || 10);
    } 
    else if (comp.type === ComponentType.SWITCH) {
        conductance = 1 / (comp.properties.isOpen ? INFINITE_RESISTANCE : EPSILON_RESISTANCE);
    }
    else if (comp.type === ComponentType.WIRE || comp.type === ComponentType.AMMETER) {
        conductance = 1 / EPSILON_RESISTANCE;
    }
    else if (comp.type === ComponentType.VOLTMETER) {
        conductance = 1 / INFINITE_RESISTANCE;
    }
    else if (comp.type === ComponentType.CAPACITOR) {
        // Backward Euler: C * dV/dt ~ C * (V - Vold) / dt
        // I = (C/dt)*V - (C/dt)*Vold
        // Model as Resistor (Req = dt/C) in parallel with Current Source (Ieq = (C/dt)*Vold)
        const C = comp.properties.capacitance || 0.0001; // Default 100uF
        if (dt > 0) {
            conductance = C / dt;
            const vOld = (comp.prevP1Potential || 0) - (comp.prevP2Potential || 0);
            // Current source J = G * vOld. Flows from neg to pos in model? 
            // I = G*V - J.  If V=Vold, I=0. Correct.
            // This J is a current source flowing from node 2 to node 1 (countering the potential).
            // So we add J entering Node 1 and leaving Node 2.
            currentSource = -conductance * vOld;
        } else {
            conductance = 1 / INFINITE_RESISTANCE; // DC Steady State = Open
        }
    }
    else if (comp.type === ComponentType.INDUCTOR) {
        // Backward Euler: V = L * dI/dt ~ L * (I - Iold) / dt
        // I = Iold + (dt/L)*V
        // Model as Resistor (Req = L/dt) in parallel with Current Source (Ieq = Iold)
        const L = comp.properties.inductance || 1; // Default 1H
        if (dt > 0) {
            conductance = dt / L;
            // Current source J = Iold.
            // Current flows from n1 to n2.
            // I_total = G*V + I_old.
            // Current source of magnitude I_old flowing from n1 to n2 (parallel to conductance).
            // So we add I_old leaving n1 and entering n2.
            const iOld = comp.prevCurrent || 0; // Defined as p1 -> p2
            currentSource = iOld;
        } else {
            conductance = 1 / EPSILON_RESISTANCE; // DC Steady State = Short
        }
    }

    addConductance(n1, n2, conductance);
    if (currentSource !== 0) {
        addCurrentSource(n1, n2, currentSource);
    }
  });

  // Fill Matrix with Voltage Sources
  voltageSources.forEach((comp, idx) => {
    const n1 = pointToNode.get(comp.p1.id)!; 
    const n2 = pointToNode.get(comp.p2.id)!;
    const vIndex = (nodeCount - 1) + idx; 

    if (n1 > 0) {
      A[vIndex][n1 - 1] = 1;
      A[n1 - 1][vIndex] = 1; 
    }
    if (n2 > 0) {
      A[vIndex][n2 - 1] = -1;
      A[n2 - 1][vIndex] = -1; 
    }
    
    Z[vIndex] = comp.properties.voltage || 9;
  });

  // 3. Solve Linear System
  const x = gaussianElimination(A, Z);

  // 4. Extract Results
  const nodePotentials = new Map<number, number>();
  nodePotentials.set(0, 0); // Ground is 0V

  for (let i = 0; i < nodeCount - 1; i++) {
    nodePotentials.set(i + 1, x[i] || 0);
  }

  const pointPotentials = new Map<string, number>();
  components.forEach(c => {
    const n1 = pointToNode.get(c.p1.id)!;
    const n2 = pointToNode.get(c.p2.id)!;
    pointPotentials.set(c.p1.id, nodePotentials.get(n1) || 0);
    pointPotentials.set(c.p2.id, nodePotentials.get(n2) || 0);
  });

  const componentCurrents = new Map<string, number>();
  
  components.forEach(comp => {
    const n1 = pointToNode.get(comp.p1.id)!;
    const n2 = pointToNode.get(comp.p2.id)!;
    const v1 = nodePotentials.get(n1) || 0;
    const v2 = nodePotentials.get(n2) || 0;

    if (comp.type === ComponentType.BATTERY) {
      const voltageSourceIndex = voltageSources.findIndex(v => v.id === comp.id);
      if (voltageSourceIndex !== -1) {
        const iVal = x[(nodeCount - 1) + voltageSourceIndex];
        componentCurrents.set(comp.id, iVal || 0);
      }
    } else if (comp.type === ComponentType.CAPACITOR) {
         if (dt > 0) {
             const C = comp.properties.capacitance || 0.0001;
             const vOld = (comp.prevP1Potential || 0) - (comp.prevP2Potential || 0);
             // I = C * (V_new - V_old) / dt
             const iVal = (C / dt) * ((v1 - v2) - vOld);
             componentCurrents.set(comp.id, iVal);
         } else {
             componentCurrents.set(comp.id, 0);
         }
    } else if (comp.type === ComponentType.INDUCTOR) {
         if (dt > 0) {
             const L = comp.properties.inductance || 1;
             const iOld = comp.prevCurrent || 0;
             // I = I_old + (V / (L/dt))
             const iVal = iOld + (v1 - v2) * (dt / L);
             componentCurrents.set(comp.id, iVal);
         } else {
             // Steady state, just like resistor/wire logic roughly but infinite conductance
              componentCurrents.set(comp.id, (v1 - v2) / EPSILON_RESISTANCE);
         }
    } else {
      let resistance = EPSILON_RESISTANCE;
      if (comp.type === ComponentType.RESISTOR || comp.type === ComponentType.LIGHTBULB) resistance = comp.properties.resistance || 10;
      else if (comp.type === ComponentType.SWITCH) resistance = comp.properties.isOpen ? INFINITE_RESISTANCE : EPSILON_RESISTANCE;
      else if (comp.type === ComponentType.VOLTMETER) resistance = INFINITE_RESISTANCE;

      const current = (v1 - v2) / resistance;
      componentCurrents.set(comp.id, current);
    }
  });

  return { pointPotentials, componentCurrents };
};

function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  if (n === 0) return [];
  const M = A.map(row => [...row]);
  const x = [...b];

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }

    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    [x[i], x[maxRow]] = [x[maxRow], x[i]];

    if (Math.abs(M[i][i]) < 1e-10) continue; 

    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      x[k] -= factor * x[i];
      for (let j = i; j < n; j++) M[k][j] -= factor * M[i][j];
    }
  }

  const result = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += M[i][j] * result[j];
    if (Math.abs(M[i][i]) > 1e-10) result[i] = (x[i] - sum) / M[i][i];
  }
  return result;
}