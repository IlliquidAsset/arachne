#!/usr/bin/env bash
set -euo pipefail
unset GIT_TERMINAL_PROMPT 2>/dev/null || true

SKILLS_DIR="${SKILLS_DIR:-$HOME/.config/opencode/skills}"
TEMP_DIR="${TMPDIR:-/tmp}/arachne-skill-install"
TIMEOUT=120
INSTALLED=0
SKIPPED=0
FAILED=0

SKILL_NAMES=(
  claude-mem
  trailofbits-security
  planning-with-files
  last30days-skill
  humanizer
  supabase-agent-skills
  claudeception
  beads
  superpowers
  context-engineering-kit
  marketingskills
  napkin
  ai-research-skills
  videocut-skills
  cc-devops-skills
  tapestry-skills
  skillforge
  react-native-skills
  x-article-publisher
  seo-geo-skills
  lenny-skills
  learning-opportunities
  compound-engineering
  google-ai-mode
  homeassistant-skill
  smart-illustrator
  solana-dev-skill
  charlie-cfo
  raptor
)

SKILL_REPOS=(
  thedotmack/claude-mem
  trailofbits/skills
  OthmanAdi/planning-with-files
  mvanhorn/last30days-skill
  blader/humanizer
  supabase/agent-skills
  blader/Claudeception
  steveyegge/beads
  obra/superpowers
  NeoLabHQ/context-engineering-kit
  coreyhaines31/marketingskills
  blader/napkin
  Orchestra-Research/AI-Research-SKILLs
  Ceeon/videocut-skills
  akin-ozer/cc-devops-skills
  michalparkola/tapestry-skills-for-claude-code
  tripleyak/SkillForge
  callstackincubator/agent-skills
  wshuyi/x-article-publisher-skill
  aaron-he-zhu/seo-geo-claude-skills
  RefoundAI/lenny-skills
  DrCatHicks/learning-opportunities
  EveryInc/compound-engineering-plugin
  PleasePrompto/google-ai-mode-skill
  komal-SkyNET/claude-skill-homeassistant
  axtonliu/smart-illustrator
  solana-foundation/solana-dev-skill
  EveryInc/charlie-cfo-skill
  gadievron/raptor
)

mkdir -p "$SKILLS_DIR" "$TEMP_DIR"

echo "Installing community skills to: $SKILLS_DIR"
echo "Temp directory: $TEMP_DIR"
echo "---"

for i in "${!SKILL_NAMES[@]}"; do
  skill_name="${SKILL_NAMES[$i]}"
  repo="${SKILL_REPOS[$i]}"
  skill_dest="$SKILLS_DIR/$skill_name"

  if [ -f "$skill_dest/SKILL.md" ]; then
    echo "[SKIP] $skill_name — already installed"
    ((SKIPPED++))
    continue
  fi

  echo -n "[INSTALL] $skill_name ($repo)... "

  clone_dir="$TEMP_DIR/$skill_name"
  rm -rf "$clone_dir"

  if ! git clone --depth 1 --quiet "https://github.com/$repo.git" "$clone_dir" 2>/dev/null; then
    echo "FAILED (clone error or timeout)"
    ((FAILED++))
    continue
  fi

  skill_md=$(find "$clone_dir" -name "SKILL.md" -print -quit 2>/dev/null || true)

  if [ -z "$skill_md" ]; then
    skill_md=$(find "$clone_dir" -name "*.md" -path "*skill*" -print -quit 2>/dev/null || true)
  fi

  if [ -z "$skill_md" ]; then
    echo "FAILED (no SKILL.md found)"
    ((FAILED++))
    rm -rf "$clone_dir"
    continue
  fi

  if ! head -1 "$skill_md" | grep -q "^---"; then
    echo "FAILED (no YAML frontmatter)"
    ((FAILED++))
    rm -rf "$clone_dir"
    continue
  fi

  mkdir -p "$skill_dest"
  cp "$skill_md" "$skill_dest/SKILL.md"

  echo "OK"
  ((INSTALLED++))
  rm -rf "$clone_dir"
done

rm -rf "$TEMP_DIR"

echo "---"
echo "Results: $INSTALLED installed, $SKIPPED skipped, $FAILED failed"
echo "Total skills in $SKILLS_DIR: $(ls -d "$SKILLS_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')"
