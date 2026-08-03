# Homelab Dashboard - Handoff to Antigravity IDE

## Project Overview
The goal is to build a stunning, "vibe-coded" personal dashboard to serve as the homepage for a homelab environment (currently a Proxmox server running multiple containers).

## Tech Stack & Rules
- **Framework:** React (via Vite).
- **Styling:** **Vanilla CSS only.** Do not use Tailwind CSS or any other utility framework. Rely on standard CSS variables for theme management.
- **Icons:** Use a lightweight SVG icon set (like Phosphor Icons or Lucide React).
- **Directory:** Initialize the project in `C:\Users\Charlei\.gemini\antigravity\scratch\homelab-dash`.

## Design Aesthetics (CRITICAL)
The UI must be highly aesthetic, modern, and "vibe-coded."
- **Glassmorphism:** Use `backdrop-filter: blur()` and semi-transparent backgrounds to give UI elements a frosted glass look.
- **Background:** Implement a rich, subtly animated background gradient (e.g., Deep Space Blues or Neon Cyberpunk).
- **Typography:** Use a modern Google Font like 'Inter' or 'Outfit'.
- **Micro-animations:** Include smooth CSS transitions (e.g., hover effects that scale up service cards and add a glowing box-shadow).
- **Theme:** Default to a premium Dark Mode.

## Core Features & Components to Build
1. **`GreetingClock.jsx`**: A dynamic component showing the current time and a personalized greeting (e.g., "Good evening, Admin").
2. **`ServiceGrid.jsx`**: A responsive CSS Grid layout to hold all container links.
3. **`ServiceCard.jsx`**: Reusable component representing an individual container. It should display an icon, the service name, and a status/URL indicator.
4. **Mock Data:** Use placeholder containers like Plex, Pi-hole, Nextcloud, and Proxmox VE to start building the UI.

## Next Steps for the IDE Agent
1. Create the React project using Vite (`npm create vite@latest . -- --template react`).
2. Clean up the default Vite boilerplate.
3. Set up the `index.css` with the design system variables (colors, fonts, glassmorphism utilities).
4. Implement the core components and layout.
5. Provide a way for the user to easily configure their list of services (e.g., via a JSON config file).
6. (Optional/Future) Scaffold a basic API utility file to eventually connect to the Proxmox API for live server stats (CPU/RAM usage).
