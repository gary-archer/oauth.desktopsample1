# authguidance.desktopsample1

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/00a95fa7e6c84be588c042c27a070fc5)](https://www.codacy.com/gh/gary-archer/authguidance.desktopsample1/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=gary-archer/authguidance.desktopsample1&amp;utm_campaign=Badge_Grade)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/authguidance.desktopsample1/badge.svg?targetFile=package.json)](https://snyk.io/test/github/gary-archer/authguidance.desktopsample1?targetFile=package.json)

### Overview

* A desktop sample using OAuth 2.x and Open Id Connect, referenced in my blog at https://authguidance.com
* **The goal of this sample is integrating a Desktop UI + API with an external Authorization Server, with Good Usability**

### Details

* See the [Sample 1 Overview](https://authguidance.com/2018/01/11/desktop-apps-overview/) for details of how a Loopback Interface is used
* See the [Sample 1 Instructions](https://authguidance.com/2018/01/17/desktop-app-how-to-run-the-code-sample/) for infra setup and how to run the code

### Technologies

* Electron with TypeScript is used for the Desktop App, which can be run on Windows, Mac OS or Linux

### Middleware Used

* The [AppAuth-JS Library](https://github.com/openid/AppAuth-JS/blob/master/README.md) is used to implement the Authorization Code Flow (PKCE)
* AWS Cognito is used as a Cloud Authorization Server
* AWS API Gateway is used to host our sample OAuth Secured API
