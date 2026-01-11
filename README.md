# Participatory Cartography Survey

A minimal, research-grade web application for collecting anonymous polyline data on perceived historical watercourse locations.

## Overview

This application allows anonymous users to draw exactly one continuous line on a map representing where they believe a historical watercourse once flowed. Designed for academic research with emphasis on data quality, reproducibility, and methodological control.

## Features

- Single polyline drawing (no markers, shapes, or text)
- Fixed geographic extent (Zagreb center)
- Controlled zoom levels (14-17)
- Neutral grayscale basemap (CartoDB Positron)
- Anonymous submission (no accounts, no personal data)
- Duplicate submission prevention via localStorage
- Mobile-friendly responsive design
- GeoJSON data export

## Project Structure

```
medvescak/
├── index.html          # Complete frontend (HTML/CSS/JS)
├── backend/
│   └── Code.gs         # Google Apps Script backend
└── README.md           # This file
```

## Data Schema

Each submission records:

| Field | Type | Description |
|-------|------|-------------|
| `row_id` | Integer | Auto-incremented row number |
| `session_id` | String | 24-character hex identifier |
| `timestamp` | ISO 8601 | Client-side submission time |
| `received_at` | ISO 8601 | Server-side receipt time |
| `survey_version` | String | Survey version (e.g., "v1.0") |
| `point_count` | Integer | Number of vertices |
| `geometry_json` | JSON | Full GeoJSON Feature |
| `coordinates` | JSON | Coordinate array `[[lng,lat],...]` |
| `user_agent` | String | Browser identifier |

## Deployment Instructions

### Step 1: Set Up Google Apps Script Backend

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it something like "Participatory Cartography Data"
3. Go to **Extensions > Apps Script**
4. Delete any default code in `Code.gs`
5. Copy the entire contents of `backend/Code.gs` into the editor
6. Click **Save** (Ctrl+S)
7. Click **Deploy > New deployment**
8. Click the gear icon and select **Web app**
9. Configure:
   - Description: "Survey Backend v1.0"
   - Execute as: **Me**
   - Who has access: **Anyone**
10. Click **Deploy**
11. Click **Authorize access** and complete Google authorization
12. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

### Step 2: Configure Frontend

1. Open `index.html`
2. Find this line (around line 193):
   ```javascript
   endpoint: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',
   ```
3. Replace with your Web app URL:
   ```javascript
   endpoint: 'https://script.google.com/macros/s/YOUR_ID/exec',
   ```
4. Optionally adjust other CONFIG values:
   ```javascript
   surveyVersion: 'v1.0',        // Increment for new survey rounds
   mapCenter: [45.8150, 15.9819], // Lat/Lng center point
   initialZoom: 15,               // Starting zoom level
   ```

### Step 3: Deploy to GitHub Pages

1. Create a new GitHub repository or use existing one
2. Push your files:
   ```bash
   git add .
   git commit -m "Initial survey deployment"
   git push origin main
   ```
3. Go to repository **Settings > Pages**
4. Under "Source", select **Deploy from a branch**
5. Select **main** branch and **/ (root)** folder
6. Click **Save**
7. Your survey will be live at `https://USERNAME.github.io/REPO_NAME/`

## Exporting Data

### Export as GeoJSON

1. Open your Google Apps Script project
2. In the code editor, click the function dropdown (top toolbar)
3. Select `exportAsGeoJSON`
4. Click **Run**
5. View output in **Execution log** (View > Logs)
6. Copy the GeoJSON output

### Create Downloadable File

1. Select `createGeoJSONFile` function
2. Click **Run**
3. The file URL will appear in the execution log
4. File is saved to your Google Drive

### View Statistics

1. Select `getStatistics` function
2. Click **Run**
3. View summary in execution log

## Methodological Notes

### Controlled Conditions

All participants experience identical conditions:
- Same map extent (Zagreb center bounded area)
- Same neutral basemap (CartoDB Positron grayscale)
- Same zoom constraints (zoom 14-17)
- Same drawing tool behavior
- Same instruction text

### Bias Mitigation

- **Neutral basemap**: Grayscale tiles avoid visual bias from colored features
- **Fixed bounds**: Prevents users from referencing external landmarks
- **No leading cues**: Instruction text avoids mentioning specific locations
- **Single attempt**: localStorage prevents multiple submissions per device
- **Anonymous**: No personal data collection reduces social desirability bias

### Data Quality

- **Minimum 2 points**: Ensures valid polyline geometry
- **Maximum 100 points**: Prevents excessive detail/noise
- **GeoJSON format**: Standard interchange format for GIS analysis
- **Timestamped**: Allows temporal analysis of responses
- **Versioned**: Supports iterative survey rounds

## Configuration Options

Edit `CONFIG` object in `index.html`:

```javascript
const CONFIG = {
    endpoint: 'YOUR_URL',           // Backend URL
    surveyVersion: 'v1.0',          // Survey identifier
    mapCenter: [45.8150, 15.9819],  // Center coordinates
    initialZoom: 15,                // Starting zoom
    minZoom: 14,                    // Minimum zoom allowed
    maxZoom: 17,                    // Maximum zoom allowed
    bounds: [                       // Pan limits
        [45.7900, 15.9400],         // Southwest corner
        [45.8400, 16.0200]          // Northeast corner
    ],
    maxPoints: 100,                 // Max vertices per line
    minPointsToSubmit: 2,           // Min vertices required
    lineColor: '#2980b9',           // Drawing color
    lineWeight: 4,                  // Line thickness
    lineOpacity: 0.85               // Line opacity
};
```

## Alternative Basemaps

If you prefer a different basemap, replace the `L.tileLayer` URL:

```javascript
// OpenStreetMap standard
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// CartoDB Dark Matter (dark theme)
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

// Stamen Toner (high contrast)
'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png'
```

## Troubleshooting

### "Error sending" on submit
- Verify your Google Apps Script URL is correct
- Ensure the script is deployed with "Anyone" access
- Check browser console for detailed errors

### Data not appearing in spreadsheet
- Open Apps Script and check Executions log
- Verify the script has created a sheet named "Participatory Cartography Responses"
- Try running `doGet()` manually to test connectivity

### Users can submit multiple times
- localStorage can be cleared by users
- For stricter control, implement IP-based limits (requires server-side changes)
- Consider fingerprinting for academic research (with ethics approval)

## License

MIT License - Free for academic and research use.

## Citation

If you use this tool in academic research, please cite:

```
Participatory Cartography Survey Tool (2026).
GitHub: https://github.com/[your-username]/[repository]
```
