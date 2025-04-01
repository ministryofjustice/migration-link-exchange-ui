# migration-link-exchange-ui

`migration-link-exchange-ui` is a NodeJS + Express + Nunjucks service for converting user provided
Google Drive links into their Microsoft OneDrive/SharePoint equivalents after the Data Migration Project
performs it's migration job.

## Running the application
### Pre-requisites
In order to run this project, the following software is required:

- **Docker** - This service and all of its dependencies are run in Docker containers.
- **make** - Make is used for building and developing locally
- **Node.js** - A JavaScript runtime environment and library for running web based applications

### Production

1. To start a production version of the application, run `make up`
  - The service will start on http://localhost:3000
  - To check the health status, go to http://localhost:3000/health
2. To update all containers, run `make down update up`

### Development
1. To start a development version of the application, run `make dev-up`
  - The service will start on http://localhost:3000
  - A debugger session will be accessible on http://localhost:9229
  - To check the health status, go to http://localhost:3000/health
2. The application will live-reload as you make changes to the code.

> **Note:** Each time you change or update your node dependencies, run `make install-node-modules` to have these reflected in your Docker container.

You can connect to the remote debugger session on http://localhost:9229 like so
[![API docs](https://github.com/ministryofjustice/hmpps-strengths-based-needs-assessments-ui/blob/main/.readme/debugger.png?raw=true)]()

### Testing
The test suite can be run using `make test`

### Linting
Linting can be run using `make lint` and `make lint-fix`
