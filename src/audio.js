/**
 * Audio Engine for Grave Escape 3D.
 * Synthesizes retro sound effects and procedural cyberpunk djent music using the Web Audio API.
 */

export const SoundEngine = {
  ctx: null,
  musicTimeout: null,
  current16thNote: 0,
  nextNoteTime: 0.0,
  tempo: 135.0, // BPM
  lookahead: 25.0, // ms
  scheduleAheadTime: 0.1, // seconds
  isMusicPlaying: false,
  sfxVolume: 0.35,
  musicVolume: 0.08,

  // Master FX Chain Nodes
  masterDistortion: null,
  masterFilter: null,
  masterGain: null,

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master FX Chain (Distortion -> Lowpass Filter for industrial warmth)
      this.masterDistortion = this.ctx.createWaveShaper();
      this.masterDistortion.curve = this.makeDistortionCurve(400);
      this.masterDistortion.oversample = '4x';

      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);

      // Connect Master Chain
      this.masterDistortion.connect(this.masterFilter);
      this.masterFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
  },

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  },

  setVolume(sfxVol, musicVol) {
    this.sfxVolume = sfxVol;
    this.musicVolume = musicVol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(musicVol, this.ctx.currentTime);
    }
  },

  play(type) {
    this.init();
    if (!this.ctx) return;
    
    // Resume context if suspended (browser autoplay policies)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    
    switch (type) {
      case 'shoot_pistol': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
        
        gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        this.playNoise(0.08, this.sfxVolume * 0.6, 300, 1000);
        break;
      }
      
      case 'shoot_shotgun': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        
        gain.gain.setValueAtTime(this.sfxVolume * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);

        this.playNoise(0.2, this.sfxVolume * 1.0, 100, 800);
        break;
      }

      case 'shoot_minigun': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        
        gain.gain.setValueAtTime(this.sfxVolume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);

        this.playNoise(0.05, this.sfxVolume * 0.5, 400, 2000);
        break;
      }

      case 'enemy_shoot': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.15);
        
        gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);

        this.playNoise(0.1, this.sfxVolume * 0.4, 200, 600);
        break;
      }

      case 'hurt': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.2);
        
        gain.gain.setValueAtTime(this.sfxVolume * 1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'enemy_alert': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(450, now + 0.15);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        
        gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'enemy_die': {
        this.playNoise(0.4, this.sfxVolume * 0.9, 80, 500);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
        
        gain.gain.setValueAtTime(this.sfxVolume * 1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }

      case 'pickup_item': {
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          
          gain.gain.setValueAtTime(this.sfxVolume * 0.4, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.15);
          
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.15);
        });
        break;
      }

      case 'elevator': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.linearRampToValueAtTime(180, now + 1.2);
        osc.frequency.linearRampToValueAtTime(50, now + 1.8);
        
        gain.gain.setValueAtTime(this.sfxVolume * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 2.0);
        break;
      }
      
      case 'click': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
        break;
      }
    }
  },

  playNoise(duration, volume, lowFreq, highFreq) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(highFreq, now);
    filter.frequency.exponentialRampToValueAtTime(lowFreq, now + duration);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + duration);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noiseNode.start(now);
    noiseNode.stop(now + duration);
  },

  // =========================================================================
  // CYBERPUNK DJENT SEQUENCER (Mick Gordon inspired dark industrial loop)
  // =========================================================================
  
  // Heavy Distorted Djent Bass
  playBassNote(pitch, time, duration) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    
    // Detune for a wider, heavier sound
    osc1.frequency.setValueAtTime(pitch, time);
    osc2.frequency.setValueAtTime(pitch * 0.992, time);
    
    // Amplitude Envelope
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(1, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterDistortion); // Feed straight into distortion
    
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  },

  // Punchy Compressor Kick Drum
  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    // Pitch drop envelope for the "thump"
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
    
    gainNode.gain.setValueAtTime(1.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(this.masterFilter); // Bypass extreme distortion for clean punch
    
    osc.start(time);
    osc.stop(time + 0.16);
  },

  // Harsh Gated Industrial Snare
  playSnare(time) {
    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, time);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(gainNode);
    gainNode.connect(this.masterDistortion);
    
    noise.start(time);
    noise.stop(time + 0.15);
  },

  scheduleNote(step, time) {
    if (this.musicVolume <= 0.001) return;

    const secondsPer16th = 60.0 / this.tempo / 4.0;
    
    const E1 = 41.20; // Low E tuning pitch
    const G1 = 49.00;

    const bassPattern  = [E1, E1,  0, E1,  0, E1, G1,  0, E1,  0, E1, E1,  0, G1, E1,  0];
    const kickPattern  = [1,  0,  0,  0,  1,  0,  0,  0,  1,  0,  0,  1,  0,  0,  0,  0];
    const snarePattern = [0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  0];

    if (kickPattern[step] === 1) this.playKick(time);
    if (snarePattern[step] === 1) this.playSnare(time);
    
    if (bassPattern[step] > 0) {
        // Vary legatos for dynamic syncopation
        const duration = (step % 3 === 0) ? secondsPer16th * 1.5 : secondsPer16th * 0.8;
        this.playBassNote(bassPattern[step], time, duration);
    }
  },

  scheduler() {
    if (!this.isMusicPlaying) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.current16thNote, this.nextNoteTime);
        
        // Advance to next 16th note
        const secondsPer16th = 60.0 / this.tempo / 4.0;
        this.nextNoteTime += secondsPer16th;
        this.current16thNote = (this.current16thNote + 1) % 16;
    }

    this.musicTimeout = setTimeout(() => this.scheduler(), this.lookahead);
  },

  startMusic() {
    this.init();
    if (!this.ctx || this.isMusicPlaying) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.isMusicPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
    console.log("Rip and tear until it is done...");
  },

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  }
};
