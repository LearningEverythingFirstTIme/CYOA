const fs = require('fs');
const path = require('path');

/**
 * Story Parser - Converts Markdown to JSON
 */

class StoryParser {
  constructor() {
    this.frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    this.nodeRegex = /^#\s+(\w+)(?:\s*\{([^}]+)\})?\s*\n/gm;
    this.locationRegex = /^\*\*Location:\*\*\s*(.+)$/m;
    this.themeRegex = /^\*\*Theme:\*\*\s*(.+)$/m;
    this.branchRegex = /^\*\*Branch:\*\*\s*(.+)$/m;
    this.tenseRegex = /^\*\*Tense:\*\*\s*(.+)$/m;
    this.convergenceRegex = /^\*\*Convergence:\*\*\s*(.+)$/m;
  }

  parse(storyPath) {
    const content = fs.readFileSync(storyPath, 'utf-8');
    
    // Extract frontmatter
    const frontmatter = this.parseFrontmatter(content);
    const body = content.replace(this.frontmatterRegex, '');
    
    // Parse nodes
    const nodes = this.parseNodes(body);
    
    return {
      meta: frontmatter,
      nodes,
      stats: this.calculateStats(nodes)
    };
  }

  parseFrontmatter(content) {
    const match = content.match(this.frontmatterRegex);
    if (!match) return {};
    
    const fm = match[1];
    const result = {};
    
    fm.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Parse types
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value !== '') value = Number(value);
        
        result[key] = value;
      }
    });
    
    return result;
  }

  parseNodes(body) {
    const nodes = {};
    
    // Split by node headers
    const nodeMatches = [...body.matchAll(this.nodeRegex)];
    
    for (let i = 0; i < nodeMatches.length; i++) {
      const match = nodeMatches[i];
      const nodeId = match[1];
      const nodeFlags = match[2] || '';
      const startPos = match.index + match[0].length;
      const endPos = i < nodeMatches.length - 1 ? nodeMatches[i + 1].index : body.length;
      const nodeContent = body.slice(startPos, endPos).trim();
      
      nodes[nodeId] = this.parseNode(nodeId, nodeContent, nodeFlags);
    }
    
    return nodes;
  }

  parseNode(id, content, flags) {
    const node = { id };
    
    // Check for ending flag
    if (flags.includes('ending')) {
      node.ending = true;
    }
    
    // Extract location
    const locationMatch = content.match(this.locationRegex);
    if (locationMatch) {
      node.location = locationMatch[1].trim();
    }
    
    // Extract theme (for endings)
    const themeMatch = content.match(this.themeRegex);
    if (themeMatch) {
      node.theme = themeMatch[1].trim();
    }
    
    // Extract branch
    const branchMatch = content.match(this.branchRegex);
    if (branchMatch) {
      node.branch = branchMatch[1].trim();
    }
    
    // Extract tense flag
    const tenseMatch = content.match(this.tenseRegex);
    if (tenseMatch) {
      node.tense = tenseMatch[1].trim().toLowerCase() === 'true';
    }
    
    // Extract convergence flag
    const convergenceMatch = content.match(this.convergenceRegex);
    if (convergenceMatch) {
      node.convergence = convergenceMatch[1].trim().toLowerCase() === 'true';
    }
    
    // Extract choices with flavor text
    const choices = [];
    const choiceRegex = /^-\s*\[([^\]]+)\s*(?:→|->)\s*(\w+)\](?:\s*\{([^}]+)\})?/gm;
    let choiceMatch;
    let choiceIndex = 0;
    
    while ((choiceMatch = choiceRegex.exec(content)) !== null) {
      const flavorText = choiceMatch[3] || '';
      const weight = this.extractWeight(choiceMatch[1]);
      
      choices.push({
        id: `choice_${choiceIndex}`,
        text: choiceMatch[1].trim(),
        next: choiceMatch[2].trim(),
        flavor: flavorText,
        weight
      });
      choiceIndex++;
    }
    
    if (choices.length > 0) {
      node.choices = choices;
    }
    
    // Extract content (everything before choices)
    let mainContent = content;
    
    // Remove metadata lines
    mainContent = mainContent.replace(this.locationRegex, '');
    mainContent = mainContent.replace(this.themeRegex, '');
    mainContent = mainContent.replace(this.branchRegex, '');
    mainContent = mainContent.replace(this.tenseRegex, '');
    mainContent = mainContent.replace(this.convergenceRegex, '');
    
    // Remove choice lines
    mainContent = mainContent.replace(/^-\s*\[.+?\s*(?:→|->)\s*\w+\](?:\s*\{[^}]+\})?\s*$/gm, '');
    
    node.content = mainContent.trim();
    
    return node;
  }

  extractWeight(choiceText) {
    const lower = choiceText.toLowerCase();
    if (lower.includes('kill') || lower.includes('destroy') || lower.includes('betray')) {
      return 'heavy';
    }
    if (lower.includes('help') || lower.includes('save') || lower.includes('trust')) {
      return 'heavy';
    }
    if (lower.includes('ask') || lower.includes('look') || lower.includes('check')) {
      return 'light';
    }
    return 'medium';
  }

  calculateStats(nodes) {
    const stats = {
      totalNodes: Object.keys(nodes).length,
      decisionPoints: 0,
      endings: 0,
      deadEnds: 0
    };
    
    for (const node of Object.values(nodes)) {
      if (node.choices && node.choices.length > 0) {
        stats.decisionPoints++;
      }
      if (node.ending) {
        stats.endings++;
      }
      if (!node.choices && !node.ending) {
        stats.deadEnds++;
      }
    }
    
    return stats;
  }
}

// CLI usage
const parser = new StoryParser();

const storiesDir = path.join(__dirname, '..', 'stories');
const outputDir = path.join(__dirname, '..', 'public', 'data');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Process all stories
const stories = fs.readdirSync(storiesDir)
  .filter(dir => !dir.startsWith('_') && !dir.startsWith('.'))
  .filter(dir => fs.statSync(path.join(storiesDir, dir)).isDirectory());

const index = [];

for (const storyDir of stories) {
  const storyPath = path.join(storiesDir, storyDir, 'story.md');
  
  if (fs.existsSync(storyPath)) {
    console.log(`Parsing: ${storyDir}`);
    
    try {
      const story = parser.parse(storyPath);
      const outputPath = path.join(outputDir, `${storyDir}.json`);
      
      fs.writeFileSync(outputPath, JSON.stringify(story, null, 2));
      
      index.push({
        id: storyDir,
        title: story.meta.title || storyDir,
        author: story.meta.author,
        description: story.meta.description,
        theme: story.meta.theme || 'default',
        stats: story.stats
      });
      
      console.log(`  ✓ ${story.stats.totalNodes} nodes, ${story.stats.endings} endings`);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }
}

// Write index
fs.writeFileSync(
  path.join(outputDir, 'index.json'),
  JSON.stringify({ stories: index }, null, 2)
);

console.log(`\n✓ Built ${index.length} stories`);
