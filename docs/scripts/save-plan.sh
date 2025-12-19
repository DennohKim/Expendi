#!/bin/bash

# Save implementation plan script
# Usage: ./save-plan.sh "Feature Name"

if [ -z "$1" ]; then
    echo "Usage: $0 \"Feature Name\""
    echo "Example: $0 \"Cross-Chain Budget Wallet\""
    exit 1
fi

FEATURE="$1"
DATE=$(date +%Y-%m-%d)
FILENAME="$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')-plan.md"
FILEPATH="docs/plans/$FILENAME"

# Create the plan file from template
cp docs/templates/plan-template.md "$FILEPATH"

# Replace template placeholders
sed -i '' "s/\[Feature\/Component\]/$FEATURE/g" "$FILEPATH"
sed -i '' "s/\[YYYY-MM-DD\]/$DATE/g" "$FILEPATH"

echo "Created plan file: $FILEPATH"
echo ""
echo "Next steps:"
echo "1. Open the file in your editor"
echo "2. Fill in the implementation details"
echo "3. Update the status as you progress"
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