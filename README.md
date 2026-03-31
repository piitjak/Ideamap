# IdeaMapper

IdeaMapper is a sophisticated, minimalist mind mapping application built with React, Konva, and Tailwind CSS. It allows users to visualize their thoughts, organize complex information, and map out projects with ease.

## Features

- **Intuitive Mind Mapping**: Create, edit, and organize nodes in a dynamic, auto-layout tree structure.
- **Rich Node Content**: Add detailed notes, external links, and images to any node.
- **Aesthetic Color Palette**: Choose from a curated set of sophisticated colors (including Pantone-inspired hues) to categorize and highlight your ideas.
- **Dark & Light Modes**: Seamlessly switch between themes to suit your environment and preference.
- **Visual Hierarchy**: Automatic visual differentiation between the root node and sub-nodes, especially optimized for dark mode.
- **Local File System Integration**: Save and open your mind maps directly from your local device using the File System Access API.
- **Responsive Canvas**: Pan and zoom across an infinite canvas with smooth interactions.
- **Persistence**: Your work is automatically saved to local storage, ensuring you never lose an idea.

## Tech Stack

- **Frontend**: React 19
- **Canvas Rendering**: Konva & React-Konva
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)
- **Utilities**: UUID, clsx, tailwind-merge

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ideamapper.git
   cd ideamapper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## Usage

- **Create a Topic**: Click the "+" button in the sidebar to start a new mind map.
- **Add Nodes**: Select a node and click the "+" icon in the floating editor or double-click an empty area (coming soon) to add a child.
- **Edit Nodes**: Double-click a node to edit its title, or use the floating editor to add notes, links, and images.
- **Change Colors**: Use the color swatches in the floating editor to customize node backgrounds.
- **Pan & Zoom**: Use your mouse wheel to zoom and drag the canvas to pan.
- **Save/Open**: Use the folder and disk icons in the sidebar to manage your local files.

## Project Structure

- `src/App.tsx`: The main application component containing core logic and canvas rendering.
- `src/types.ts`: TypeScript interfaces and types for the application data model.
- `src/hooks/useFileSystem.ts`: Custom hook for local file system interactions.
- `src/lib/utils.ts`: Utility functions for styling and class merging.
- `src/index.css`: Global styles and Tailwind CSS configuration.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.

## License

This project is licensed under the MIT License.
