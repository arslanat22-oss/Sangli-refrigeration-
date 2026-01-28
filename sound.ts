
// Singleton Audio Context for 100% Offline Synthesized Sounds
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export type SoundType = 'scan-success' | 'scan-error' | 'add-to-cart' | 'delete' | 'click' | 'payment-success' | 'sync';

export const playSound = (type: SoundType) => {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'scan-success':
        // Professional soft high beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        break;

      case 'add-to-cart':
        // Quick subtle pip for quantity increase
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
        break;

      case 'scan-error':
        // Low dull warning thud
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;

      case 'payment-success':
        // Pleasant Major chord arpeggio (Cha-ching feel)
        const notes = [880, 1108, 1318]; // A5, C#6, E6
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.value = freq;
          const st = t + i * 0.05;
          g.gain.setValueAtTime(0, st);
          g.gain.linearRampToValueAtTime(0.1, st + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
          o.start(st);
          o.stop(st + 0.4);
        });
        // We handle the main oscillator separately in the switch, 
        // so we stop the default one here to avoid extra noise
        osc.stop(t);
        break;

      case 'delete':
        // Quick descending slide (Paper crumble feel)
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
        
      case 'sync':
         // Tiny digital tick
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, t);
        gain.gain.setValueAtTime(0.02, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
        
       default:
        // Default UI click
        osc.frequency.setValueAtTime(600, t);
        gain.gain.setValueAtTime(0.02, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};
