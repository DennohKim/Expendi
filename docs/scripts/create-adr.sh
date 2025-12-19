#!/bin/bash

# Create Architecture Decision Record script
# Usage: ./create-adr.sh "Decision Title"

if [ -z "$1" ]; then
    echo "Usage: $0 \"Decision Title\""
    echo "Example: $0 \"Use OneBalance for Multi-Chain Asset Management\""
    exit 1
fi

TITLE="$1"
DATE=$(date +%Y-%m-%d)

# Find the next ADR number
ADR_DIR="docs/decisions"
LAST_NUM=$(ls "$ADR_DIR"/ADR-*.md 2>/dev/null | sed 's/.*ADR-\([0-9]\{3\}\)-.*/\1/' | sort -n | tail -1)

if [ -z "$LAST_NUM" ]; then
    NEXT_NUM="001"
else
    NEXT_NUM=$(printf "%03d" $((10#$LAST_NUM + 1)))
fi

FILENAME="ADR-${NEXT_NUM}-$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g').md"
FILEPATH="$ADR_DIR/$FILENAME"

# Create the ADR file from template
cp docs/templates/adr-template.md "$FILEPATH"

# Replace template placeholders
sed -i '' "s/ADR-XXX/ADR-$NEXT_NUM/g" "$FILEPATH"
sed -i '' "s/\[Title\]/$TITLE/g" "$FILEPATH"
sed -i '' "s/\[YYYY-MM-DD\]/$DATE/g" "$FILEPATH"

echo "Created ADR file: $FILEPATH"
echo "ADR Number: $NEXT_NUM"
echo ""
echo "Next steps:"
echo "1. Open the file in your editor"
echo "2. Fill in the decision context and rationale"
echo "3. Update status when decision is finalized"
echo ""
echo "Opening file..."

# Try to open with VS Code, fallback to default editor
if command -v code &> /dev/null; then
    code "$FILEPATH"
elif command -v nano &> /dev/null; then
    nano "$FILEPATH"
else
    open "$FILEPATH"
fi