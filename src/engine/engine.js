/**
 * CYOA Engine - Story-Agnostic Interactive Fiction Engine
 * Handles routing, rendering, and state management
 */

class CYOAEngine {
  constructor() {
    this.story = null;
    this.currentNodeId = 'start';
    this.history = [];
    this.container = null;
    this.progressBar = null;
    
    // Bind methods
    this.handleChoice = this.handleChoice.bind(this);
    this.restart = this.restart.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    
    // Initialize
    window.addEventListener('popstate', this.handlePopState);
  }

  async init(containerId, storyUrl) {
    this.container = document.getElementById(containerId);
    this.progressBar = document.getElementById('progress');
    
    if (!this.container) {
      throw new Error(`Container #${containerId} not found`);
    }
    
    // Load story
    try {
      const response = await fetch(storyUrl);
      if (!response.ok) throw new Error('Failed to load story');
      this.story = await response.json();
    } catch (err) {
      this.renderError(`Failed to load story: ${err.message}`);
      return;
    }
    
    // Apply theme
    this.applyTheme(this.story.meta.theme);
    
    // Check for deep link
    const pathMatch = window.location.pathname.match(/\/story\/[^/]+\/(.+)/);
    if (pathMatch && this.story.nodes[pathMatch[1]]) {
      this.currentNodeId = pathMatch[1];
    }
    
    // Render initial node
    this.renderNode(this.currentNodeId);
    
    // Update page title
    document.title = this.story.meta.title || 'Interactive Story';
  }

  applyTheme(themeName) {
    // Remove existing theme classes
    document.body.className = '';
    
    // Apply base theme
    document.body.classList.add('theme-base');
    
    // Apply specific theme if available
    if (themeName && themeName !== 'default') {
      document.body.classList.add(`theme-${themeName}`);
    }
    
    // Apply custom styles from story meta if present
    if (this.story.meta.customCSS) {
      const style = document.createElement('style');
      style.textContent = this.story.meta.customCSS;
      document.head.appendChild(style);
    }
  }

  renderNode(nodeId) {
    const node = this.story.nodes[nodeId];
    
    if (!node) {
      this.renderError(`Node "${nodeId}" not found`);
      return;
    }
    
    this.currentNodeId = nodeId;
    
    if (node.ending) {
      this.renderEnding(node);
    } else {
      this.renderStoryNode(node);
    }
    
    this.updateProgress();
    this.updateURL(nodeId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderStoryNode(node) {
    const choicesHtml = node.choices ? node.choices.map((choice, index) => `
      <button class="choice-btn" data-next="${choice.next}">
        <span class="choice-label">${String.fromCharCode(65 + index)}</span>
        ${this.escapeHtml(choice.text)}
      </button>
    `).join('') : '';

    this.container.innerHTML = `
      <article class="story-card">
        <div class="location-tag">${this.escapeHtml(node.location || '')}</div>
        <div class="story-content">${node.content}</div>
        ${choicesHtml ? `<div class="choices-container">${choicesHtml}</div>` : ''}
      </article>
    `;

    // Attach event listeners
    this.container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleChoice(btn.dataset.next));
    });
  }

  renderEnding(node) {
    this.container.innerHTML = `
      <article class="story-card ending-screen">
        <div class="location-tag">${this.escapeHtml(node.location || '')}</div>
        <div class="story-content">${node.content}</div>
        ${node.theme ? `<div class="ending-theme">"${this.escapeHtml(node.theme)}"</div>` : ''}
        <button class="restart-btn">Begin Again</button>
      </article>
    `;

    this.container.querySelector('.restart-btn').addEventListener('click', this.restart);
    
    if (this.progressBar) {
      this.progressBar.style.width = '100%';
    }
  }

  renderError(message) {
    this.container.innerHTML = `
      <article class="story-card error">
        <h2>Error</h2>
        <p>${this.escapeHtml(message)}</p>
        <button class="restart-btn" onclick="location.reload()">Reload</button>
      </article>
    `;
  }

  handleChoice(nextNodeId) {
    this.history.push(this.currentNodeId);
    this.renderNode(nextNodeId);
  }

  restart() {
    this.history = [];
    this.renderNode('start');
  }

  handlePopState(e) {
    if (this.history.length > 0) {
      const prevNode = this.history.pop();
      this.renderNode(prevNode);
    }
  }

  updateProgress() {
    if (!this.progressBar) return;
    
    // Estimate progress based on history depth vs estimated max depth
    const maxDepth = 10; // Approximate
    const progress = Math.min((this.history.length / maxDepth) * 100, 95);
    this.progressBar.style.width = progress + '%';
  }

  updateURL(nodeId) {
    const storyId = this.story.meta.id || 'story';
    const newPath = `/story/${storyId}/${nodeId}`;
    
    if (window.location.pathname !== newPath) {
      window.history.pushState({ nodeId }, '', newPath);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CYOAEngine;
}
