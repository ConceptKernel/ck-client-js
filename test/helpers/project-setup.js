/**
 * Project Setup Helper
 *
 * Creates temporary isolated projects for testing.
 * Handles .ckproject file creation, port allocation, and cleanup.
 *
 * Version: v1.3.18
 * Date: 2025-12-04
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class ProjectSetup {
  constructor() {
    this.tempProjects = [];
  }

  /**
   * Create a temporary project with isolated port range
   *
   * @param {string} projectName - Project name
   * @param {number} slot - Project slot number (1-based)
   * @returns {Object} Project configuration
   */
  createTempProject(projectName, slot = 1) {
    const basePort = 56000 + ((slot - 1) * 200);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `ck-test-${projectName}-`));

    const projectConfig = {
      name: projectName,
      path: tempDir,
      basePort,
      slot,
      gatewayPort: basePort + 0,
      oidcProviderPort: basePort + 2,
      oidcTokenPort: basePort + 5
    };

    // Create .ckproject file
    const ckprojectContent = `apiVersion: conceptkernel/v1
kind: Project
metadata:
  name: ${projectName}
  id: test-${Date.now()}-${Math.random().toString(36).substring(7)}
spec:
  domain: Test.ConceptKernel
  version: 1.3.18
  ports:
    basePort: ${basePort}
    slot: ${slot}
  features:
    useEdgeRouting: true
  ontology:
    kernel: ConceptKernel.Ontology
    core: ckp://ConceptKernel.Ontology:v1.3.18#storage/conceptkernel-core
    bfo: ckp://ConceptKernel.Ontology:v2024#storage/bfo-core
    rbac: ckp://ConceptKernel.Ontology:v1.3.18#storage/conceptkernel-rbac
    predicates: ckp://ConceptKernel.Ontology:v1.3.18#storage/ck-predicates
  protocol:
    - domain: "Test.ConceptKernel"
      url: "http://localhost:${basePort}/schemas"
  defaultUser:
    username: "test-user"
    passwordHash: "3f78a752f106950f65be7d5bfebf4025fe11addc6c2d7c32d3e3130bc8b66639"
    userId: "user-test-${projectName}"
    email: "test@conceptkernel.local"
    createdAt: "${new Date().toISOString()}"
    roles:
      - "test-user"
    note: "Temporary test user for ${projectName}"
`;

    const ckprojectPath = path.join(tempDir, '.ckproject');
    fs.writeFileSync(ckprojectPath, ckprojectContent);

    // Create .ckports file
    const ckportsContent = {
      basePort: basePort,
      allocations: {
        'System.Gateway': basePort + 0,
        'System.Wss': basePort + 1,
        'System.Oidc.Provider': basePort + 2,
        'System.Oidc.Token': basePort + 5,
        'System.Echo': basePort + 10
      }
    };

    const ckportsPath = path.join(tempDir, '.ckports');
    fs.writeFileSync(ckportsPath, JSON.stringify(ckportsContent, null, 2));

    // Create concepts directory structure
    const conceptsDir = path.join(tempDir, 'concepts');
    fs.mkdirSync(conceptsDir, { recursive: true });

    projectConfig.ckproject = ckprojectPath;
    projectConfig.ckports = ckportsPath;
    projectConfig.conceptsDir = conceptsDir;

    this.tempProjects.push(projectConfig);

    console.log(`✓ Created temp project: ${projectName}`);
    console.log(`  Path: ${tempDir}`);
    console.log(`  Base Port: ${basePort}`);
    console.log(`  Slot: ${slot}`);
    console.log(`  Gateway: http://localhost:${basePort}`);

    return projectConfig;
  }

  /**
   * Create multiple isolated projects for multi-project testing
   *
   * @param {number} count - Number of projects to create
   * @returns {Array} Array of project configurations
   */
  createMultipleProjects(count) {
    const projects = [];

    for (let i = 0; i < count; i++) {
      const projectName = `test-project-${String.fromCharCode(65 + i)}`;
      const slot = i + 1;
      projects.push(this.createTempProject(projectName, slot));
    }

    console.log(`\n✓ Created ${count} isolated test projects`);

    return projects;
  }

  /**
   * Cleanup a specific project
   *
   * @param {Object} project - Project configuration
   */
  cleanupProject(project) {
    if (!project || !project.path) {
      return;
    }

    try {
      // Remove directory recursively
      fs.rmSync(project.path, { recursive: true, force: true });
      console.log(`✓ Cleaned up project: ${project.name} (${project.path})`);

      // Remove from tracked projects
      const index = this.tempProjects.indexOf(project);
      if (index > -1) {
        this.tempProjects.splice(index, 1);
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup project ${project.name}:`, error.message);
    }
  }

  /**
   * Cleanup all temporary projects
   */
  cleanupAll() {
    console.log(`\n🧹 Cleaning up ${this.tempProjects.length} temporary projects...`);

    const projects = [...this.tempProjects];
    projects.forEach(project => this.cleanupProject(project));

    console.log('✓ All temporary projects cleaned up');
  }

  /**
   * Verify project structure is valid
   *
   * @param {Object} project - Project configuration
   * @returns {boolean} True if valid
   */
  verifyProjectStructure(project) {
    const checks = [
      { name: '.ckproject file exists', test: () => fs.existsSync(project.ckproject) },
      { name: '.ckports file exists', test: () => fs.existsSync(project.ckports) },
      { name: 'concepts directory exists', test: () => fs.existsSync(project.conceptsDir) },
      { name: 'project path exists', test: () => fs.existsSync(project.path) }
    ];

    let allValid = true;

    checks.forEach(check => {
      const result = check.test();
      if (!result) {
        console.error(`❌ ${check.name}: FAILED`);
        allValid = false;
      } else {
        console.log(`✓ ${check.name}`);
      }
    });

    return allValid;
  }

  /**
   * Read project configuration from .ckproject file
   *
   * @param {string} projectPath - Path to project directory
   * @returns {Object} Parsed configuration
   */
  readProjectConfig(projectPath) {
    const ckprojectPath = path.join(projectPath, '.ckproject');

    if (!fs.existsSync(ckprojectPath)) {
      throw new Error(`.ckproject not found at ${ckprojectPath}`);
    }

    const content = fs.readFileSync(ckprojectPath, 'utf-8');

    // Simple YAML parser for .ckproject
    // Note: In production, use a proper YAML parser like 'js-yaml'
    const lines = content.split('\n');
    const config = {
      metadata: {},
      spec: {
        ports: {}
      }
    };

    let currentSection = null;

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.startsWith('name:')) {
        config.metadata.name = trimmed.split('name:')[1].trim();
      } else if (trimmed.startsWith('basePort:')) {
        config.spec.ports.basePort = parseInt(trimmed.split('basePort:')[1].trim());
      } else if (trimmed.startsWith('slot:')) {
        config.spec.ports.slot = parseInt(trimmed.split('slot:')[1].trim());
      }
    });

    return config;
  }
}

module.exports = ProjectSetup;
