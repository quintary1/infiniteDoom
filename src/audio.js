/**
 * Audio Engine for Grave Escape 3D.
 * Synthesizes retro sound effects and procedural chiptune backbeats using the Web Audio API.
 */

export const SoundEngine = {
  ctx: null,
  musicTimeout: null,
  musicStep: 0,
  isMusicPlaying: false,
  sfxVolume: 0.35,
  musicVolume: 0.08,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  setVolume(sfxVol, musicVol) {
    this.sfxVolume = sfxVol;
    this.musicVolume = musicVol;
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
  // RETRO TRACK SEQUENCER (Dark Synth Bassline Loops)
  // =========================================================================
  startMusic() {
    this.init();
    if (!this.ctx || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;
    
    const stepTime = 0.22; // Speed of beats (eighth notes at ~136 BPM)
    
    const runScheduler = () => {
      if (!this.isMusicPlaying) return;
      const now = this.ctx.currentTime;
      this.scheduleBeat(this.musicStep, now);
      this.musicStep = (this.musicStep + 1) % 16;
      
      this.musicTimeout = setTimeout(runScheduler, stepTime * 1000);
    };
    
    runScheduler();
  },

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  },

  scheduleBeat(step, time) {
    if (this.musicVolume <= 0.001) return;

    // Bass drum on downbeats (0, 4, 8, 12)
    if (step % 4 === 0) {
      this.playProceduralKick(time);
    }
    
    // Snare drum on backbeats (4, 12)
    if (step % 8 === 4) {
      this.playProceduralSnare(time);
    }

    // Hihat on offbeats (2, 6, 10, 14)
    if (step % 4 === 2) {
      this.playProceduralHihat(time);
    }
    
    // Industrial Cyber Bassline (notes in HZ)
    // A1 (55Hz), C2 (65.4Hz), D2 (73.4Hz), G1 (49Hz)
    const bassPattern = [
      55.0, 55.0, 0, 55.0,
      65.4, 65.4, 0, 65.4,
      73.4, 73.4, 0, 73.4,
      49.0, 49.0, 55.0, 65.4
    ];
    
    const freq = bassPattern[step];
    if (freq > 0) {
      this.playProceduralBassNote(freq, time);
    }
  },

  playProceduralKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    gain.gain.setValueAtTime(this.musicVolume * 1.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.12);
  },

  playProceduralSnare(time) {
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, time);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.musicVolume * 0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(time);
    noise.stop(time + 0.08);
  },

  playProceduralHihat(time) {
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.musicVolume * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(time);
    noise.stop(time + 0.03);
  },

  playProceduralBassNote(freq, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, time);
    filter.frequency.exponentialRampToValueAtTime(60, time + 0.16);
    
    gain.gain.setValueAtTime(this.musicVolume * 1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.18);
  }
};
