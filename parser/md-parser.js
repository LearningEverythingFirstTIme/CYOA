const fs = require('fs');
const path = require('path');

/**
 * Markdown Story Parser
 * Converts author-friendly markdown to engine-friendly JSON
 */

class StoryParser {
  constructor() {
    this.frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    this.nodeRegex = /^#\s+(\w+)(?:\s*\{([^}]+)\})?\s*\n/gm;
    this.locationRegex = /^\*\*Location:\*\*\s*(.+)$/m;
    this.themeRegex = /^\*\*Theme:\*\*\s*(.+)$/m;
    this.choiceRegex = /^-\s*\[([^\]]+)\s*(?:→|->)\s*(\w+)\]/gm;
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
    
    // Simple YAML-like parsing
    fm.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Try to parse as number or boolean
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
    
    // Extract choices
    const choices = [];
    let choiceMatch;
    const choiceRegex = new RegExp(this.choiceRegex);
    while ((choiceMatch = choiceRegex.exec(content)) !== null) {
      choices.push({
        text: choiceMatch[1].trim(),
        next: choiceMatch[2].trim()
      });
    }
    
    if (choices.length > 0) {
      node.choices = choices;
    }
    
    // Extract content (everything before choices)
    let mainContent = content;
    
    // Remove metadata lines
    mainContent = mainContent.replace(this.locationRegex, '');
    mainContent = mainContent.replace(this.themeRegex, '');
    
    // Remove choice lines (handle both → and ->)
    mainContent = mainContent.replace(/^-\s*\[.+?\s*(?:→|->)\s*\w+\]\s*$/gm, '');
    
    // Clean up and convert markdown to HTML (basic)
    node.content = this.markdownToHtml(mainContent.trim());
    
    return node;
  }

  markdownToHtml(markdown) {
    return markdown
      // Paragraphs
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        // Italics
        p = p.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Bold
        p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        return `<p>${p}</p>`;
      })
      .join('\n');
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
if (require.main === module) {
  const parser = new StoryParser();
  
  const storiesDir = path.join(__dirname, '..', 'stories');
  const outputDir = path.join(__dirname, '..', 'dist', 'stories');
  
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
}

module.exports = StoryParser;
