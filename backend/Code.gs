/**
 * PARTICIPATORY CARTOGRAPHY SURVEY - BACKEND
 * Google Apps Script for receiving and storing polyline submissions
 *
 * DATA SCHEMA:
 * ============
 * Column A: row_id        - Auto-incremented row number
 * Column B: session_id    - Unique anonymous session identifier (24-char hex)
 * Column C: timestamp     - ISO 8601 timestamp from client
 * Column D: received_at   - Server-side timestamp when data was received
 * Column E: survey_version - Version identifier (e.g., "v1.0")
 * Column F: point_count   - Number of vertices in the polyline
 * Column G: geometry_json - Full GeoJSON Feature object as string
 * Column H: coordinates   - Extracted coordinate array as string
 * Column I: user_agent    - Browser user agent (for QA purposes)
 *
 * SETUP INSTRUCTIONS:
 * ===================
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Replace the default Code.gs content with this file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Click "Deploy" and authorize
 * 9. Copy the Web app URL to your frontend CONFIG.endpoint
 */

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // Name of the Google Sheet to store data
  // Will be created automatically if it doesn't exist
  SHEET_NAME: 'Participatory Cartography Responses',
  // Optional: set this if the script is not bound to a spreadsheet
  // Example: '1abcDEFghiJKLmnopQRstuVWxyz1234567890'
  SPREADSHEET_ID: '',

  // Headers for the data sheet
  HEADERS: [
    'row_id',
    'session_id',
    'timestamp',
    'received_at',
    'survey_version',
    'point_count',
    'geometry_json',
    'coordinates',
    'user_agent'
  ]
};

// ============================================================
// MAIN ENTRY POINTS
// ============================================================

/**
 * Handles POST requests from the frontend
 * @param {Object} e - Event object containing request data
 * @returns {TextOutput} - JSON response
 */
function doPost(e) {
  try {
    // Parse incoming JSON
    const data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.sessionId || !data.geometry) {
      return createResponse({ success: false, error: 'Missing required fields' });
    }

    // Get or create spreadsheet
    const sheet = getOrCreateSheet();

    // Prepare row data
    const rowId = sheet.getLastRow(); // Current row number (will be row ID)
    const receivedAt = new Date().toISOString();
    const coordinates = JSON.stringify(data.geometry.geometry.coordinates);
    const userAgent = e.parameter ? (e.parameter.userAgent || 'unknown') : 'unknown';

    // Append data row
    sheet.appendRow([
      rowId,
      data.sessionId,
      data.timestamp || receivedAt,
      receivedAt,
      data.surveyVersion || 'unknown',
      data.pointCount || data.geometry.geometry.coordinates.length,
      JSON.stringify(data.geometry),
      coordinates,
      userAgent
    ]);

    return createResponse({
      success: true,
      rowId: rowId,
      message: 'Data recorded successfully'
    });

  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handles GET requests (for testing connectivity)
 * @param {Object} e - Event object
 * @returns {TextOutput} - JSON response
 */
function doGet(e) {
  return createResponse({
    success: true,
    message: 'Participatory Cartography Survey Backend',
    timestamp: new Date().toISOString()
  });
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Gets existing sheet or creates a new one with headers
 * @returns {Sheet} - Google Sheets Sheet object
 */
function getOrCreateSheet() {
  const ss = CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error('No active spreadsheet. Set CONFIG.SPREADSHEET_ID.');
  }

  // Try to get existing sheet
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // Create if doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);

    // Add headers
    sheet.appendRow(CONFIG.HEADERS);

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');

    // Freeze header row
    sheet.setFrozenRows(1);

    // Set column widths for readability
    sheet.setColumnWidth(1, 60);   // row_id
    sheet.setColumnWidth(2, 200);  // session_id
    sheet.setColumnWidth(3, 180);  // timestamp
    sheet.setColumnWidth(4, 180);  // received_at
    sheet.setColumnWidth(5, 100);  // survey_version
    sheet.setColumnWidth(6, 80);   // point_count
    sheet.setColumnWidth(7, 400);  // geometry_json
    sheet.setColumnWidth(8, 300);  // coordinates
    sheet.setColumnWidth(9, 200);  // user_agent
  }

  return sheet;
}

/**
 * Creates a JSON response
 * @param {Object} data - Response data
 * @returns {TextOutput} - Formatted JSON response
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// DATA EXPORT UTILITIES
// ============================================================

/**
 * Exports all responses as GeoJSON FeatureCollection
 * Run this function manually to generate export
 * @returns {string} - GeoJSON string
 */
function exportAsGeoJSON() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  // Skip header row
  const features = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    try {
      const geometry = JSON.parse(row[6]); // geometry_json column

      // Add metadata as properties
      geometry.properties = {
        row_id: row[0],
        session_id: row[1],
        timestamp: row[2],
        survey_version: row[4],
        point_count: row[5]
      };

      features.push(geometry);
    } catch (e) {
      console.log('Skipping invalid row:', i);
    }
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features: features,
    metadata: {
      exported_at: new Date().toISOString(),
      total_responses: features.length
    }
  };

  const geojsonString = JSON.stringify(featureCollection, null, 2);

  // Log for copying
  console.log(geojsonString);

  return geojsonString;
}

/**
 * Creates a downloadable GeoJSON file in Google Drive
 * @returns {string} - URL to the created file
 */
function createGeoJSONFile() {
  const geojson = exportAsGeoJSON();
  const filename = 'survey_export_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd_HHmmss') + '.geojson';

  const file = DriveApp.createFile(filename, geojson, 'application/geo+json');

  console.log('File created: ' + file.getUrl());
  return file.getUrl();
}

/**
 * Exports summary statistics
 * @returns {Object} - Statistics object
 */
function getStatistics() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  // Skip header
  const responses = data.slice(1);

  if (responses.length === 0) {
    return { totalResponses: 0 };
  }

  // Calculate stats
  const pointCounts = responses.map(row => parseInt(row[5]) || 0);
  const avgPoints = pointCounts.reduce((a, b) => a + b, 0) / pointCounts.length;

  // Get unique versions
  const versions = [...new Set(responses.map(row => row[4]))];

  // Get date range
  const timestamps = responses.map(row => new Date(row[2])).filter(d => !isNaN(d));
  const firstResponse = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  const lastResponse = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

  const stats = {
    totalResponses: responses.length,
    averagePointCount: Math.round(avgPoints * 10) / 10,
    minPoints: Math.min(...pointCounts),
    maxPoints: Math.max(...pointCounts),
    surveyVersions: versions,
    firstResponse: firstResponse ? firstResponse.toISOString() : null,
    lastResponse: lastResponse ? lastResponse.toISOString() : null
  };

  console.log(JSON.stringify(stats, null, 2));
  return stats;
}

// ============================================================
// MAINTENANCE UTILITIES
// ============================================================

/**
 * Removes duplicate submissions based on session_id
 * Use with caution - creates backup first
 */
function removeDuplicates() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  // Create backup
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backupSheet = ss.insertSheet(CONFIG.SHEET_NAME + '_backup_' + Date.now());
  backupSheet.getRange(1, 1, data.length, data[0].length).setValues(data);

  // Find duplicates (keep first occurrence)
  const seen = new Set();
  const rowsToDelete = [];

  for (let i = 1; i < data.length; i++) {
    const sessionId = data[i][1];
    if (seen.has(sessionId)) {
      rowsToDelete.push(i + 1); // Sheet rows are 1-indexed
    } else {
      seen.add(sessionId);
    }
  }

  // Delete from bottom up to preserve indices
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    sheet.deleteRow(rowsToDelete[i]);
  }

  console.log('Removed ' + rowsToDelete.length + ' duplicate rows');
  console.log('Backup created: ' + backupSheet.getName());
}
