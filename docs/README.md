# Expendi Documentation

This directory contains technical documentation, conversation records, and implementation plans for the Expendi project.

## Folder Structure

### 📁 conversations/
Store important Claude Code conversations and technical discussions.
- **Format**: `YYYY-MM-DD-topic-name.md`
- **Purpose**: Record technical decisions, implementation plans, and problem-solving sessions

### 📁 plans/
Implementation and feature plans.
- **Format**: `feature-name-plan.md`
- **Purpose**: Detailed technical specifications and roadmaps

### 📁 architecture/
System architecture documentation.
- **Format**: `component-architecture.md`
- **Purpose**: High-level system design, data flow diagrams, integration patterns

### 📁 decisions/
Architecture Decision Records (ADRs).
- **Format**: `ADR-001-decision-title.md`
- **Purpose**: Record significant technical decisions with context and rationale

### 📁 troubleshooting/
Common issues and solutions.
- **Format**: `issue-category.md`
- **Purpose**: Debug guides, common errors, and resolution steps

## Quick Save Templates

Use these commands to quickly save conversations:

```bash
# Save a conversation
./docs/scripts/save-conversation.sh "OneBalance Integration Discussion"

# Save an implementation plan
./docs/scripts/save-plan.sh "Cross-Chain Budget Wallet"

# Create an ADR
./docs/scripts/create-adr.sh "Use OneBalance for Multi-Chain Asset Management"
```

## Best Practices

1. **Date everything** - Use ISO dates (YYYY-MM-DD) for chronological ordering
2. **Use descriptive names** - Make filenames searchable and meaningful
3. **Include context** - Add relevant code snippets and decision rationale
4. **Link related docs** - Cross-reference related conversations and plans
5. **Update regularly** - Keep documentation current with implementation changes