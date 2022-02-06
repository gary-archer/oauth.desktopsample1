# Initial OAuth Desktop App

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/00a95fa7e6c84be588c042c27a070fc5)](https://www.codacy.com/gh/gary-archer/oauth.desktopsample1/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=gary-archer/oauth.desktopsample1&amp;utm_campaign=Badge_Grade)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.desktopsample1/badge.svg?targetFile=package.json)](https://snyk.io/test/github/gary-archer/oauth.desktopsample1?targetFile=package.json)

### Overview

* The initial OpenID Connect desktop code sample, referenced in my blog at https://authguidance.com
* **The goal is to implement OpenID Connect in a desktop app with good usability and reliability**

### Details

* See the [Sample 1 Overview](https://authguidance.com/2018/01/11/desktop-apps-overview/) for details of how a Loopback Interface is used
* See the [Sample 1 Instructions](https://authguidance.com/2018/01/17/desktop-app-how-to-run-the-code-sample/) for infra setup and how to run the code

### Technologies

* Electron with TypeScript is used for the Desktop App, which can be run on Windows, Mac OS or Linux

### Middleware Used

* The [AppAuth-JS Library](https://github.com/openid/AppAuth-JS/blob/master/README.md) is used to implement the Authorization Code Flow (PKCE)
* AWS API Gateway is used to host our sample OAuth Secured API
* AWS Cognito is used as the default Authorization Server for the UI and API
