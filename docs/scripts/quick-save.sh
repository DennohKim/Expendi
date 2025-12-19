#!/bin/bash

# Quick save script for Claude Code conversations
# Usage: ./quick-save.sh

echo "🚀 Quick Save for Claude Code Conversations"
echo "=========================================="
echo ""
echo "What would you like to save?"
echo "1) Conversation"
echo "2) Implementation Plan"
echo "3) Architecture Decision Record (ADR)"
echo "4) Just create a note file"
echo ""
read -p "Choose option (1-4): " option

case $option in
    1)
        read -p "Enter conversation topic: " topic
        ./docs/scripts/save-conversation.sh "$topic"
        ;;
    2)
        read -p "Enter feature/component name: " feature
        ./docs/scripts/save-plan.sh "$feature"
        ;;
    3)
        read -p "Enter decision title: " decision
        ./docs/scripts/create-adr.sh "$decision"
        ;;
    4)
        read -p "Enter note title: " title
        DATE=$(date +%Y-%m-%d)
        FILENAME="${DATE}-$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g').md"
        FILEPATH="docs/notes/$FILENAME"

        mkdir -p docs/notes

        cat > "$FILEPATH" << EOF
# $title - $DATE

## Notes


## Actions
- [ ]

## Related
-

EOF

        echo "Created note: $FILEPATH"
        if command -v code &> /dev/null; then
            code "$FILEPATH"
        else
            open "$FILEPATH"
        fi
        ;;
    *)
        echo "Invalid option. Please choose 1-4."
        ;;
esac