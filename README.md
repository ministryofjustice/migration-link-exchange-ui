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

## Azure Setup

### Useful links

- [Ministry of Justice | Overview](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview)
- App [justicedigital-centraldigital-migration-link-exchange-ui-preprod](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/quickStartType~/null/sourceType/Microsoft_AAD_IAM/appId/f5ddb82e-8ddd-4ec7-9c96-6b103f806b43)
- App [justicedigital-centraldigital-migration-link-exchange-ui](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/quickStartType~/null/sourceType/Microsoft_AAD_IAM/appId/5995e47b-365d-43cb-a715-28448ad0c3a4)

### Register an application

1. Go to the Azure portal and sign in with your account.
2. Click on the `Microsoft Entra ID` service.
3. Click on `App registrations`.
4. Click on `New registration`.
5. Fill in the form (adjust to the environment):
   - Name: `justicedigital-centraldigital-migration-link-exchange-ui-preprod`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `Web` and 
     - `http://localhost:3000/auth/redirect`
     - `https://migration-link-exchange-dev.hmpps.service.justice.gov.uk/auth/redirect`
     or `TBC` etc.
6. Copy the `Application (client) ID` and `Directory (tenant) ID` values,
  make them available as environment variables `OAUTH_CLIENT_ID`, `OAUTH_TENANT_ID`.
7. Click on `Certificates & secrets` > `New client secret`.
8. Fill in the form:
   - Description: `Preprod`
   - Expires: `24 months`
9. Set a reminder to update the client secret before it expires.
10. Copy the `Value` value, make it available as environment variable `OAUTH_CLIENT_SECRET`.
   - Locally, this means adding it to docker/.env
   - For Cloud Platform, this means creating a secret called `entra`, with a value `OAUTH_CLIENT_SECRET`.
11. In `Branding & properties` populate a description in Internal notes.
12. In `Owners` add at least 2 more people or a shared mailbox.
12. Make a request the Identity Team, that `User.Read` API permissions be added to the app.

The oauth2 flow should now work with the Azure AD/Entra ID application.
You can get an Access Token, Refresh Token and an expiry of the token.

### Auth in this codebase

The implementation of Entra ID in this codebase is based on the tutorial 
[Sign in users and acquire a token for Microsoft Graph in a Node.js & Express web app](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-v2-nodejs-webapp-msal).

Having followed the tutorial, some changes were made to the file names to match the project structure.

In this project, auth is limited to the following files:

- `docker/.env` - where the environment variables are defined.
<!-- TODO -->
- `index.js` - where auth middleware is applied and routes are mounted.
- `app/auth/middleware` - where the auth middleware is defined.
- `app/auth/provider.js` - where the auth provider is defined.
- `app/routes/auth.js` - where the auth routes are defined.
- `app/views/login-screen.html` - where the login screen is defined.
- `app/views/layouts/main--logged-out.html` - where the layout for the logged out state is defined.
- `app/views/layouts/_header--logged-out.html` - where a stripped down header for the logged out state is defined.
- `app/views/layouts/_footer--logged-out.html` - where a stripped down footer for the logged out state is defined.

The auth middleware is applied to all routes except the auth routes.

To turn off auth for an environment, set `OAUTH_SKIP_AUTH` to `true` in the environment variables.

### Creating the auth-session secrets

For each environment on cloud Platform, a secret called auth-session is required.

It should have the following values: 

- OAUTH_CLIENT_SECRET - the value from the Entra dashboard.
- EXPRESS_SESSION_SECRET - a random string created with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Create the secret with:

`kubectl -n migration-link-exchange-dev create secret generic auth-session`

Edit it with:

`kubectl -n migration-link-exchange-dev edit secret auth-session`

```yaml
...
stringData:
  OAUTH_CLIENT_SECRET: your-client-secret
  EXPRESS_SESSION_SECRET: your-express-session-secret
```
