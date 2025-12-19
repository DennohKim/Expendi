#!/bin/bash

# Save Claude Code conversation script
# Usage: ./save-conversation.sh "Topic Name"

if [ -z "$1" ]; then
    echo "Usage: $0 \"Topic Name\""
    echo "Example: $0 \"OneBalance Integration Discussion\""
    exit 1
fi

TOPIC="$1"
DATE=$(date +%Y-%m-%d)
FILENAME="${DATE}-$(echo "$TOPIC" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g').md"
FILEPATH="docs/conversations/$FILENAME"

# Create the conversation file from template
cp docs/templates/conversation-template.md "$FILEPATH"

# Replace template placeholders
sed -i '' "s/\[Topic\]/$TOPIC/g" "$FILEPATH"
sed -i '' "s/\[Date\]/$DATE/g" "$FILEPATH"

echo "Created conversation file: $FILEPATH"
echo ""
echo "Next steps:"
echo "1. Open the file in your editor"
echo "2. Fill in the conversation details"
echo "3. Copy-paste the Claude Code conversation content"
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