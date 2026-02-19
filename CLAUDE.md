# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FormaconIA** is an intelligent rental housing marketplace application for Spain, designed to solve pain points in the housing rental market. The project includes features like intelligent search, anti-fraud verification, neighborhood information, and AI-powered recommendations.

**Current Status**: Early-stage brainstorming and specification phase. The project uses a structured specification workflow to define requirements before implementation.

## Project Structure

The project uses a specification-driven development approach with the following directories:

- **`.specify/`** - Specification templates and workflows for feature planning
- **`.claude/`** - Claude Code commands and local settings
- **`.codex/`** - Codex prompts for specification tools
- **`.serena/`** - Serena memory and project configuration
- **Root files**:
  - `README.md` - Brainstorming and product vision
  - `index.html` - Basic landing page (early stage)

## Development Workflow

This project uses **SpecKit** (specification toolkit) to structure development:

1. **`/speckit.specify`** - Create or update feature specifications from requirements
   - Input: Feature description or product requirement
   - Output: Detailed spec including user scenarios, requirements, acceptance criteria, constitution compliance check
   - When to use: Starting a new feature or major revision

2. **`/speckit.plan`** - Generate implementation plans with design artifacts
   - Input: Completed spec.md
   - Output: Technical design decisions, architecture patterns, implementation approach, risk analysis
   - When to use: After spec approval, before breaking work into tasks

3. **`/speckit.tasks`** - Create actionable, dependency-ordered tasks
   - Input: Completed spec.md and plan.md
   - Output: User stories with clear acceptance criteria, organized by dependencies
   - When to use: After planning is complete and technical approach is approved

4. **`/speckit.implement`** - Execute the implementation plan
   - Input: Generated tasks.md with clear dependencies
   - Output: Implementation of all tasks in dependency order
   - When to use: When ready to begin actual coding

5. **`/speckit.analyze`** - Perform quality and consistency analysis
   - Input: Any combination of spec.md, plan.md, tasks.md
   - Output: Cross-artifact consistency report, gap analysis, compliance verification
   - When to use: After each phase to validate alignment before proceeding

**Workflow Diagram**: Specification → Planning → Task Generation → Implementation → Analysis (feedback loop)

## Constitution & Principles

All development MUST align with FormaconIA's Constitution (`.specify/memory/constitution.md`). The constitution defines 5 core principles:

1. **Intelligence-First**: Every feature must leverage AI/ML to create meaningful user value
2. **Trust & Security First**: User trust is non-negotiable - verify, validate, and provide transparency
3. **User-Centric Problem Solving**: Features must address documented pain points from user research
4. **Marketplace Ecosystem**: Design must account for multiple stakeholders (seekers, owners, monetization partners)
5. **MVP + WOW Philosophy**: Deliver MVP reliably first, then add differentiating WOW features

**Before implementing any feature, verify it passes these compliance checks**:
- ✅ Solves a documented pain point (Principle III)
- ✅ Incorporates AI/ML where differentiating (Principle I)
- ✅ Includes trust/security mechanisms (Principle II)
- ✅ Accounts for multi-stakeholder ecosystem (Principle IV)
- ✅ Is properly prioritized in MVP vs. WOW phases (Principle V)

See `.specify/memory/constitution.md` for complete governance details including amendment procedures and versioning.

## Current Phase

The project is in the **planning and specification** phase:

- Core MVP requirements are defined in README.md
- Constitution principles defined and ratified (v1.0.0)
- Use `/speckit.specify` to formalize features into detailed specifications
- Use `/speckit.plan` to design the technical approach while deciding tech stack
- Use `/speckit.tasks` to break down work into implementation tasks

## Architecture Overview

FormaconIA is designed as a **multi-service marketplace** architecture:

### Frontend Tier
- **Web Application** (primary interface)
  - Search and browsing
  - User authentication
  - Favorites and alerts
  - Chat interface
  - Integrated map
- **Mobile App** (post-MVP)
  - Notifications
  - Quick chat access
  - Search

### Backend Services (Microservices)
Each service handles a distinct domain, enabling independent scaling:

- **Search Service**: Natural language parsing, faceted search, recommendation ranking, result ranking
- **Property Service**: Listings management, enriched property data, neighborhood scores, pricing history
- **User Service**: Profile management, reputation scoring, search history, preferences
- **Verification Service**: Owner/property verification, document validation, fraud detection scoring
- **Messaging Service**: Real-time chat, notification delivery, message history
- **Data Enrichment Service**: Aggregates neighborhood info, transport data, public records, crime statistics, school data

### Data Layer
- **Property Catalog**: Listings with enriched neighborhood and pricing data
- **User Profiles**: Reputation, preferences, search history, favorites
- **Communication Store**: Messages, inquiry history, interaction logs
- **Verification Records**: Document verification status, owner reputation, fraud scores
- **Public Data Cache**: Neighborhood info, transport APIs, legal data

### Tech Stack (To Be Decided)
The following decisions should be made during the planning phase for MVP features:

| Layer | Decision | Rationale |
|-------|----------|-----------|
| Frontend | ? | Choose based on real-time requirements (chat, notifications) and MVP timeline |
| Backend API | ? | Choose based on AI/ML integration needs and team expertise |
| Search Engine | ? | Required for natural language search - evaluate Elasticsearch, Milvus, or cloud solutions |
| Database | ? | Choose based on relational vs. document needs and scalability requirements |
| Message Queue | ? | Optional for MVP, needed if asynchronous processing is required |
| ML/AI Platform | ? | For fraud detection, price prediction, recommendation engine |

## Key Information

**MVP Features** (from README.md):
- User registration and login
- Search with filters
- Favorites/saved listings
- Basic alerts
- Chat with property owners
- Interactive map

**Differentiators**:
- AI-powered search by natural language
- Price prediction
- Legal contract assistant
- Fraud detection
- Neighborhood information and reviews
- Property owner reputation system

**Development Approach**: Specification-driven using SpecKit. No architectural decisions are locked in until features require them.

## Git Conventions

### Branching Strategy
- **`main`** - Stable, production-ready code. All PRs should target main.
- **Feature branches** - Create for new features: `feature/feature-name`
- **Bugfix branches** - Create for bug fixes: `bugfix/bug-description`
- **Spec branches** - Create for specification/planning work: `spec/feature-name`

### Commit Messages
Commit messages should be clear and descriptive:
- Use present tense: "Add search feature" not "Added search feature"
- Reference the task/feature: "Add search feature (Task #5)"
- Include co-author when pair programming: `Co-Authored-By: Name <email>`
- Examples:
  - `Add user authentication specification`
  - `Implement search endpoint with NLP integration (Task #12)`
  - `Fix property listing serialization bug`

### Pull Requests
- Create PRs early, even for work in progress - mark as `[WIP]` in title
- Link to related tasks or issues
- Ensure all tasks in the PR have been completed and tested
- Get at least one review before merging
- Delete branch after merging

## Common Development Tasks

### Starting a New Feature

1. Understand the problem and pain point (refer to README.md section 1)
2. Create a spec: Use `/speckit.specify` with the feature description
3. Review and refine the spec - ensure it addresses documented pain points
4. Create a plan: Use `/speckit.plan` based on the approved spec
5. Verify constitution compliance: Use `/speckit.analyze` to check alignment
6. Generate tasks: Use `/speckit.tasks` from plan and spec
7. Create a GitHub issue or PR for tracking
8. Begin implementation: Use `/speckit.implement` to execute tasks

### Implementing a Feature

1. Fetch the latest `main` branch
2. Create a feature branch from `main`
3. Pull up the tasks.md for your feature
4. Work through tasks in dependency order (each task has clear acceptance criteria)
5. Commit frequently with clear messages referencing task IDs
6. Push branch and create PR when ready for review
7. Address review feedback and merge

### Adding a New Technology/Service

1. Document the decision in the plan.md for the related feature
2. Update this CLAUDE.md if it affects development workflow
3. Add build/test commands to the "Build & Test" section below
4. Document any new environment setup requirements
5. Update `.serena/project.yml` if new language support is needed

### Constitution Amendment

1. Identify the principle(s) that need changing
2. Document justification and market context
3. Create spec for the amendment
4. Get consensus from the core team
5. Update `.specify/memory/constitution.md` with version bump
6. Sync dependent artifacts (spec/plan/task templates)

## Next Steps for New Contributors

1. Read `README.md` for the full product vision
2. Read `.specify/memory/constitution.md` for project principles and governance
3. Use `/speckit.specify` to formally define the next feature
4. Use `/speckit.plan` to create an implementation strategy and tech stack decisions
5. Use `/speckit.analyze` to verify alignment with constitution
6. Use `/speckit.tasks` to generate implementation tasks
7. Follow task dependencies when implementing features

## Build & Test (To Be Documented)

Once the tech stack is decided and MVP implementation begins, add commands here:

- **Setup**: How to install dependencies and prepare the development environment
- **Build**: Commands to build the frontend and backend services
- **Test**: How to run unit tests, integration tests, and end-to-end tests
- **Run Local**: How to start the development environment locally
- **Deploy**: How to deploy to staging and production
- **Lint**: Code formatting and linting rules

These will be formalized during the planning phase for the first MVP feature.

## Helpful Tools & References

- **SpecKit prompts**: `.codex/prompts/` - Contains AI prompts for each SpecKit command
- **Specification templates**: `.specify/templates/` - Templates for spec, plan, tasks, and checklists
- **PowerShell automation**: `.specify/scripts/powershell/` - Scripts for feature creation and setup
- **Serena project config**: `.serena/project.yml` - Project configuration and language server settings
- **MCP configuration**: `.mcp.json` - Model Context Protocol configuration for Serena integration
- **Constitution**: `.specify/memory/constitution.md` - Governance, principles, and amendment procedures

## Notes

- **Specification-Driven Development**: This project prioritizes clear specifications before implementation. Each feature goes through SpecKit workflow before any code is written.
- **Constitution-First Decisions**: The constitution (v1.0.0) defines non-negotiable principles for all features. Refer to it when making design choices.
- **Cross-Session Memory**: The `.serena/` directory provides project context across conversations. Memories are stored in `.serena/memories/` and automatically loaded.
- **Flexible Stack**: Tech stack decisions are deferred until planning phase, allowing informed choices based on each feature's requirements.
- **Marketplace Focus**: FormaconIA is designed for multiple stakeholders (renters, property owners, agencies, institutions). Features must account for this ecosystem.