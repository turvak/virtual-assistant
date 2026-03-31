#!/bin/bash
# workspace-cleanup.sh - Audits and prunes temporary files/memories
# Usage: ./workspace-cleanup.sh [--dry-run]

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "--- DRY RUN MODE ---"
fi

WORKSPACE="/root/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
RETENTION_DAYS=30

echo "Starting OpenClaw Workspace Audit: $(date)"

# 1. Prune old daily memory files (older than 30 days)
# We keep them if they haven't been modified in 30 days, 
# assuming insights have been migrated to MEMORY.md by then.
find "$MEMORY_DIR" -name "*.md" -type f -mtime +$RETENTION_DAYS | while read -r file; do
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] Would trash old memory: $file"
    else
        echo "Trashing old memory: $file"
        trash "$file"
    fi
done

# 2. Identify large/old data dumps in project folders
# Just report these for now rather than auto-deleting, as they might be valuable.
echo "Checking for large data files (>10MB)..."
find "$WORKSPACE" -type f -size +10M -not -path '*/.git/*'

# 3. Clean up generic temp files
find "$WORKSPACE" -name "*.tmp" -o -name "*.log" -type f -mtime +7 | while read -r tmpfile; do
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] Would trash temp file: $tmpfile"
    else
        echo "Trashing temp file: $tmpfile"
        trash "$tmpfile"
    fi
done

echo "Audit complete."
