/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores customizadas do MCPRAT
        primary: {
          50: "#f0f4f3",
          100: "#dce7e5",
          200: "#b8cfcd",
          300: "#94b7b5",
          400: "#7aaaa4",  // Cor principal (sidebar, botões)
          500: "#609d96",
          600: "#4d8078",
          700: "#3a635f",
          800: "#274646",
          900: "#14292d",
        },
        neutral: {
          light: "#f5f5f5",
          border: "#e0e0e0",
        },
        success: {
          light: "#d4edda",
          DEFAULT: "#28a745",
        },
        error: {
          light: "#f8d7da",
          DEFAULT: "#dc3545",
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      },
      spacing: {
        "sidebar": "210px",
      }
    },
  },
  plugins: [],
}
