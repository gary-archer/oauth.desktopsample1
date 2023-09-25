# Initial OAuth Desktop App

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/afd1a18c78db40ef9e53c26d4ada748c)](https://app.codacy.com/gh/gary-archer/oauth.desktopsample1?utm_source=github.com&utm_medium=referral&utm_content=gary-archer/oauth.desktopsample1&utm_campaign=Badge_Grade)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.desktopsample1/badge.svg?targetFile=package.json)](https://snyk.io/test/github/gary-archer/oauth.desktopsample1?targetFile=package.json)

## Overview

* The initial OpenID Connect desktop code sample, referenced in my blog at https://authguidance.com
* **The goal is to implement OpenID Connect in a desktop app with good usability and reliability**

## Views

The desktop app is a simple UI with some basic navigation between views, to render fictional resources.\
The data is returned from an API that authorizes access to resources using domain specific claims.

![Desktop App Views](./doc/views.png)

## Local Development Quick Start

Build and run the app via this command, which will trigger the OpenID Connect desktop flow:

```bash
./start.sh
```

A login is triggered in the system browser, so that the app cannot access the user's credentials.\
A lookback redirect URI, such as `http://localhost:8001`, runs on the local computer, to receive the login response. 

![Desktop App Login](./doc/login.png)

You can login to the desktop app using my AWS Cognito test account.\
You can then test logins, API calls and token renewal:

```text
- User: guestuser@mycompany.com
- Password: GuestPassword1
```

## Further Information

- Further architecture details are described starting in the [Initial Desktop Sample Overview](https://authguidance.com/2018/01/11/desktop-apps-overview/).
- See the [Final Desktop Sample](https://github.com/gary-archer/oauth.desktopsample.final) for a more complete code sample.

## Programming Languages

* Electron and TypeScript are to implement the Desktop App

## Infrastructure

* The [AppAuth-JS Library](https://github.com/openid/AppAuth-JS/blob/master/README.md) is used to implement the Authorization Code Flow (PKCE)
* AWS API Gateway is used to host our sample OAuth Secured API
* AWS Cognito is used as the default Authorization Server for the UI and API
