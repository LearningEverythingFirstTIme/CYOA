const fs = require('fs');
const path = require('path');
const StoryParser = require('../parser/md-parser');

/**
 * Build Script - Compiles stories for production
 */

class Builder {
  constructor() {
    this.parser = new StoryParser();
    this.srcDir = path.join(__dirname, '..');
    this.distDir = path.join(this.srcDir, 'dist');
  }

  async build() {
    console.log('🔨 Building CYOA Platform...\n');
    
    // Clean/create dist directory
    this.cleanDist();
    
    // Build stories
    await this.buildStories();
    
    // Copy static assets
    this.copyAssets();
    
    console.log('\n✅ Build complete!');
    console.log(`   Output: ${this.distDir}`);
  }

  cleanDist() {
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true });
    }
    fs.mkdirSync(this.distDir, { recursive: true });
    fs.mkdirSync(path.join(this.distDir, 'stories'), { recursive: true });
  }

  async buildStories() {
    const storiesDir = path.join(this.srcDir, 'stories');
    const outputDir = path.join(this.distDir, 'stories');
    
    const storyDirs = fs.readdirSync(storiesDir)
      .filter(dir => !dir.startsWith('_') && !dir.startsWith('.'))
      .filter(dir => fs.statSync(path.join(storiesDir, dir)).isDirectory());

    const index = [];
    let totalNodes = 0;
    let totalEndings = 0;

    for (const storyDir of storyDirs) {
      const storyPath = path.join(storiesDir, storyDir, 'story.md');
      
      if (fs.existsSync(storyPath)) {
        process.stdout.write(`📖 ${storyDir}... `);
        
        try {
          const story = this.parser.parse(storyPath);
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
          
          totalNodes += story.stats.totalNodes;
          totalEndings += story.stats.endings;
          
          console.log(`✓ (${story.stats.totalNodes} nodes, ${story.stats.endings} endings)`);
        } catch (err) {
          console.log(`✗ Error: ${err.message}`);
        }
      }
    }

    // Write index
    fs.writeFileSync(
      path.join(outputDir, 'index.json'),
      JSON.stringify({ 
        stories: index,
        meta: {
          builtAt: new Date().toISOString(),
          totalStories: index.length,
          totalNodes,
          totalEndings
        }
      }, null, 2)
    );

    console.log(`\n📊 Summary: ${index.length} stories, ${totalNodes} nodes, ${totalEndings} endings`);
  }

  copyAssets() {
    // Copy engine
    const engineSrc = path.join(this.srcDir, 'src', 'engine', 'engine.js');
    const engineDest = path.join(this.distDir, 'engine.js');
    if (fs.existsSync(engineSrc)) {
      fs.copyFileSync(engineSrc, engineDest);
    }

    // Copy themes
    const themesDir = path.join(this.srcDir, 'src', 'themes');
    const themesDest = path.join(this.distDir, 'themes');
    fs.mkdirSync(themesDest, { recursive: true });
    
    if (fs.existsSync(themesDir)) {
      for (const file of fs.readdirSync(themesDir)) {
        if (file.endsWith('.css')) {
          fs.copyFileSync(
            path.join(themesDir, file),
            path.join(themesDest, file)
          );
        }
      }
    }

    // Create main HTML
    this.createMainHtml();
  }

  createMainHtml() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYOA Platform</title>
  <link rel="stylesheet" href="themes/base.css">
  <link rel="stylesheet" href="themes/blade-runner.css">
</head>
<body>
  <div class="rain-container" id="rain"></div>
  
  <div class="container">
    <header class="header">
      <h1 id="story-title">Loading...</h1>
      <div class="subtitle" id="story-subtitle"></div>
    </header>
    
    <main id="story-container">
      <p>Loading story...</p>
    </main>
  </div>
  
  <div class="progress-bar">
    <div class="progress-fill" id="progress"></div>
  </div>

  <script src="engine.js"></script>
  <script>
    const engine = new CYOAEngine();
    const pathMatch = window.location.pathname.match(/\\/story\\/([^/]+)/);
    const storyId = pathMatch ? pathMatch[1] : 'silence-bureau';
    
    engine.init('story-container', 'stories/' + storyId + '.json')
      .then(() => {
        if (engine.story.meta) {
          document.getElementById('story-title').textContent = 
            engine.story.meta.title || 'Interactive Story';
          document.getElementById('story-subtitle').textContent = 
            engine.story.meta.description || '';
        }
      })
      .catch(err => {
        document.getElementById('story-container').innerHTML = 
          '<div class="story-card error"><h2>Failed to Load Story</h2><p>' + err.message + '</p></div>';
      });
    
    // Rain effect
    function createRain() {
      const container = document.getElementById('rain');
      if (!container) return;
      for (let i = 0; i < 50; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(drop);
      }
    }
    
    const rainStyles = document.createElement('style');
    rainStyles.textContent = 
      '.rain-container{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:hidden}' +
      '.rain-drop{position:absolute;width:1px;height:20px;background:linear-gradient(transparent,rgba(0,240,255,0.3));animation:rainFall linear infinite}' +
      '@keyframes rainFall{0%{transform:translateY(-100vh);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(100vh);opacity:0}}';
    document.head.appendChild(rainStyles);
    createRain();
  </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.distDir, 'index.html'), html);
  }
}

// Run build
if (require.main === module) {
  const builder = new Builder();
  builder.build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

module.exports = Builder;
