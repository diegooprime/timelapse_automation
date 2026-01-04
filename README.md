# tl

CLI for processing my daily work timelapses.

I record my screen on iPhone, this automates the trim → speed up → upload workflow.

## Usage

```bash
tl trim              # Open raw video in iMovie for editing
tl process <hours>   # Speed up to 1s/hour, upload to Vercel Blob
tl status            # Show archive count and deps
```

## Setup

Requires ffmpeg (`brew install ffmpeg`).

```bash
npm install && npm run build && npm link
export BLOB_READ_WRITE_TOKEN="your-token"  # optional, for uploads
```

## Workflow

1. Stop recording on iPhone
2. Run iOS Shortcut → saves to `iCloud Drive/timelapses-raw/`
3. `tl trim` → cut idle sections in iMovie → export to Downloads
4. `tl process 4.5` → done, URL in clipboard

## iOS Shortcut

Create "Save Timelapse":
- Get Latest Videos (limit: 1)
- Save File to `iCloud Drive/timelapses-raw/`

## License

MIT
