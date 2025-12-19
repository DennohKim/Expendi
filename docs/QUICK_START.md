# Documentation Quick Start Guide

## 🎯 Save This Conversation

To save our current OneBalance integration conversation:

```bash
# Quick option - use the interactive script
./docs/scripts/quick-save.sh

# Or manually copy the conversation content to:
docs/conversations/2024-12-11-onebalance-multi-chain-integration.md
```

## 📝 Common Commands

### Save a Conversation
```bash
./docs/scripts/save-conversation.sh "Topic Name"
```

### Create Implementation Plan
```bash
./docs/scripts/save-plan.sh "Feature Name"
```

### Create Architecture Decision Record
```bash
./docs/scripts/create-adr.sh "Decision Title"
```

### Interactive Quick Save
```bash
./docs/scripts/quick-save.sh
```

## 📂 Where Things Go

| Type | Folder | Example |
|------|--------|---------|
| Claude conversations | `docs/conversations/` | `2024-12-11-onebalance-integration.md` |
| Implementation plans | `docs/plans/` | `cross-chain-wallet-plan.md` |
| Architecture decisions | `docs/decisions/` | `ADR-001-use-onebalance.md` |
| System diagrams | `docs/architecture/` | `multi-chain-architecture.md` |
| Debug guides | `docs/troubleshooting/` | `wallet-connection-issues.md` |

## 🔍 Finding Saved Content

### Search by topic
```bash
grep -r "onebalance" docs/
```

### List recent conversations
```bash
ls -la docs/conversations/ | head -10
```

### View all ADRs
```bash
ls docs/decisions/ADR-*.md
```

## ✅ Best Practices

1. **Save important conversations immediately** - Don't wait
2. **Use descriptive titles** - Make them searchable
3. **Include code snippets** - Add relevant code from discussions
4. **Link related docs** - Cross-reference conversations and plans
5. **Update implementation plans** - Keep them current as you build

## 🚀 Pro Tips

- Use `./docs/scripts/quick-save.sh` for fastest saving
- Always include the date in manual filenames
- Tag documents at the bottom for easy searching
- Copy-paste Claude Code conversations while they're fresh in your mind