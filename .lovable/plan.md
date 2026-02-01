

# Improved Master Cast CSV Import

## Overview
Enhance the Cast Manager with smarter CSV parsing and a "Delete All" option for easy cleanup when imports go wrong.

## Problem Analysis

### Current CSV Parsing Issues
The current parser assumes columns are always in this exact order:
```
name, tribe, age, occupation, image_url
```

If your CSV has columns in a different order (e.g., `name, age, occupation, tribe`) or uses different header names, data gets assigned to wrong fields.

### Missing Features
- No way to delete all contestants at once for a season
- No preview of parsed data before import
- No column mapping when headers don't match expected format

---

## Solution

### 1. "Delete All Season" Button
Add a destructive action button that deletes all contestants for the currently selected season. Include a confirmation dialog showing how many will be deleted.

### 2. Smart Header Detection
When importing CSV, detect and map column headers intelligently:
- Look for common variations: "name", "contestant", "player"
- Detect "tribe", "team", "starting tribe"
- Detect "age" (also validate it's a number)
- Detect "occupation", "job", "profession"
- Detect "image", "image_url", "photo", "headshot"

### 3. Import Preview Dialog
Before importing, show a preview table of the first 5 rows with the detected column mappings. Allow the user to:
- See how data will be parsed
- Confirm or cancel the import
- Identify issues before committing

---

## Implementation Details

### Delete All Season Feature

```text
UI Location: Next to the season selector, show "Delete All" button (only when contestants exist)

Flow:
1. User clicks "Delete All for Season X"
2. Confirmation dialog: "Delete all 18 contestants for Season 49?"
3. On confirm: DELETE FROM master_contestants WHERE season_number = X
4. Refresh list and show success toast
```

### Smart CSV Parser

```typescript
// Detect column type from header name
function detectColumnType(header: string): 'name' | 'tribe' | 'age' | 'occupation' | 'image_url' | null {
  const h = header.toLowerCase().trim();
  
  if (['name', 'contestant', 'player', 'castaway'].includes(h)) return 'name';
  if (['tribe', 'team', 'starting tribe', 'original tribe'].includes(h)) return 'tribe';
  if (['age'].includes(h)) return 'age';
  if (['occupation', 'job', 'profession', 'career'].includes(h)) return 'occupation';
  if (['image', 'image_url', 'photo', 'headshot', 'picture', 'url'].includes(h)) return 'image_url';
  
  return null;
}

// Build column index mapping from headers
function buildColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const type = detectColumnType(header);
    if (type && !(type in mapping)) {
      mapping[type] = index;
    }
  });
  
  return mapping;
}
```

### Import Preview Dialog

```text
+----------------------------------------------------------+
|  CSV Import Preview - Season 49                          |
+----------------------------------------------------------+
|  Detected columns: Name (col 1), Age (col 2),            |
|  Occupation (col 3), Tribe (col 4)                       |
|                                                          |
|  Preview (first 5 rows):                                 |
|  +------+-----+-------------+-------+----------+         |
|  | Name | Age | Occupation  | Tribe | Image    |         |
|  +------+-----+-------------+-------+----------+         |
|  | Sam  | 28  | Teacher     | Luvu  | —        |         |
|  | Alex | 32  | Attorney    | Yase  | —        |         |
|  | ...  |     |             |       |          |         |
|  +------+-----+-------------+-------+----------+         |
|                                                          |
|  Ready to import 18 contestants                          |
|                                                          |
|  [Cancel]                        [Import All]            |
+----------------------------------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/CastManager.tsx` | Add Delete All button, smart CSV parsing, preview dialog |

---

## User Experience

### Delete All Flow
1. Select season with bad data
2. Click "Delete All" (red button, appears when contestants exist)
3. Confirm in dialog
4. All contestants for that season are removed
5. Ready for fresh import

### Improved CSV Import Flow
1. Click "CSV Import" and select file
2. Preview dialog shows detected columns and first 5 rows
3. User verifies data looks correct
4. Click "Import All" to proceed or "Cancel" to abort
5. On success, table refreshes with new data

### Fallback for No Headers
If the CSV has no recognizable headers (first row doesn't contain words like "name", "tribe", etc.), fall back to the original positional parsing but show a warning in the preview.

