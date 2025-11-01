#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * File Watcher for Dashboard Query References
 * Automatically regenerates references when dashboard files change
 *
 * Usage: npm run watch:dashboards
 *
 * This is useful during development when you're actively editing dashboards.
 * It watches for changes to the dashboard JSON files and automatically
 * regenerates all reference documents (markdown, CSV, JSON index).
 */

const WATCH_PATHS = [
  path.join(__dirname, '../dash0/apollo-router/apollo-router.json'),
  path.join(__dirname, '../datadog/graphos-template/graphos-template.json'),
];

const REFERENCE_GENERATOR = path.join(__dirname, 'dashboard-query-reference.js');

let isGenerating = false;
let pendingGeneration = false;

/**
 * Regenerate all references
 */
function regenerateReferences() {
  if (isGenerating) {
    // Queue another generation if one is already running
    pendingGeneration = true;
    return;
  }

  isGenerating = true;
  pendingGeneration = false;

  console.log(`\n⏱️  ${new Date().toLocaleTimeString()} - Regenerating references...`);

  const child = spawn('node', [REFERENCE_GENERATOR], {
    cwd: path.dirname(REFERENCE_GENERATOR),
  });

  let output = '';
  let hasError = false;

  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.stderr.on('data', (data) => {
    hasError = true;
    console.error(data.toString());
  });

  child.on('close', (code) => {
    isGenerating = false;

    if (code === 0) {
      // Show only the success line from output
      const lines = output.split('\n').filter((l) => l.includes('✓') || l.includes('✨'));
      lines.forEach((line) => console.log(line));
      console.log(
        `✅ ${new Date().toLocaleTimeString()} - References updated\n`
      );
    } else {
      console.error(`❌ ${new Date().toLocaleTimeString()} - Failed to regenerate references\n`);
    }

    // If there's a pending generation, run it now
    if (pendingGeneration) {
      regenerateReferences();
    }
  });
}

/**
 * Start watching dashboard files
 */
function startWatching() {
  console.log('📺 Dashboard Query Reference Watcher');
  console.log('=====================================\n');
  console.log('Watching for changes to:');
  WATCH_PATHS.forEach((filePath) => {
    console.log(`  📄 ${filePath.replace(process.cwd(), '.')}`);
  });
  console.log('\nPress Ctrl+C to stop watching\n');

  const watchers = WATCH_PATHS.map((filePath) => {
    try {
      const watcher = fs.watch(filePath, (eventType, filename) => {
        if (eventType === 'change') {
          console.log(`📝 File changed: ${path.basename(filename)}`);
          regenerateReferences();
        }
      });

      watcher.on('error', (error) => {
        console.error(`Error watching ${filePath}:`, error.message);
      });

      return watcher;
    } catch (error) {
      console.error(`Failed to watch ${filePath}:`, error.message);
      return null;
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    watchers.forEach((watcher) => {
      if (watcher) watcher.close();
    });
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    watchers.forEach((watcher) => {
      if (watcher) watcher.close();
    });
    process.exit(0);
  });
}

/**
 * Verify that dashboard files exist
 */
function verifyFiles() {
  const missingFiles = WATCH_PATHS.filter((filePath) => !fs.existsSync(filePath));

  if (missingFiles.length > 0) {
    console.error('❌ Error: The following dashboard files were not found:\n');
    missingFiles.forEach((file) => console.error(`   ${file}`));
    console.error(
      '\nMake sure you are in the dashboards directory and the files exist.'
    );
    process.exit(1);
  }
}

// Main
try {
  verifyFiles();
  startWatching();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
