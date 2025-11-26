import { GoogleGenAI } from "@google/genai";
import { CircuitComponent, ComponentType } from "../types";

// Initialize the Gemini API client
// The key must be provided in the environment variable API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCircuitAnalysis = async (
  components: CircuitComponent[],
  userQuestion: string
): Promise<string> => {
  // Construct a text description of the circuit
  const componentDesc = components.map(c => {
    const typeStr = c.type;
    let propsStr = '';
    if (c.type === ComponentType.BATTERY) propsStr = `${c.properties.voltage}V`;
    if (c.type === ComponentType.RESISTOR) propsStr = `${c.properties.resistance}Ω`;
    if (c.type === ComponentType.LIGHTBULB) propsStr = `${c.properties.resistance}Ω (Bulb)`;
    if (c.type === ComponentType.SWITCH) propsStr = c.properties.isOpen ? 'Open' : 'Closed';
    if (c.type === ComponentType.AMMETER) propsStr = `Reading: ${Math.abs(c.current).toFixed(4)}A`;
    if (c.type === ComponentType.VOLTMETER) propsStr = `Reading: ${Math.abs(c.voltageDrop).toFixed(4)}V`;
    if (c.type === ComponentType.CAPACITOR) propsStr = `${(c.properties.capacitance || 0)*1000000}µF`;
    if (c.type === ComponentType.INDUCTOR) propsStr = `${c.properties.inductance}H`;
    
    return `- ${typeStr} (ID: ${c.id.substring(0, 4)}) at (${Math.round(c.p1.x)},${Math.round(c.p1.y)}) to (${Math.round(c.p2.x)},${Math.round(c.p2.y)}). Value: ${propsStr}. Current: ${c.current.toFixed(3)}A. Voltage Drop: ${c.voltageDrop.toFixed(3)}V.`;
  }).join('\n');

  const prompt = `
    You are an expert physics tutor specializing in DC circuits. 
    The user has built a circuit in a simulator.
    
    Current Circuit State:
    ${componentDesc}
    
    User Question: "${userQuestion}"
    
    Provide a concise, helpful, and educational answer. Explain the physics concepts (Ohm's Law, KCL, KVL, RC/RL time constants) if relevant. 
    If the circuit is broken or has a short circuit (infinite current), warn the user.
    Do not use markdown for equations, just plain text or simple notation like V=IR.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a friendly and encouraging physics teacher."
      }
    });
    return response.text || "I couldn't analyze the circuit at the moment.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Sorry, I'm having trouble connecting to the lab assistant server.";
  }
};