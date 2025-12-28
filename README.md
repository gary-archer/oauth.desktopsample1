# Initial OAuth Desktop App

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/afd1a18c78db40ef9e53c26d4ada748c)](https://app.codacy.com/gh/gary-archer/oauth.desktopsample1?utm_source=github.com&utm_medium=referral&utm_content=gary-archer/oauth.desktopsample1&utm_campaign=Badge_Grade)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.desktopsample1/badge.svg?targetFile=package.json)](https://snyk.io/test/github/gary-archer/oauth.desktopsample1?targetFile=package.json)

## Overview

An initial cross-platform demo desktop app using AppAuth and OpenID Connect.

## Views

The app is a simple UI with some basic navigation between views, to render fictional investment resources.\
Its data is returned from an OAuth-secured API that uses claims-based authorization.\
The app uses user attributes from both the OpenID Connect userinfo endpoint and its API.

![Desktop App Views](./images/views.png)

## Local Development Quick Start

First ensure that Node.js 24+ is installed.\
Then build and run the app with the following command:

```bash
./start.sh
```

The app prompts to run an OpenID Connect code flow and authenticate the user.\
The login runs in the default system browser and the app cannot access the user's credentials:

![Desktop App Login](./images/login.png)

You can sign in using my AWS Cognito test account:

```text
- User: guestuser@example.com
- Password: GuestPassword1
```

The app receives the login response using a loopback redirect URI.\
After login you can test some basic lifecycle operations, though session management is incomplete.

## Further Information

- See blog posts for further details, starting in the [Initial Desktop Sample Overview](https://github.com/gary-archer/oauth.blog/tree/master/public/posts/desktop-apps-overview.mdx).
- See the [Final Desktop Sample](https://github.com/gary-archer/oauth.desktopsample.final) for a more complete desktop app.

## Programming Languages

* The app uses the Electron framework with TypeScript code.

## Infrastructure

* The [AppAuth-JS](https://github.com/openid/AppAuth-JS/blob/master/README.md) library is used to implement the code flow with PKCE.
* [AWS Serverless](https://github.com/gary-archer/oauth.apisample.serverless) or Kubernetes host remote API endpoints that the app calls.
* AWS Cognito is used as the default authorization server for the desktop app and API.
