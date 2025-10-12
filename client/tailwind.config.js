module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'heart-beat': 'heartBeat 1.5s ease-in-out infinite',
        'wave-motion': 'waveMotion 3s ease-in-out infinite',
        'ecg-wave': 'ecgWave 2s linear infinite',
        'slide-right': 'slideRight 10s linear infinite'
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        heartBeat: {
          "0%, 100%": { transform: 'scale(1)' },
          "25%": { transform: 'scale(1.1)' },
          "50%": { transform: 'scale(1)' },
          "75%": { transform: 'scale(1.1)' },
        },
        waveMotion: {
          "0%, 100%": { transform: 'translateY(0)' },
          "50%": { transform: 'translateY(-5px)' },
        },
        ecgWave: {
          "0%": { transform: 'translateX(0)' },
          "100%": { transform: 'translateX(-100%)' },
        },
        slideRight: {
          "0%": { transform: 'translateX(-100%)' },
          "100%": { transform: 'translateX(0)' },
        }
      },
    },
  },
  plugins: [],
};