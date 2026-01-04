# Timelapse CLI (tl)

Automate timelapse video processing workflow for daily work recordings.

## Prerequisites

```bash
# Install ffmpeg
brew install ffmpeg

# Set Vercel Blob token (add to ~/.zshrc or ~/.bashrc)
export BLOB_READ_WRITE_TOKEN="your-token-from-vercel-dashboard"
```

## Installation

```bash
npm install
npm run build
npm link
```

## Usage

### 1. Record timelapse on iPhone

Use the iOS Shortcut (see below) to save recordings to iCloud Drive.

### 2. Trim idle sections

```bash
tl trim
```

Opens the most recent video in QuickTime Player in trim mode. Drag the yellow handles to remove idle sections, then save (Cmd+S).

### 3. Process and upload

```bash
tl process <hours>
```

Example for 4.5 hours of work:
```bash
tl process 4.5
```

This will:
- Speed up to 1 second per hour worked
- Compress with H.264
- Save to iCloud Drive/timelapses/ as #N.mp4
- Upload to Vercel Blob as #N-Xh.mp4
- Copy the URL to clipboard
- Delete the raw file

### Check status

```bash
tl status
```

Shows archive count, pending videos, and dependency status.

## iOS Shortcut Setup

Create a shortcut called "Save Timelapse" with these actions:

1. **Get Latest Videos** (limit: 1)
2. **Save File**
   - Destination: iCloud Drive/timelapses-raw/
   - Ask where to save: Off

Add the shortcut to your home screen for quick access after recording.

## Directory Structure

```
iCloud Drive/
├── timelapses-raw/     # Raw recordings from iPhone
└── timelapses/         # Processed archive (#1.mp4, #2.mp4, ...)
```

## Workflow

1. Stop screen recording on iPhone
2. Run "Save Timelapse" shortcut → saves to iCloud
3. On Mac: `tl trim` → trim in QuickTime → save
4. `tl process 4.5` → speed up, upload, done
