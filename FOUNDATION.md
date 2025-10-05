# CAGE Project Foundation Document

**IMPORTANT NOTE:** This is a legitimate developer tool that enhances Claude Code using its official Claude Code Hooks API. All functionality uses documented, approved interfaces provided by Anthropic for extending Claude Code's capabilities. This project helps developers build better software by providing contextual assistance and quality guidance.

## 1. What We Are Building

### Project Overview

A developer productivity tool for enhancing Claude Code that uses Claude Code's official Hooks API to provide better context when needed, help maintain focus on tasks, and provide corrections when working with evolving codebases or outdated information. The system acts as an intelligent assistance layer between developers and Claude Code, dynamically providing relevant context and guidelines based on the current task. It is designed for developers, particularly senior developers who need reliable AI assistance for complex software engineering tasks.

### Technical Requirements

#### Core Technologies

- **Programming Language(s):** TypeScript/Node.js (both backend and CLI)
- **Framework(s):**
  - **CLI:** Ink (React for CLI) with vite-node for bundling, ink-testing-library for testing
  - **Backend:** NestJS with auto-documenting OpenAPI/Swagger, pluggable architecture
  - **Testing:** Vitest (all layers), ink-testing-library (CLI)
  - **Code Quality:** ESLint + Prettier (all components)
- **Database/Storage:** File-based storage initially (append-only logs for full data capture, similar to Kafka's approach - enables later database migration if needed)
- **External APIs/Services:**
  - Claude Code Hooks API (official developer interface for extending Claude Code)
  - Claude Code SDK (@instantlyeasy/claude-code-sdk-ts - https://github.com/instantlyeasy/claude-code-sdk-ts)
  - LLM APIs (Claude or other providers)
  - Filesystem observation

#### Architecture

- **Architecture Pattern:** Event-driven - hook events are the sole triggers, backend processes events asynchronously
- **Real-Time Communication Pattern:** SSE Notification Bus
  - **SSE = Notification Bus (Lightweight)**: Backend emits tiny notifications (~200 bytes) when data changes, single connection handles all notification types
  - **REST APIs = Data Source (On-Demand)**: CLI fetches only NEW data using `?since=timestamp` parameter when notified
  - **Benefits**: Eliminates polling, reduces bandwidth, provides instant updates, single source of truth
  - **No Polling**: Zero `setInterval` usage anywhere in the system - all real-time updates come from SSE notifications
- **Deployment Target:** Local development machines
- **Scalability Requirements:** Single developer use - no concurrent user handling needed
- **Performance Requirements:** No specific performance metrics required - focus on correctness over speed

#### Development & Operations

- **Development Tools:** Not specified - developer's choice
- **CI/CD Pipeline:** Not required
- **Logging & Analytics:**
  - File-based append-only logs for all hook events
  - Winston-based centralized logging for all system operations (debug, info, warn, error)
  - In-memory log transport accessible via `/api/debug/logs` endpoint
  - Debug Console in interactive CLI displays all logger events in real-time
- **Security Requirements:** Not required for single developer use

#### Key Libraries & Dependencies

**CLI:**

- **ink, ink-spinner, ink-progress-bar**: React-based CLI UI components for interactive terminal interfaces
- **ink-testing-library**: Testing library specifically for Ink components
- **commander.js**: Fallback CLI argument parsing for capabilities beyond Ink
- **chalk**: Terminal string styling and colored output

**Backend (NestJS):**

- **@nestjs/swagger**: Auto-generate OpenAPI 3.0 documentation and Swagger UI
  - **Swagger UI Endpoint**: `http://localhost:3790/api-docs` (interactive documentation with Try-it-out)
  - **OpenAPI JSON Spec**: `http://localhost:3790/api-docs-json` (raw OpenAPI 3.0 specification)
  - **API Metadata**: CAGE API v0.0.1, MIT License, organized by tags (Hooks, Events, Health)
  - **UI Customization**: Monokai syntax highlighting, alpha-sorted tags/operations, persistent authorization
- **@nestjs/event-emitter + eventemitter2**: Event-driven architecture for internal notifications
  - Services emit internal events (`hook.event.added`, `debug.log.added`) via EventEmitter2
  - EventsController listens with `@OnEvent` decorators and broadcasts SSE notifications
  - Enables decoupled notification bus pattern: data layer emits, SSE layer broadcasts
- **Server-Sent Events**: Built-in SSE support in NestJS (no separate package needed)
  - EventsController manages SSE client list and broadcasts lightweight notifications
  - Single `/api/events/stream` endpoint handles ALL notification types
  - Heartbeat every 30 seconds to keep connections alive
- **@instantlyeasy/claude-code-sdk-ts**: Claude Code SDK for LLM integration
- **winston**: Centralized logging framework with in-memory transport for debug console
- **zod**: Runtime type validation and schema definition
- **class-validator/class-transformer**: DTO validation and transformation

**CLI (Ink with React):**

- **zustand**: Lightweight state management for CLI state (no Redux/MobX)
  - **Singleton Services Pattern**: Background services update Zustand, components read from Zustand
  - **StreamService**: Singleton managing ONE SSE connection, updates serverStatus and triggers event fetches
  - **HooksStatusService**: Singleton polling /api/hooks/status every 30s, updates hooksStatus in Zustand
  - **NO Polling in Components**: Components NEVER use setInterval/setTimeout, NEVER make direct API calls for real-time data
  - **Pure Reactive Components**: UI components (StatusBar, etc.) read ONLY from Zustand store, automatically re-render on state changes
- **Fetch API**: Native Node.js fetch for HTTP requests (no Axios)
- **EventSource/SSE client**: For receiving server-sent events (managed by StreamService singleton)

**Shared/Utility:**

- **zod**: Schema validation across all layers
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation for events/logs

### Non-Functional Requirements

- **Availability:**
  - CLI runs on-demand via `cage` command
  - Interactive TUI mode launches with `cage` (no arguments)
  - Backend server starts via `cage start` command
  - No auto-restart on crashes
  - Hook handlers log connection failures when server is unreachable
- **Maintainability:**
  - Monorepo structure using npm workspaces (no Lerna/Nx needed)
  - JSDoc for all code documentation
  - Lightweight README with links to specific docs (CLI, hooks, backend guides)
  - Documentation directory structure: `/docs` with topic-specific guides
  - Feature-specific FEATURES.md files in each package/feature directory
- **Compatibility:**
  - Node.js: Latest LTS versions with `.nvmrc` file for version management
  - OS Support: MUST work on Windows, macOS, and Linux (special attention to Windows path/shell differences)
  - Terminal Support: Modern terminal emulators with full Unicode and color support
- **Compliance:**
  - MIT License (Copyright 2025 Software Engineering & Consulting Pty Ltd)
  - Privacy: All logged data stays local to developer's machine

---

## 2. Why We Are Building It

### Problem Definition

#### Primary Problem

Claude Code lacks real-time quality guidance and contextual awareness, leading to progressively degrading code quality during extended sessions. It doesn't self-check for anti-patterns, lazy shortcuts (like TypeScript `any` or `as unknown as`), or recognize when files are becoming too large and need refactoring. Without intervention, Claude drifts toward quick fixes rather than maintaining architectural integrity.

Additionally, **No Process for Specification Evolution**: There's no systematic process for AI to evolve specifications as the system grows. AI is an emergent black box that needs structured guidance - without a defined process for maintaining living specifications, Claude cannot capture and update design decisions in real-time or recognize when specifications need to evolve alongside the code.

Furthermore, **Unguided Brownfield Specification Creation**: While Claude can extract specifications from existing brownfield projects, it lacks guidance on creating well-crafted, coherent specifications. Without a framework to structure this process, Claude tends to produce specifications that become unwieldy, hard to read, or lose coherence as they grow - defeating the purpose of having a living specification that developers can actually understand and maintain.

#### Secondary Problems

1. **Outdated Knowledge**: Claude uses outdated patterns, deprecated libraries, or old API versions without awareness of current best practices
2. **Lost Project Context**: Lacks understanding of existing project structure, conventions, and patterns already established in the codebase
3. **No Quality Gates**: Doesn't proactively check its own output for code smells, complexity, or maintainability issues
4. **Missing Refactoring Triggers**: Fails to recognize when files exceed reasonable size limits (~300 lines) or when code needs restructuring
5. **Inconsistent Standards**: Applies different coding patterns and styles throughout a session without maintaining consistency
6. **No Self-Correction**: Continues making the same mistakes without learning from corrections within the session

### Pain Points

#### Current State Analysis

Describe how things work today without this solution:

- Developers must constantly oversee Claude Code, frequently pressing ESC to redirect when it deviates
- Manual review required for every file change to catch lazy patterns and anti-patterns
- No visibility into subagent reasoning, creating a "black box" trust issue
- Repetitive corrections needed for the same mistakes within a single session
- Mental exhaustion from constant vigilance rather than collaborative coding

#### Specific Pain Points

1. **Constant Manual Intervention:**
   - Impact: Developer cognitive load and fatigue from hypervigilance
   - Frequency: Multiple times per coding session (every few minutes)
   - Cost: Mental energy drain, reduced productivity, context switching overhead

2. **Trust Degradation:**
   - Impact: Cannot confidently let Claude work autonomously, even for simple tasks
   - Frequency: Every interaction requires verification
   - Cost: Defeats the purpose of AI assistance, creates adversarial rather than collaborative relationship

3. **Opaque Subagent Operations:**
   - Impact: No visibility into subagent decision-making process
   - Frequency: Every time a subagent is launched
   - Cost: Unable to course-correct early, leading to wasted compute and time on wrong approaches

4. **Repeated Pattern Violations:**
   - Impact: Same mistakes (TypeScript any, large files, poor structure) made repeatedly
   - Frequency: Consistently throughout sessions
   - Cost: Time spent re-explaining standards and fixing the same issues

5. **Specification Drift:**
   - Impact: Claude gradually moves away from original requirements without realizing
   - Frequency: Progressively worse over longer sessions
   - Cost: Major refactoring needed after letting it run, sometimes easier to start over

### Stakeholder Impact

- **Senior Developers:** Significant stress and frustration from constant corrections, leading to irritability, elevated stress levels, and health impacts (high blood pressure). Transforms what should be a productivity tool into a source of professional burnout.
- **Business/Organization:** Risk of reputational damage if AI-generated code with bugs or security issues reaches production. Public perception already skeptical of AI replacing developers - any failures amplify negative sentiment and undermine AI adoption initiatives.
- **Development Teams:** Junior and mid-level developers lack architectural context and domain knowledge that senior developers possess. Without guardrails, they cannot effectively leverage AI tools, widening the productivity gap rather than closing it. This solution would democratize AI assistance across skill levels.

### Theoretical Solutions

#### Solution Approach 1: Dual-Phase Guardian System (Selected Approach)

- **Description:** Comprehensive hook orchestration that assists both before and after Claude's actions. Pre-execution hooks provide context and validate intentions, while post-execution hooks analyze output and suggest corrections. The system maintains living specifications that evolve with the project.
- **Pros:**
  - Catches issues at multiple points in the workflow
  - Builds accumulated knowledge base over time
  - Self-referencing system where Claude can query its own past decisions
  - Living specifications stay synchronized with actual code
- **Cons:**
  - Complex orchestration logic required
  - Potential performance overhead from double-checking
  - Initial setup requires defining base specifications
- **Feasibility:** Highly feasible with Claude Code Hooks API and event-driven architecture

#### Solution Approach 2: Static Rules Engine

- **Description:** Pre-defined rules and patterns that hooks apply without dynamic adaptation
- **Pros:**
  - Simple to implement and understand
  - Predictable behavior
  - Low performance overhead
- **Cons:**
  - Cannot adapt to new patterns or project evolution
  - Requires manual rule updates
  - No learning from past interactions
- **Feasibility:** Easy to implement but limited effectiveness

#### Solution Approach 3: Post-Hoc Analysis Only

- **Description:** Let Claude operate freely, then analyze and fix issues in batch after completion
- **Pros:**
  - Non-intrusive to Claude's workflow
  - Can batch process corrections efficiently
- **Cons:**
  - Allows bad code to be written first
  - May require significant rework
  - Doesn't prevent cascading errors
- **Feasibility:** Simple but doesn't address the core trust issue

### Development Methodology: Acceptance Criteria Driven Development (ACDD)

CAGE uses **Acceptance Criteria Driven Development** as its core methodology:

1. **Specification First:** We define acceptance criteria in Given-When-Then format before any implementation
2. **Test Second:** We write tests that directly implement these acceptance criteria
3. **Code Last:** We write the minimum code necessary to make tests pass

This approach ensures:

- Every feature has clear, testable acceptance criteria
- Tests serve as living documentation of system behavior
- Code directly maps to specified requirements
- No unnecessary code is written

For detailed implementation instructions, see PHASE1-IMPLEMENTATION.md.

### Success Criteria

Define what success looks like for this project:

1. **Living Specification Achievement:** Complete specification with concrete examples for every possible combination, wrapped in user stories and journeys that:
   - Connect to the "why" (pain points and reasons for the software)
   - Define the "how" (journeys, stories, and examples of software usage)
   - Generate the "what" (code implementation that realizes each example)
   - All specifications have corresponding acceptance tests that pass
2. **Specification-Code Alignment:** Codebase directly reflects living specifications with runnable acceptance tests validating compliance
3. **Test-Driven Implementation:** 100% of features implemented using ACDD methodology
4. **Reduced Manual Intervention:** 80%+ reduction in ESC key interruptions per coding session
5. **Autonomous Task Completion:** Claude successfully completes assigned tasks without human intervention in 90%+ of cases
6. **Code Quality Metrics:**
   - Zero TypeScript 'any' or 'as unknown as' usage
   - All files under 300 lines
   - 100% linting pass rate
   - No code smells or anti-patterns
   - Minimum 80% test coverage
7. **Developer Trust Restoration:** Developers report high satisfaction and trust levels, willing to let Claude work autonomously

### Constraints & Assumptions

#### Constraints

- **Budget:** Solo developer project, no external funding
- **Timeline:** Few months to MVP - must prioritize core features for incremental delivery
- **Resources:** Single developer implementation
- **Technical:**
  - Must work with existing Claude Code Hooks API (PreToolUse, PostToolUse, UserPromptSubmit, etc.)
  - Requires Claude Code CLI to be installed for SDK functionality
  - Node.js 18+ requirement from Claude SDK

#### Assumptions

- **Claude Code Hooks API Stability:** Hook events (PreToolUse, PostToolUse, Stop, etc.) will remain stable and available
- **Claude SDK Capabilities:**
  - SDK will maintain streaming support for real-time feedback
  - Authentication through CLI will remain the primary method
  - Tool permission management will continue to work as documented
- **Developer Environment:**
  - Developers have Claude Code CLI installed and authenticated
  - Developers are comfortable with command-line tools
  - Target users understand basic hook concepts
- **System Behavior:**
  - Hooks can reliably enhance and guide Claude's behavior
  - File-based logging will be sufficient for initial knowledge base
  - Event-driven architecture can handle hook event frequency without overwhelming the system

---

## Notes Section

### MVP Priority Features

Given the timeline constraint, the following features should be implemented in order:

1. **Phase 1 - Core Hook Infrastructure:**
   - CLI tool for setting up hooks (`cage` command)
   - Basic NestJS backend to receive hook data
   - File-based event logging system

2. **Phase 2 - Interactive CLI & Event Inspector:**
   - Full-screen interactive TUI when running `cage` without arguments
   - Arrow key navigation with Enter to select and Escape to go back/exit
   - Comprehensive event viewer with full result data inspection
   - Real-time event streaming in interactive mode
   - Debug mode support with --debug flag
   - Maintains all existing CLI commands (cage init, cage hooks, etc.)

3. **Phase 3 - Quality Guidance & Rules Engine:**
   - PreToolUse hooks for TypeScript validation (no 'any', proper typing)
   - PostToolUse hooks for file size checks and refactoring suggestions
   - Basic rule engine for common anti-patterns
   - Integration with interactive CLI for rule management

4. **Phase 4 - Knowledge Base & Advanced Features:**
   - Living specification storage and retrieval
   - Context provision for Claude based on current task
   - Self-referencing system for Claude to query past decisions
   - Advanced interactive CLI features (specification management, trust metrics dashboard)

### Key Hook Integration Points

Based on Claude Code documentation, all available hooks:

- **PreToolUse:** Validate and provide context before tool execution (can block)
- **PostToolUse:** Analyze results and trigger corrections after tool execution
- **UserPromptSubmit:** Enhance prompts with project context (stdout adds to context)
- **Notification:** Capture and log Claude's notifications to users
- **Stop:** Final quality checks when Claude finishes responding
- **SubagentStop:** Capture subagent results and execution summaries
- **SessionStart:** Provide initial context at session start (stdout adds to context)
- **SessionEnd:** Cleanup and session summary logging
- **PreCompact:** Handle conversation compaction events
- **Status:** Provide custom status line updates with session metadata

### Project Name: CAGE

A cage for writing the right thing - a guided environment that ensures AI produces code that matches living specifications. The cage defines boundaries not to restrict, but to guide Claude toward writing exactly what should be written according to evolving, executable specifications.

**Project Website**: [https://cage.tools](https://cage.tools)
**GitHub Repository**: [https://github.com/sengac/cage](https://github.com/sengac/cage)
